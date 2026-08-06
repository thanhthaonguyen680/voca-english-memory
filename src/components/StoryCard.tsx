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
          ? "rounded-2xl border-2 border-black bg-emerald-50 p-6 shadow-[5px_5px_0_0_#000]"
          : "rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]"
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {vocabularyUsed.map((item, index) => {
            const isOpen = openWords.has(index);
            return (
              <div key={index} className="flex flex-col items-start">
                <div className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-2.5 py-1 text-xs font-medium text-black">
                  <button
                    type="button"
                    onClick={() => speak(item.word, speechLang)}
                    title="Nghe phát âm"
                    aria-label="Nghe phát âm"
                    className="hover:text-emerald-700"
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
                    {item.ipa && <span className="text-emerald-700/80">{item.ipa}</span>}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-1 rounded-lg border-2 border-black bg-emerald-100 px-2.5 py-1 text-xs text-emerald-900">
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
              <time className="text-xs text-neutral-400">
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
                className="rounded-lg px-1.5 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {deleteError && <p className="mb-3 text-xs text-red-600">{deleteError}</p>}

      <div className="mb-2 flex items-center justify-between gap-2">
        {highlight ? (
          <h3 className="text-sm font-semibold text-emerald-800">
            {LANGUAGES.find((item) => item.id === language)?.flag} Câu chuyện của bạn
          </h3>
        ) : (
          <span className="text-sm">{LANGUAGES.find((item) => item.id === language)?.flag}</span>
        )}
        <button
          type="button"
          onClick={() => speak(content.replace(/\*\*/g, ""), speechLang)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <span aria-hidden>🔊</span> Nghe câu chuyện
        </button>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-black">
        <BoldText text={content} />
      </p>

      {translation && (
        <div className="mt-4 border-t-2 border-black pt-3">
          <p className="mb-1 text-xs font-medium text-neutral-400">Bản dịch tiếng Việt</p>
          <p className="whitespace-pre-wrap text-sm text-neutral-600">{translation}</p>
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
