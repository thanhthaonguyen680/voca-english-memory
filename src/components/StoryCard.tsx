"use client";

import { useState } from "react";
import BoldText from "@/components/BoldText";
import ConfirmDialog from "@/components/ConfirmDialog";
import { speak } from "@/lib/speech";
import { createClient } from "@/lib/supabase/client";
import { SPEECH_LANG, DEFAULT_LANGUAGE, LANGUAGES, type Language } from "@/lib/constants";
import type { VocabularyItem } from "@/lib/supabase/types";

type StoryCardProps = {
  id?: string;
  content: string;
  translation?: string | null;
  vocabularyUsed: VocabularyItem[];
  language?: Language;
  createdAt?: string;
  highlight?: boolean;
  onDeleted?: (id: string) => void;
};

export default function StoryCard({
  id,
  content,
  translation,
  vocabularyUsed,
  language = DEFAULT_LANGUAGE,
  createdAt,
  highlight = false,
  onDeleted,
}: StoryCardProps) {
  const speechLang = SPEECH_LANG[language];
  const [openWords, setOpenWords] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggleWord(index: number) {
    setOpenWords((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function confirmDelete() {
    if (!id) return;

    setDeleting(true);
    setDeleteError("");
    const supabase = createClient();
    const { error } = await supabase.from("stories").delete().eq("id", id);

    if (error) {
      setDeleteError("Không thể xoá. Vui lòng thử lại.");
      setDeleting(false);
      setConfirmOpen(false);
      return;
    }

    onDeleted?.(id);
  }

  return (
    <div
      className={
        highlight
          ? "rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
          : "rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm"
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {vocabularyUsed.map((item, index) => {
            const isOpen = openWords.has(index);
            return (
              <div key={index} className="flex flex-col items-start">
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                  <button
                    type="button"
                    onClick={() => speak(item.word, speechLang)}
                    title="Nghe phát âm"
                    aria-label="Nghe phát âm"
                    className="hover:text-amber-100"
                  >
                    🔊
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWord(index)}
                    title="Xem nghĩa"
                    className="flex items-center gap-1 hover:underline"
                  >
                    <span>{item.word}</span>
                    {item.ipa && <span className="text-amber-400/70">{item.ipa}</span>}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs text-amber-200">
                    {item.meaning ?? "Chưa có nghĩa"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {(createdAt || id) && (
          <div className="flex shrink-0 items-center gap-2">
            {createdAt && (
              <time className="text-xs text-slate-500">
                {new Date(createdAt).toLocaleString("vi-VN")}
              </time>
            )}
            {id && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
                title="Xoá câu chuyện"
                aria-label="Xoá câu chuyện"
                className="rounded-lg px-1.5 py-1 text-xs text-slate-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {deleteError && <p className="mb-3 text-xs text-red-400">{deleteError}</p>}

      <div className="mb-2 flex items-center justify-between gap-2">
        {highlight ? (
          <h3 className="text-sm font-medium text-amber-300">
            {LANGUAGES.find((item) => item.id === language)?.flag} Câu chuyện của bạn
          </h3>
        ) : (
          <span className="text-sm">{LANGUAGES.find((item) => item.id === language)?.flag}</span>
        )}
        <button
          type="button"
          onClick={() => speak(content.replace(/\*\*/g, ""), speechLang)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-slate-200"
        >
          <span aria-hidden>🔊</span> Nghe câu chuyện
        </button>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
        <BoldText text={content} />
      </p>

      {translation && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <p className="mb-1 text-xs font-medium text-slate-500">Bản dịch tiếng Việt</p>
          <p className="whitespace-pre-wrap text-sm text-slate-400">{translation}</p>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Xoá câu chuyện này?"
        description="Không thể hoàn tác."
        confirmLabel="Xoá"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
