"use client";

import { useState, type FormEvent } from "react";
import { speak } from "@/lib/speech";
import { normalizeForCompare, normalizePinyin } from "@/lib/pronunciation";
import { SPEECH_LANG, DEFAULT_LANGUAGE, type Language } from "@/lib/constants";
import PronunciationCheck from "@/components/PronunciationCheck";
import EditableMeaning from "@/components/EditableMeaning";

type WordPair = { word: string; meaning: string; ipa?: string };
type Direction = "en-vi" | "vi-en";
type Mode = "en-vi" | "vi-en" | "mixed";
type Card = WordPair & { direction: Direction };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Word-side answers must match closely; Vietnamese meanings accept a looser containment
// match since the same meaning is often phrased several valid ways (e.g. "táo" vs "quả táo").
// For Chinese, "vi-en" means Vietnamese → Pinyin: the learner can't reliably type tone marks
// or Hán tự without a special keyboard, so grade against the word's Pinyin (`ipa`) with tone
// marks stripped instead of the Hán tự itself.
function isCorrectAnswer(
  language: Language,
  direction: Direction,
  answer: string,
  word: string,
  ipa: string | undefined,
  meaning: string,
) {
  if (direction === "vi-en") {
    if (language === "zh") {
      const a = normalizePinyin(answer);
      if (!a) return false;
      return a === normalizePinyin(ipa ?? word);
    }
    const a = normalizeForCompare(answer);
    if (!a) return false;
    return a === normalizeForCompare(word);
  }
  const a = normalizeForCompare(answer);
  if (!a) return false;
  const m = normalizeForCompare(meaning);
  return a === m || m.includes(a) || a.includes(m);
}

function getModeLabels(language: Language): Record<Mode, string> {
  if (language === "zh") {
    return {
      "en-vi": "Trung → Việt",
      "vi-en": "Việt → Trung (gõ Pinyin)",
      mixed: "Trộn 2 chiều",
    };
  }
  return {
    "en-vi": "Anh → Việt",
    "vi-en": "Việt → Anh",
    mixed: "Trộn 2 chiều",
  };
}

type ReviewSessionProps = {
  storyId: string;
  words: WordPair[];
  language?: Language;
  onExit: () => void;
};

