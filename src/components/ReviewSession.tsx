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
      <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_#000]">
        <button
          type="button"
          onClick={onExit}
          className="mb-3 inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          ← Chọn câu chuyện khác
        </button>
        <p className="mb-4 text-sm text-neutral-600">
          Có <strong className="text-black">{words.length}</strong> từ để ôn tập. Chọn chế độ
          kiểm tra:
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(Object.keys(modeLabels) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => startSession(m)}
              className="flex-1 rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
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
      <div className="rounded-2xl border-2 border-black bg-emerald-50 p-6 text-center shadow-[5px_5px_0_0_#000]">
        <p className="text-lg font-semibold text-emerald-800">
          Bạn đúng {correctCount}/{deck.length} câu ({percent}%)
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {wrongCards.length > 0 && (
            <button
              type="button"
              onClick={retryWrongCards}
              className="rounded-full border-2 border-black bg-red-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
            >
              Luyện lại câu sai ({wrongCards.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => startSession(mode)}
            className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            Ôn lại
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            Đổi chế độ
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
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
    <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_#000]">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-400">
        <button
          type="button"
          onClick={() => setMode(null)}
          className="flex items-center gap-1 font-semibold text-black hover:text-emerald-700"
        >
          ← Quay lại
        </button>
        <span>
          Câu {index + 1}/{deck.length}
        </span>
        <span>Đúng {correctCount}</span>
      </div>

      <p className="mb-1 text-xs font-medium text-neutral-400">
        {current.direction === "en-vi"
          ? language === "zh"
            ? "Từ tiếng Trung"
            : "Từ tiếng Anh"
          : "Nghĩa tiếng Việt"}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {current.direction === "en-vi" ? (
          <p className="flex items-center gap-2 text-2xl font-semibold text-black">
            <span>{current.word}</span>
            {current.ipa && (
              <span className="text-base font-normal text-emerald-700/80">{current.ipa}</span>
            )}
          </p>
        ) : (
          <EditableMeaning
            storyId={storyId}
            word={current.word}
            meaning={current.meaning}
            onSaved={(newMeaning) => updateCardMeaning(current.word, newMeaning)}
            displayClassName="text-2xl font-semibold text-black"
          />
        )}
        {targetWordVisible && (
          <>
            <button
              type="button"
              onClick={() => speak(targetWordVisible, speechLang)}
              title="Nghe phát âm"
              className="rounded-full border-2 border-black bg-white px-2.5 py-1 text-xs font-medium text-black shadow-[2px_2px_0_0_#000]"
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
            className="rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          />
          <button
            type="submit"
            className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            Kiểm tra
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p
            className={
              lastCorrect
                ? "text-sm font-medium text-green-700"
                : "text-sm font-medium text-red-600"
            }
          >
            {lastCorrect ? "✅ Chính xác!" : "❌ Chưa đúng"}
          </p>
          <p className="text-sm text-neutral-600">
            Đáp án đúng:{" "}
            {current.direction === "en-vi" ? (
              <EditableMeaning
                storyId={storyId}
                word={current.word}
                meaning={current.meaning}
                onSaved={(newMeaning) => updateCardMeaning(current.word, newMeaning)}
              />
            ) : (
              <span className="font-medium text-black">
                {current.word}
                {current.ipa && (
                  <span className="ml-1.5 font-normal text-emerald-700/80">{current.ipa}</span>
                )}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            {isLast ? "Xem kết quả" : "Câu tiếp theo →"}
          </button>
        </div>
      )}
    </div>
  );
}
