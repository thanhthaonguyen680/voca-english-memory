"use client";

import { useState } from "react";

type EditableMeaningProps = {
  storyId: string;
  word: string;
  meaning: string;
  onSaved: (newMeaning: string) => void;
  displayClassName?: string;
};

export default function EditableMeaning({
  storyId,
  word,
  meaning,
  onSaved,
  displayClassName = "font-medium text-black",
}: EditableMeaningProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meaning);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/stories/${storyId}/vocabulary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, meaning: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Không thể lưu.");
        return;
      }

      onSaved(trimmed);
      setEditing(false);
    } catch {
      setError("Không thể kết nối tới server.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className={displayClassName}>{meaning}</span>
        <button
          type="button"
          onClick={() => {
            setDraft(meaning);
            setEditing(true);
          }}
          title="Sửa nghĩa"
          className="text-xs text-neutral-400 hover:text-emerald-700"
        >
          ✏️
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="rounded-md border-2 border-black bg-white px-2 py-1 text-sm text-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-md border-2 border-black bg-emerald-300 px-2 py-1 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50"
      >
        {saving ? "Đang lưu..." : "Lưu"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-neutral-400 hover:text-neutral-700"
      >
        Huỷ
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
