"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type SubmittedWriting = {
  title: string;
  overview: string | null;
  body: string;
  conclusion: string | null;
  feedback: string | null;
};

const FIELD_CLASS =
  "rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30";

export default function WritingForm() {
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
        className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Tiêu đề</label>
          <input
            type="text"
            placeholder="Tiêu đề bài viết"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Mở bài (tuỳ chọn)</label>
          <textarea
            rows={2}
            placeholder="Giới thiệu ngắn gọn về chủ đề..."
            value={overview}
            onChange={(event) => setOverview(event.target.value)}
            className={`${FIELD_CLASS} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Thân bài</label>
          <textarea
            rows={8}
            placeholder="Nội dung chính của bài viết..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={`${FIELD_CLASS} resize-y`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Kết luận (tuỳ chọn)</label>
          <textarea
            rows={2}
            placeholder="Tóm tắt / kết luận..."
            value={conclusion}
            onChange={(event) => setConclusion(event.target.value)}
            className={`${FIELD_CLASS} resize-none`}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
        >
          {loading ? "Đang chấm bài..." : "Nộp bài"}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="mb-2 text-sm font-medium text-amber-300">
            Đã lưu: {result.title}
          </h2>
          {result.feedback ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
              {result.feedback}
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Đã lưu bài viết, nhưng chưa lấy được nhận xét từ AI lúc này.
            </p>
          )}
          <Link
            href="/writing/history"
            className="mt-4 inline-block text-sm font-medium text-amber-400 underline hover:text-amber-300"
          >
            Xem lịch sử viết →
          </Link>
        </div>
      )}
    </>
  );
}
