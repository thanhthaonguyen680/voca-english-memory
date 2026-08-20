"use client";

import { useState } from "react";
import { speak } from "@/lib/utils/speech";
import { SPEECH_LANG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Language } from "@/lib/types";
import type { Word } from "@/components/TopicDetail";

const WORD_TYPES = ["n", "v", "adj", "adv", "phrase"];

export default function TopicWordList({
  words,
  language,
  onDeleteWord,
  onWordUpdated,
}: {
  words: Word[];
  language: Language;
  onDeleteWord: (id: string) => void;
  onWordUpdated: (id: string, patch: { meaning: string | null; wordType: string | null }) => void;
}) {
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editMeaning, setEditMeaning] = useState("");
  const [editWordType, setEditWordType] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function handleStartEdit(word: Word) {
    setEditingWordId(word.id);
    setEditMeaning(word.meaning ?? "");
    setEditWordType(word.wordType ?? "");
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    const supabase = createClient();
    const meaning = editMeaning.trim() || null;
    const wordType = editWordType || null;
    const { error } = await supabase
      .from("vocabulary_entries")
      .update({ meaning, word_type: wordType })
      .eq("id", id);

    if (!error) {
      onWordUpdated(id, { meaning, wordType });
      setEditingWordId(null);
    }
    setSavingEdit(false);
  }

  async function handleDeleteWord(id: string) {
    onDeleteWord(id);
    const supabase = createClient();
    await supabase.from("vocabulary_entries").delete().eq("id", id);
  }

  return (
    <div className="mb-6 flex flex-col gap-3">
      {words.map((w) => (
        <div
          key={w.id}
          className="flex items-start justify-between gap-3 rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-black">{w.word}</span>
              {w.wordType && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-300 text-xs font-semibold text-neutral-500">
                  {w.wordType}
                </span>
              )}
              {w.ipa && <span className="text-sm text-neutral-400">/{w.ipa}/</span>}
            </div>

            {editingWordId === w.id ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={editMeaning}
                  onChange={(event) => setEditMeaning(event.target.value)}
                  placeholder="Nghĩa"
                  className="min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-2.5 py-1.5 text-sm text-black outline-none focus:border-emerald-500"
                />
                <select
                  value={editWordType}
                  onChange={(event) => setEditWordType(event.target.value)}
                  className="rounded-lg border-2 border-black bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-emerald-500"
                >
                  <option value="">Loại từ</option>
                  {WORD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(w.id)}
                  disabled={savingEdit}
                  className="rounded-md border-2 border-black bg-emerald-300 px-2.5 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                >
                  {savingEdit ? "Đang lưu..." : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingWordId(null)}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Huỷ
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">{w.meaning || "Chưa có nghĩa"}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleStartEdit(w)}
              aria-label={`Sửa ${w.word}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-sm hover:bg-neutral-50"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => speak(w.word, SPEECH_LANG[language])}
              aria-label={`Nghe ${w.word}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-sm hover:bg-neutral-50"
            >
              🔊
            </button>
            <button
              type="button"
              onClick={() => handleDeleteWord(w.id)}
              aria-label={`Xoá ${w.word}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-sm text-neutral-400 hover:text-red-600"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
