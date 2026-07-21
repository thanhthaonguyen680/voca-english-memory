"use client";

import { useState, type FormEvent } from "react";
import { speak } from "@/lib/speech";
import { normalizeForCompare } from "@/lib/pronunciation";
import PronunciationCheck from "@/components/PronunciationCheck";
import EditableMeaning from "@/components/EditableMeaning";

type WordPair = { word: string; meaning: string };
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

// English answers must match closely; Vietnamese meanings accept a looser containment
// match since the same meaning is often phrased several valid ways (e.g. "táo" vs "quả táo").
function isCorrectAnswer(direction: Direction, answer: string, word: string, meaning: string) {
  const a = normalizeForCompare(answer);
  if (!a) return false;
  if (direction === "vi-en") return a === normalizeForCompare(word);
  const m = normalizeForCompare(meaning);
  return a === m || m.includes(a) || a.includes(m);
}

const MODE_LABELS: Record<Mode, string> = {
  "en-vi": "Anh → Việt",
  "vi-en": "Việt → Anh",
  mixed: "Trộn 2 chiều",
};

export default function ReviewSession({ words }: { words: WordPair[] }) {
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
      wrongCards.map(({ word, meaning }) => ({ word, meaning })),
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
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
        <p className="mb-4 text-sm text-gray-400">
          Có <strong className="text-white">{words.length}</strong> từ để ôn tập. Chọn chế độ
          kiểm tra:
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => startSession(m)}
              className="flex-1 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-amber-300"
            >
              {MODE_LABELS[m]}
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
            className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-amber-300"
          >
            Ôn lại
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            Đổi chế độ
          </button>
        </div>
      </div>
    );
  }

  const current = deck[index];
  const isLast = index === deck.length - 1;
  const englishWordVisible =
    current.direction === "en-vi" ? current.word : submitted ? current.word : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitted) return;
    const correct = isCorrectAnswer(current.direction, answer, current.word, current.meaning);
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
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          Câu {index + 1}/{deck.length}
        </span>
        <span>Đúng {correctCount}</span>
      </div>

      <p className="mb-1 text-xs font-medium text-gray-500">
        {current.direction === "en-vi" ? "Từ tiếng Anh" : "Nghĩa tiếng Việt"}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {current.direction === "en-vi" ? (
          <p className="text-2xl font-semibold text-white">{current.word}</p>
        ) : (
          <EditableMeaning
            word={current.word}
            meaning={current.meaning}
            onSaved={(newMeaning) => updateCardMeaning(current.word, newMeaning)}
            displayClassName="text-2xl font-semibold text-white"
          />
        )}
        {englishWordVisible && (
          <>
            <button
              type="button"
              onClick={() => speak(englishWordVisible)}
              title="Nghe phát âm"
              className="rounded-full bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300 hover:bg-gray-700"
            >
              🔊
            </button>
            <PronunciationCheck word={englishWordVisible} onResult={handlePronunciationResult} />
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
              current.direction === "en-vi" ? "Nhập nghĩa tiếng Việt" : "Nhập từ tiếng Anh"
            }
            className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-amber-300"
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
          <p className="text-sm text-gray-400">
            Đáp án đúng:{" "}
            {current.direction === "en-vi" ? (
              <EditableMeaning
                word={current.word}
                meaning={current.meaning}
                onSaved={(newMeaning) => updateCardMeaning(current.word, newMeaning)}
              />
            ) : (
              <span className="font-medium text-white">{current.word}</span>
            )}
          </p>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-amber-300"
          >
            {isLast ? "Xem kết quả" : "Câu tiếp theo →"}
          </button>
        </div>
      )}
    </div>
  );
}
