"use client";

import type { FormEvent } from "react";

const WORD_TYPES = ["n", "v", "adj", "adv", "phrase"];

export default function AddWordModal({
  open,
  onClose,
  word,
  meaning,
  wordType,
  onWordChange,
  onMeaningChange,
  onWordTypeChange,
  onSubmit,
  adding,
  error,
}: {
  open: boolean;
  onClose: () => void;
  word: string;
  meaning: string;
  wordType: string;
  onWordChange: (value: string) => void;
  onMeaningChange: (value: string) => void;
  onWordTypeChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  adding: boolean;
  error: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-black/50"
      />
      <form
        onSubmit={onSubmit}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-emerald-200 text-xl">
              📝
            </span>
            <h2 className="font-bold text-black">Thêm từ mới</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-sm hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Từ vựng *
          </label>
          <input
            autoFocus
            value={word}
            onChange={(event) => onWordChange(event.target.value)}
            placeholder="Ví dụ: renewable energy"
            className="w-full rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Nghĩa
          </label>
          <input
            value={meaning}
            onChange={(event) => onMeaningChange(event.target.value)}
            placeholder="Nghĩa (tuỳ chọn)"
            className="w-full rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Loại từ
          </label>
          <select
            value={wordType}
            onChange={(event) => onWordTypeChange(event.target.value)}
            className="w-full rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          >
            <option value="">Không chọn</option>
            {WORD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={adding || !word.trim()}
            className="flex-1 rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
          >
            {adding ? "Đang thêm..." : "+ Thêm từ"}
          </button>
        </div>
      </form>
    </div>
  );
}
