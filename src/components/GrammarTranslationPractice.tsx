"use client";

import { useState, type FormEvent } from "react";
import { TENSES, TRANSLATION_PROMPTS, type TenseId, type TranslationPrompt } from "@/lib/grammar-data";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Result = { correct: boolean; feedback: string; correctedSentence: string };

type GrammarTranslationPracticeProps = {
  scope: TenseId | "mixed";
  onExit: () => void;
};

export default function GrammarTranslationPractice({
  scope,
  onExit,
}: GrammarTranslationPracticeProps) {
  const [deck] = useState<TranslationPrompt[]>(() =>
    shuffle(
      scope === "mixed"
        ? TRANSLATION_PROMPTS
        : TRANSLATION_PROMPTS.filter((p) => p.tenseId === scope),
    ),
  );
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
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
        <button
          type="button"
          onClick={onExit}
          className="mt-5 rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
        >
          Quay lại danh sách thì
        </button>
      </div>
    );
  }

  const current = deck[index];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim() || loading || result) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/grammar/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vi: current.vi, tenseId: current.tenseId, answer: answer.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      setResult(data as Result);
      if (data.correct) setCorrectCount((c) => c + 1);
    } catch {
      setError("Không thể kết nối tới server.");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    setAnswer("");
    setResult(null);
    setError("");
    setIndex((i) => i + 1);
  }

  return (
    <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_#000]">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-400">
        <button type="button" onClick={onExit} className="flex items-center gap-1 hover:text-black">
          ← Chọn thì khác
        </button>
        <span>{scopeLabel}</span>
        <span>
          Câu {index + 1}/{deck.length}
        </span>
      </div>

      <p className="mb-1 text-xs font-medium text-neutral-400">Dịch câu sau sang tiếng Anh</p>
      <p className="mb-4 text-lg font-semibold text-black">{current.vi}</p>

      {!result ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Nhập câu tiếng Anh của bạn..."
            className="rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          />
          {error && (
            <p className="rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !answer.trim()}
            className="self-start rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
          >
            {loading ? "Đang chấm điểm..." : "Chấm điểm"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="rounded-lg border-2 border-black bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            Bạn viết: <span className="font-medium text-black">{answer}</span>
          </p>
          <p
            className={
              result.correct
                ? "text-sm font-medium text-green-700"
                : "text-sm font-medium text-red-600"
            }
          >
            {result.correct ? "✅ Chính xác!" : "❌ Chưa đúng"}
          </p>
          <p className="rounded-lg border-2 border-black bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {result.feedback}
          </p>
          {!result.correct && (
            <p className="text-sm text-neutral-600">
              Gợi ý câu đúng:{" "}
              <span className="font-medium text-black">{result.correctedSentence}</span>
            </p>
          )}
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
