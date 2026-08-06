"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LANGUAGES } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";

type SubmittedWriting = {
  title: string;
  overview: string | null;
  body: string;
  conclusion: string | null;
  feedback: string | null;
};

const FIELD_CLASS =
  "rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300";

export default function WritingForm() {
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [overview, setOverview] = useState("");
  const [body, setBody] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmittedWriting | null>(null);

  function resetForm() {
    setTitle("");
    setOverview("");
    setBody("");
    setConclusion("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !body.trim()) {
      setError("Vui lòng nhập ít nhất tiêu đề và phần thân bài.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          overview: overview.trim(),
          body: body.trim(),
          conclusion: conclusion.trim(),
          language,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      setResult(data.writing);
      resetForm();
    } catch {
      setError("Không thể kết nối tới server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_#000]"
      >
        <p className="text-xs text-neutral-400">
          Ngôn ngữ: {LANGUAGES.find((item) => item.id === language)?.flag}{" "}
          {LANGUAGES.find((item) => item.id === language)?.label} — đổi ở góc trên.
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Tiêu đề</label>
          <input
            type="text"
            placeholder="Tiêu đề bài viết"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Mở bài (tuỳ chọn)</label>
          <textarea
            rows={2}
            placeholder="Giới thiệu ngắn gọn về chủ đề..."
            value={overview}
            onChange={(event) => setOverview(event.target.value)}
            className={`${FIELD_CLASS} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Thân bài</label>
          <textarea
            rows={8}
            placeholder="Nội dung chính của bài viết..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={`${FIELD_CLASS} resize-y`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Kết luận (tuỳ chọn)</label>
          <textarea
            rows={2}
            placeholder="Tóm tắt / kết luận..."
            value={conclusion}
            onChange={(event) => setConclusion(event.target.value)}
            className={`${FIELD_CLASS} resize-none`}
          />
        </div>

        {error && (
          <p className="rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
        >
          {loading ? "Đang chấm bài..." : "Nộp bài"}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-2xl border-2 border-black bg-emerald-50 p-6 shadow-[5px_5px_0_0_#000]">
          <h2 className="mb-2 text-sm font-semibold text-emerald-800">
            Đã lưu: {result.title}
          </h2>
          {result.feedback ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-black">
              {result.feedback}
            </p>
          ) : (
            <p className="text-sm text-neutral-600">
              Đã lưu bài viết, nhưng chưa lấy được nhận xét từ Ran Ran lúc này.
            </p>
          )}
          <Link
            href="/writing/history"
            className="mt-4 inline-block text-sm font-medium text-emerald-700 underline hover:text-emerald-800"
          >
            Xem lịch sử viết →
          </Link>
        </div>
      )}
    </>
  );
}
