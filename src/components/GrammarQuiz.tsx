"use client";

import { useState } from "react";
import { GRAMMAR_QUESTIONS, TENSES, type TenseId, type GrammarQuestion } from "@/lib/grammar-data";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type GrammarQuizProps = {
  scope: TenseId | "mixed";
  onExit: () => void;
};

export default function GrammarQuiz({ scope, onExit }: GrammarQuizProps) {
  const [deck] = useState<GrammarQuestion[]>(() =>
    shuffle(
      scope === "mixed"
        ? GRAMMAR_QUESTIONS
        : GRAMMAR_QUESTIONS.filter((q) => q.tenseId === scope),
    ),
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const scopeLabel =
    scope === "mixed" ? "Trộn tất cả các thì" : TENSES.find((t) => t.id === scope)?.nameVi ?? "";

  const isFinished = index >= deck.length;

  if (isFinished) {
    const percent = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0;
    return (
      <div className="rounded-2xl border-2 border-black bg-emerald-50 p-6 text-center shadow-[5px_5px_0_0_#000]">
        <p className="text-lg font-semibold text-emerald-800">
          Bạn đúng {correctCount}/{deck.length} câu ({percent}%)
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            Quay lại danh sách thì
          </button>
        </div>
      </div>
    );
  }

  const current = deck[index];

  function handleSelect(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    if (optionIndex === current.correctIndex) setCorrectCount((c) => c + 1);
  }

  function handleNext() {
    setSelected(null);
    setIndex((i) => i + 1);
  }

  return (
    <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_#000]">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-400">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1 font-semibold text-black hover:text-emerald-700"
        >
          ← Chọn thì khác
        </button>
        <span>{scopeLabel}</span>
        <span>
          Câu {index + 1}/{deck.length}
        </span>
      </div>

      <p className="mb-4 text-lg font-semibold text-black">{current.question}</p>

      <div className="flex flex-col gap-2">
        {current.options.map((option, optionIndex) => {
          const isCorrectOption = optionIndex === current.correctIndex;
          const isSelectedOption = optionIndex === selected;
          let style =
            "rounded-lg border-2 border-black bg-white px-4 py-2.5 text-left text-sm font-medium text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000]";
          if (selected !== null) {
            if (isCorrectOption) {
              style = "rounded-lg border-2 border-black bg-emerald-300 px-4 py-2.5 text-left text-sm font-medium text-black shadow-none";
            } else if (isSelectedOption) {
              style = "rounded-lg border-2 border-black bg-red-300 px-4 py-2.5 text-left text-sm font-medium text-black shadow-none";
            } else {
              style = "rounded-lg border-2 border-black bg-white px-4 py-2.5 text-left text-sm font-medium text-neutral-400 shadow-none";
            }
          }
          return (
            <button
              key={optionIndex}
              type="button"
              onClick={() => handleSelect(optionIndex)}
              disabled={selected !== null}
              className={style}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-4 flex flex-col gap-3">
          <p
            className={
              selected === current.correctIndex
                ? "text-sm font-medium text-green-700"
                : "text-sm font-medium text-red-600"
            }
          >
            {selected === current.correctIndex ? "✅ Chính xác!" : "❌ Chưa đúng"}
          </p>
          <p className="rounded-lg border-2 border-black bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {current.explanation}
          </p>
          <button
            type="button"
            onClick={handleNext}
            className="self-start rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            {index === deck.length - 1 ? "Xem kết quả" : "Câu tiếp theo →"}
          </button>
        </div>
      )}
    </div>
  );
}
