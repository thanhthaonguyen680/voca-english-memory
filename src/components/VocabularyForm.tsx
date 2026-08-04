"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import StoryCard from "@/components/StoryCard";
import { MAX_WORDS_PER_STORY, DEFAULT_LANGUAGE, type Language } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";
import { compressImageToBase64 } from "@/lib/image";
import type { VocabularyItem } from "@/lib/supabase/types";

type WordEntry = { word: string; meaning: string };
type WordInput = { word: string; meaning?: string };

type GeneratedStory = {
  content: string;
  translation: string | null;
  vocabulary_used: VocabularyItem[];
  language: Language;
};

const EMPTY_ENTRY: WordEntry = { word: "", meaning: "" };

const WORD_PLACEHOLDER: Record<Language, string> = {
  en: "Từ vựng (vd: apple)",
  zh: "Từ vựng (vd: 苹果)",
};

export default function VocabularyForm() {
  const { language } = useLanguage();
  const [entries, setEntries] = useState<WordEntry[]>([{ ...EMPTY_ENTRY }]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [lastWords, setLastWords] = useState<WordInput[]>([]);
  const [lastLanguage, setLastLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Appends scanned words to whatever the user already typed (rather than discarding it),
  // dropping any still-empty rows so a fresh form doesn't leave a blank line at the top.
  function mergeScannedWords(scanned: WordInput[]) {
    setEntries((prev) => {
      const typed = prev.filter((entry) => entry.word.trim().length > 0);
      const merged = [
        ...typed,
        ...scanned.map((entry) => ({ word: entry.word, meaning: entry.meaning ?? "" })),
      ].slice(0, MAX_WORDS_PER_STORY);
      return merged.length > 0 ? merged : [{ ...EMPTY_ENTRY }];
    });
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setScanError("");
    setScanning(true);
    try {
      const { base64, mimeType } = await compressImageToBase64(file);
      const res = await fetch("/api/scan-vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, language }),
      });
      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      mergeScannedWords(data.words as WordInput[]);
    } catch {
      setScanError("Không thể xử lý ảnh. Vui lòng thử lại.");
    } finally {
      setScanning(false);
    }
  }

  async function generateStory(words: WordInput[], forLanguage: Language) {
    setError("");
    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words, language: forLanguage }),
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
        language: forLanguage,
      });
      setLastWords(words);
      setLastLanguage(forLanguage);
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
    await generateStory(words, language);
    setEntries([{ ...EMPTY_ENTRY }]);
    setLoading(false);
  }

  async function handleRegenerate() {
    if (lastWords.length === 0) return;
    setRegenerating(true);
    await generateStory(lastWords, lastLanguage);
    setRegenerating(false);
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-slate-900 px-3.5 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
          >
            {scanning ? (
              "Đang quét ảnh..."
            ) : (
              <>
                <span aria-hidden>📷</span> Chụp / chọn ảnh từ vựng
              </>
            )}
          </button>
          <span className="text-xs text-slate-500">
            Ran Ran sẽ tự quét từ trong ảnh và điền vào danh sách bên dưới.
          </span>
        </div>
        {scanError && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {scanError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {entries.map((entry, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder={WORD_PLACEHOLDER[language]}
                value={entry.word}
                onChange={(event) => updateEntry(index, "word", event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
              <input
                type="text"
                placeholder="Nghĩa (tuỳ chọn)"
                value={entry.meaning}
                onChange={(event) => updateEntry(index, "meaning", event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  aria-label="Xoá từ"
                  className="rounded-lg px-2 text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400"
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
              className="text-sm font-medium text-amber-400 hover:text-amber-300 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:text-slate-600"
            >
              + Thêm từ
            </button>
            <span className="text-xs text-slate-500">
              {entries.length}/{MAX_WORDS_PER_STORY} từ
            </span>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
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
            language={story.language}
            highlight
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-slate-900 px-3.5 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
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