export default function ReviewSession({
  storyId,
  words,
  language = DEFAULT_LANGUAGE,
  onExit,
}: ReviewSessionProps) {
  const speechLang = SPEECH_LANG[language];
  const modeLabels = getModeLabels(language);
  const [mode, setMode] = useState<Mode | null>(null);
  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [pronunciationOverridden, setPronunciationOverridden] = useState(false);
  const [wrongCards, setWrongCards] = useState<Card[]>([]);

  function beginDeck(selectedMode: Mode, pool: WordPair[]) {
    const built: Card[] = shuffle(pool).map((pair) => ({
      ...pair,
      direction:
        selectedMode === "mixed" ? (Math.random() < 0.5 ? "en-vi" : "vi-en") : selectedMode,
    }));
    setMode(selectedMode);
    setDeck(built);
    setIndex(0);
    setAnswer("");
    setSubmitted(false);
    setCorrectCount(0);
    setPronunciationOverridden(false);
    setWrongCards([]);
  }

  function startSession(selectedMode: Mode) {
    beginDeck(selectedMode, words);
  }

  function retryWrongCards() {
    if (!mode || wrongCards.length === 0) return;
    beginDeck(
      mode,
      wrongCards.map(({ word, meaning, ipa }) => ({ word, meaning, ipa })),
    );
  }

  function updateCardMeaning(word: string, newMeaning: string) {
    setDeck((prev) =>
      prev.map((card) =>
        card.word.toLowerCase() === word.toLowerCase()
          ? { ...card, meaning: newMeaning }
          : card,
      ),
    );
  }

  // If the user pronounces the word correctly, that's proof enough they know it —
  // clear a wrong text-answer verdict instead of leaving two contradicting signals on screen.
  function handlePronunciationResult(correct: boolean) {
    if (!correct || !submitted || lastCorrect || pronunciationOverridden) return;
    setLastCorrect(true);
    setCorrectCount((c) => c + 1);
    setPronunciationOverridden(true);
  }

  if (mode === null) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
        <button
          type="button"
          onClick={onExit}
          className="mb-3 text-xs text-slate-400 hover:text-white"
        >
          ← Chọn câu chuyện khác
        </button>
        <p className="mb-4 text-sm text-slate-400">
          Có <strong className="text-white">{words.length}</strong> từ để ôn tập. Chọn chế độ
          kiểm tra:
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(Object.keys(modeLabels) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => startSession(m)}
              className="flex-1 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300"
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isFinished = index >= deck.length;

  if (isFinished) {
    const percent = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0;
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
        <p className="text-lg font-semibold text-amber-300">
          Bạn đúng {correctCount}/{deck.length} câu ({percent}%)
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {wrongCards.length > 0 && (
            <button
              type="button"
              onClick={retryWrongCards}
              className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
            >
              Luyện lại câu sai ({wrongCards.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => startSession(mode)}
            className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-amber-300"
          >
            Ôn lại
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Đổi chế độ
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Chọn câu chuyện khác
          </button>
        </div>
      </div>
    );
  }

  const current = deck[index];
  const isLast = index === deck.length - 1;
  const targetWordVisible =
    current.direction === "en-vi" ? current.word : submitted ? current.word : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitted) return;
    const correct = isCorrectAnswer(
      language,
      current.direction,
      answer,
      current.word,
      current.ipa,
      current.meaning,
    );
    setLastCorrect(correct);
    if (correct) setCorrectCount((c) => c + 1);
    setSubmitted(true);
  }

  function handleNext() {
    if (!lastCorrect) {
      setWrongCards((prev) => [...prev, current]);
    }
    setAnswer("");
    setSubmitted(false);
    setPronunciationOverridden(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
        <button
          type="button"
          onClick={() => setMode(null)}
          className="flex items-center gap-1 hover:text-white"
        >
          ← Quay lại
        </button>
        <span>
          Câu {index + 1}/{deck.length}
        </span>
        <span>Đúng {correctCount}</span>
      </div>

      <p className="mb-1 text-xs font-medium text-slate-500">
        {current.direction === "en-vi"
          ? language === "zh"
            ? "Từ tiếng Trung"
            : "Từ tiếng Anh"
          : "Nghĩa tiếng Việt"}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {current.direction === "en-vi" ? (
          <p className="flex items-center gap-2 text-2xl font-semibold text-white">
            <span>{current.word}</span>
            {current.ipa && (
              <span className="text-base font-normal text-amber-400/70">{current.ipa}</span>
            )}
          </p>
        ) : (
          <EditableMeaning
            storyId={storyId}
            word={current.word}
            meaning={current.meaning}
            onSaved={(newMeaning) => updateCardMeaning(current.word, newMeaning)}
            displayClassName="text-2xl font-semibold text-white"
          />
        )}
        {targetWordVisible && (
          <>
            <button
              type="button"
              onClick={() => speak(targetWordVisible, speechLang)}
              title="Nghe phát âm"
              className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-600"
            >
              🔊
            </button>
            <PronunciationCheck
              word={targetWordVisible}
              lang={speechLang}
              onResult={handlePronunciationResult}
            />
          </>
        )}
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={
              current.direction === "en-vi"
                ? "Nhập nghĩa tiếng Việt"
                : language === "zh"
                  ? "Nhập Pinyin (không cần dấu thanh)"
                  : "Nhập từ tiếng Anh"
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300"
          >
            Kiểm tra
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p
            className={
              lastCorrect
                ? "text-sm font-medium text-green-400"
                : "text-sm font-medium text-red-400"
            }
          >
            {lastCorrect ? "✅ Chính xác!" : "❌ Chưa đúng"}
          </p>
          <p className="text-sm text-slate-400">
            Đáp án đúng:{" "}
            {current.direction === "en-vi" ? (
              <EditableMeaning
                storyId={storyId}
                word={current.word}
                meaning={current.meaning}
                onSaved={(newMeaning) => updateCardMeaning(current.word, newMeaning)}
              />
            ) : (
              <span className="font-medium text-white">
                {current.word}
                {current.ipa && (
                  <span className="ml-1.5 font-normal text-amber-400/70">{current.ipa}</span>
                )}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300"
          >
            {isLast ? "Xem kết quả" : "Câu tiếp theo →"}
          </button>
        </div>
      )}
    </div>
  );
}
