"use client";

import { useState } from "react";
import { TENSES, type TenseId } from "@/lib/grammar-data";
import GrammarQuiz from "@/components/GrammarQuiz";
import GrammarTranslationPractice from "@/components/GrammarTranslationPractice";

type Practice = { mode: "mcq" | "translate"; scope: TenseId | "mixed" };

export default function GrammarTenseList() {
  const [expandedId, setExpandedId] = useState<TenseId | null>(null);
  const [practice, setPractice] = useState<Practice | null>(null);

  if (practice) {
    return practice.mode === "mcq" ? (
      <GrammarQuiz scope={practice.scope} onExit={() => setPractice(null)} />
    ) : (
      <GrammarTranslationPractice scope={practice.scope} onExit={() => setPractice(null)} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setPractice({ mode: "mcq", scope: "mixed" })}
          className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
        >
          🎲 Trắc nghiệm — trộn tất cả các thì
        </button>
        <button
          type="button"
          onClick={() => setPractice({ mode: "translate", scope: "mixed" })}
          className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
        >
          ✍️ Dịch câu — trộn tất cả các thì
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {TENSES.map((tense) => {
          const isOpen = expandedId === tense.id;
          return (
            <div
              key={tense.id}
              className="rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : tense.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <span className="font-semibold text-black">{tense.nameVi}</span>{" "}
                  <span className="text-sm text-neutral-500">({tense.nameEn})</span>
                </span>
                <span className="text-neutral-400">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="mt-4 flex flex-col gap-4 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                      Cấu trúc
                    </p>
                    <ul className="flex flex-col gap-1 text-black">
                      <li>
                        <span className="font-medium text-emerald-700">Khẳng định:</span>{" "}
                        {tense.structure.affirmative}
                      </li>
                      <li>
                        <span className="font-medium text-red-600">Phủ định:</span>{" "}
                        {tense.structure.negative}
                      </li>
                      <li>
                        <span className="font-medium text-black">Nghi vấn:</span>{" "}
                        {tense.structure.question}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                      Cách dùng
                    </p>
                    <ul className="list-disc pl-5 text-neutral-800">
                      {tense.usage.map((rule, i) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                      Từ nhận biết
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {tense.signalWords.map((word) => (
                        <span
                          key={word}
                          className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                      Ví dụ
                    </p>
                    <ul className="flex flex-col gap-1">
                      {tense.examples.map((ex, i) => (
                        <li key={i} className="text-neutral-800">
                          <span className="text-black">{ex.en}</span>{" "}
                          <span className="text-neutral-500">— {ex.vi}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                      Đặt câu hỏi &amp; trả lời
                    </p>
                    <div className="rounded-lg border-2 border-black bg-emerald-50 p-3 text-neutral-800">
                      <p>
                        <span className="font-medium text-black">Yes/No:</span>{" "}
                        {tense.questionAnswer.yesNo.question}
                        <br />
                        <span className="text-emerald-800">
                          → {tense.questionAnswer.yesNo.shortYes} /{" "}
                          {tense.questionAnswer.yesNo.shortNo}
                        </span>
                      </p>
                      <p className="mt-2">
                        <span className="font-medium text-black">Wh-question:</span>{" "}
                        {tense.questionAnswer.wh.question}
                        <br />
                        <span className="text-emerald-800">
                          → {tense.questionAnswer.wh.answer}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPractice({ mode: "mcq", scope: tense.id })}
                      className="rounded-full border-2 border-black bg-white px-3.5 py-2 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                    >
                      📝 Trắc nghiệm thì này
                    </button>
                    <button
                      type="button"
                      onClick={() => setPractice({ mode: "translate", scope: tense.id })}
                      className="rounded-full border-2 border-black bg-white px-3.5 py-2 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                    >
                      ✍️ Dịch câu thì này
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
