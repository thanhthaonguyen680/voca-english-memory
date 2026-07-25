"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";

type Writing = {
  id: string;
  title: string;
  overview: string | null;
  body: string;
  conclusion: string | null;
  feedback: string | null;
  created_at: string;
};

export default function WritingHistoryList({
  initialWritings,
}: {
  initialWritings: Writing[];
}) {
  const [writings, setWritings] = useState(initialWritings);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function confirmDelete() {
    if (!confirmId) return;
    setDeleting(true);
    setDeleteError("");

    const supabase = createClient();
    const { error } = await supabase.from("writings").delete().eq("id", confirmId);

    if (error) {
      setDeleteError("Không thể xoá. Vui lòng thử lại.");
      setDeleting(false);
      return;
    }

    setWritings((prev) => prev.filter((w) => w.id !== confirmId));
    setDeleting(false);
    setConfirmId(null);
  }

  if (writings.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Bạn chưa viết bài nào. Hãy viết bài đầu tiên ở trang{" "}
        <a
          href="/writing"
          className="font-medium text-amber-400 underline hover:text-amber-300"
        >
          Luyện viết
        </a>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}

      {writings.map((writing) => {
        const isOpen = expandedId === writing.id;
        return (
          <div
            key={writing.id}
            className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : writing.id)}
                className="text-left text-sm font-semibold text-white hover:text-amber-300"
              >
                {writing.title}
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <time className="text-xs text-slate-500">
                  {new Date(writing.created_at).toLocaleString("vi-VN")}
                </time>
                <button
                  type="button"
                  onClick={() => setConfirmId(writing.id)}
                  title="Xoá bài viết"
                  aria-label="Xoá bài viết"
                  className="rounded-lg px-1.5 py-1 text-xs text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  🗑️
                </button>
              </div>
            </div>

            {!isOpen ? (
              <button
                type="button"
                onClick={() => setExpandedId(writing.id)}
                className="line-clamp-2 text-left text-sm text-slate-400 hover:text-slate-300"
              >
                {writing.body}
              </button>
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                {writing.overview && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Mở bài</p>
                    <p className="whitespace-pre-wrap text-slate-200">{writing.overview}</p>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">Thân bài</p>
                  <p className="whitespace-pre-wrap text-slate-200">{writing.body}</p>
                </div>
                {writing.conclusion && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Kết luận</p>
                    <p className="whitespace-pre-wrap text-slate-200">{writing.conclusion}</p>
                  </div>
                )}
                {writing.feedback && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="mb-1 text-xs font-medium text-amber-300">Nhận xét từ AI</p>
                    <p className="whitespace-pre-wrap text-slate-100">{writing.feedback}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="self-start text-xs text-slate-500 hover:text-white"
                >
                  Thu gọn
                </button>
              </div>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        open={confirmId !== null}
        title="Xoá bài viết này?"
        description="Không thể hoàn tác."
        confirmLabel="Xoá"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
