"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import StoryCard from "@/components/StoryCard";
import { MAX_WORDS_PER_STORY } from "@/lib/constants";
import type { VocabularyItem } from "@/lib/supabase/types";

type WordEntry = { word: string; meaning: string };
type WordInput = { word: string; meaning?: string };

type GeneratedStory = {
  content: string;
  translation: string | null;
  vocabulary_used: VocabularyItem[];
};

const EMPTY_ENTRY: WordEntry = { word: "", meaning: "" };

export default function VocabularyForm() {
  const [entries, setEntries] = useState<WordEntry[]>([{ ...EMPTY_ENTRY }]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [lastWords, setLastWords] = useState<WordInput[]>([]);

  function updateEntry(index: number, field: keyof WordEntry, value: string) {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    );
  }

  function addEntry() {
    setEntries((prev) => [...prev, { ...EMPTY_ENTRY }]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function generateStory(words: WordInput[]) {
    setError("");
    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      setStory({
        content: data.story.content as string,
        translation: (data.story.translation as string | null) ?? null,
        vocabulary_used: (data.story.vocabulary_used as VocabularyItem[]) ?? [],
      });
      setLastWords(words);
    } catch {
      setError("Không thể kết nối tới server.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStory(null);

    const words = entries
      .map((entry) => ({
        word: entry.word.trim(),
        meaning: entry.meaning.trim() || undefined,
      }))
      .filter((entry) => entry.word.length > 0);

    if (words.length === 0) {
      setError("Vui lòng nhập ít nhất 1 từ vựng.");
      return;
    }

    setLoading(true);
    await generateStory(words);
    setEntries([{ ...EMPTY_ENTRY }]);
    setLoading(false);
  }

  async function handleRegenerate() {
    if (lastWords.length === 0) return;
    setRegenerating(true);
    await generateStory(lastWords);
    setRegenerating(false);
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {entries.map((entry, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder="Từ vựng (vd: apple)"
                value={entry.word}
                onChange={(event) => updateEntry(index, "word", event.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
              <input
                type="text"
                placeholder="Nghĩa (tuỳ chọn)"
                value={entry.meaning}
                onChange={(event) => updateEntry(index, "meaning", event.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  aria-label="Xoá từ"
                  className="rounded-lg px-2 text-sm text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={addEntry}
              disabled={entries.length >= MAX_WORDS_PER_STORY}
              className="text-sm font-medium text-amber-400 hover:text-amber-300 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:text-gray-600"
            >
              + Thêm từ
            </button>
            <span className="text-xs text-gray-500">
              {entries.length}/{MAX_WORDS_PER_STORY} từ
            </span>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "Đang tạo câu chuyện..." : "Tạo câu chuyện"}
          </button>
        </form>
      </div>

      {story && (
        <div className="mt-6">
          <StoryCard
            content={story.content}
            translation={story.translation}
            vocabularyUsed={story.vocabulary_used}
            highlight
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-gray-900 px-3.5 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
            >
              {regenerating ? "Đang tạo..." : (
                <>
                  <span aria-hidden>🔄</span> Tạo câu chuyện khác
                </>
              )}
            </button>
            <Link
              href="/history"
              className="text-sm font-medium text-amber-400 underline hover:text-amber-300"
            >
              Xem lịch sử học →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
