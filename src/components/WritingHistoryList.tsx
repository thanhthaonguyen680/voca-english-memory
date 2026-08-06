"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES, DEFAULT_LANGUAGE, isLanguage } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";

type Writing = {
  id: string;
  title: string;
  overview: string | null;
  body: string;
  conclusion: string | null;
  feedback: string | null;
  language?: string;
  created_at: string;
};

const LANGUAGE_FLAG: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((item) => [item.id, item.flag]),
);

export default function WritingHistoryList({
  initialWritings,
}: {
  initialWritings: Writing[];
}) {
  const { language } = useLanguage();
  const [allWritings, setAllWritings] = useState(initialWritings);
  const writings = allWritings.filter((w) =>
    isLanguage(w.language) ? w.language === language : language === DEFAULT_LANGUAGE,
  );
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

    setAllWritings((prev) => prev.filter((w) => w.id !== confirmId));
    setDeleting(false);
    setConfirmId(null);
  }

  if (writings.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Chưa có bài viết {LANGUAGE_FLAG[language]} nào. Hãy viết bài đầu tiên ở trang{" "}
        <a
          href="/writing"
          className="font-medium text-emerald-700 underline hover:text-emerald-800"
        >
          Luyện viết
        </a>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      {writings.map((writing) => {
        const isOpen = expandedId === writing.id;
        return (
          <div
            key={writing.id}
            className="rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : writing.id)}
                className="text-left text-sm font-semibold text-black hover:text-emerald-800"
              >
                {LANGUAGE_FLAG[isLanguage(writing.language) ? writing.language : DEFAULT_LANGUAGE]}{" "}
                {writing.title}
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <time className="text-xs text-neutral-400">
                  {new Date(writing.created_at).toLocaleString("vi-VN")}
                </time>
                <button
                  type="button"
                  onClick={() => setConfirmId(writing.id)}
                  title="Xoá bài viết"
                  aria-label="Xoá bài viết"
                  className="rounded-lg px-1.5 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  🗑️
                </button>
              </div>
            </div>

            {!isOpen ? (
              <button
                type="button"
                onClick={() => setExpandedId(writing.id)}
                className="line-clamp-2 text-left text-sm text-neutral-600 hover:text-neutral-800"
              >
                {writing.body}
              </button>
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                {writing.overview && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-neutral-400">Mở bài</p>
                    <p className="whitespace-pre-wrap text-neutral-800">{writing.overview}</p>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-medium text-neutral-400">Thân bài</p>
                  <p className="whitespace-pre-wrap text-neutral-800">{writing.body}</p>
                </div>
                {writing.conclusion && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-neutral-400">Kết luận</p>
                    <p className="whitespace-pre-wrap text-neutral-800">{writing.conclusion}</p>
                  </div>
                )}
                {writing.feedback && (
                  <div className="rounded-lg border-2 border-black bg-emerald-50 p-3">
                    <p className="mb-1 text-xs font-medium text-emerald-800">Nhận xét từ Ran Ran</p>
                    <p className="whitespace-pre-wrap text-black">{writing.feedback}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="self-start text-xs text-neutral-400 hover:text-black"
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
