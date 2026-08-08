"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import StoryCard from "@/components/StoryCard";
import { createClient } from "@/lib/supabase/client";
import { compressImageToBase64 } from "@/lib/image";
import { LANGUAGES, type Language } from "@/lib/constants";
import type { VocabularyItem } from "@/lib/supabase/types";

type Word = { id: string; word: string; meaning: string | null };
type PendingWord = { word: string; meaning: string };
type Topic = { id: string; name: string; description: string | null; language: Language; icon: string };

type GeneratedStory = {
  content: string;
  translation: string | null;
  vocabulary_used: VocabularyItem[];
};

export default function TopicDetail({
  topic,
  initialWords,
}: {
  topic: Topic;
  initialWords: Word[];
}) {
  const [words, setWords] = useState<Word[]>(initialWords);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [adding, setAdding] = useState(false);
  const [wordError, setWordError] = useState("");

  const [pending, setPending] = useState<PendingWord[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [story, setStory] = useState<GeneratedStory | null>(null);

  const flag = LANGUAGES.find((item) => item.id === topic.language)?.flag;

  function isDuplicate(word: string, against: { word: string }[]) {
    const target = word.trim().toLowerCase();
    return against.some((item) => item.word.trim().toLowerCase() === target);
  }

  async function handleAddWord(event: FormEvent) {
    event.preventDefault();
    const word = newWord.trim();
    if (!word) return;

    if (isDuplicate(word, words)) {
      setWordError("Từ này đã có trong chủ đề rồi.");
      return;
    }

    setAdding(true);
    setWordError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setWordError("Bạn cần đăng nhập.");
      setAdding(false);
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_entries")
      .insert({
        user_id: user.id,
        topic_id: topic.id,
        word,
        meaning: newMeaning.trim() || null,
        language: topic.language,
      })
      .select()
      .single();

    if (error || !data) {
      setWordError("Không thể thêm từ. Vui lòng thử lại.");
      setAdding(false);
      return;
    }

    setWords((prev) => [...prev, { id: data.id, word: data.word, meaning: data.meaning }]);
    setNewWord("");
    setNewMeaning("");
    setAdding(false);
  }

  async function handleDeleteWord(id: string) {
    setWords((prev) => prev.filter((w) => w.id !== id));
    const supabase = createClient();
    await supabase.from("vocabulary_entries").delete().eq("id", id);
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
        body: JSON.stringify({ imageBase64: base64, mimeType, language: topic.language }),
      });
      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      const scanned = (data.words as { word: string; meaning?: string }[])
        .filter((w) => !isDuplicate(w.word, words) && !isDuplicate(w.word, pending))
        .map((w) => ({ word: w.word, meaning: w.meaning ?? "" }));
      setPending((prev) => [...prev, ...scanned]);
    } catch {
      setScanError("Không thể xử lý ảnh. Vui lòng thử lại.");
    } finally {
      setScanning(false);
    }
  }

  function removePending(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSavePending() {
    if (pending.length === 0) return;
    setSaving(true);
    setScanError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setScanError("Bạn cần đăng nhập.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_entries")
      .insert(
        pending.map((p) => ({
          user_id: user.id,
          topic_id: topic.id,
          word: p.word,
          meaning: p.meaning.trim() || null,
          language: topic.language,
        })),
      )
      .select();

    if (error || !data) {
      setScanError("Không thể lưu từ vào chủ đề. Vui lòng thử lại.");
      setSaving(false);
      return;
    }

    setWords((prev) => [
      ...prev,
      ...data.map((d) => ({ id: d.id, word: d.word, meaning: d.meaning })),
    ]);
    setPending([]);
    setSaving(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError("");
    setStory(null);
    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      setStory({
        content: data.story.content as string,
        translation: (data.story.translation as string | null) ?? null,
        vocabulary_used: (data.story.vocabulary_used as VocabularyItem[]) ?? [],
      });
    } catch {
      setGenerateError("Không thể kết nối tới server.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <Link
        href="/vocabulary"
        className="mb-4 inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
      >
        ← Tất cả chủ đề
      </Link>

      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-black">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black bg-amber-100 text-lg">
          {topic.icon}
        </span>
        {flag} {topic.name}
      </h1>
      {topic.description && <p className="mb-6 text-sm text-neutral-600">{topic.description}</p>}

      <div className="mb-4 flex flex-wrap gap-3">
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
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-emerald-300 px-3.5 py-2 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
        >
          {scanning ? "Đang quét ảnh..." : (
            <>
              <span aria-hidden>📷</span> Scan ảnh AI
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3.5 py-2 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
        >
          + Thêm từ
        </button>
      </div>

      {scanError && (
        <p className="mb-4 rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
          {scanError}
        </p>
      )}

      {pending.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-black bg-emerald-50 p-4 shadow-[4px_4px_0_0_#000]">
          <p className="mb-3 text-sm font-semibold text-emerald-800">
            Đã quét được {pending.length} từ — kiểm tra lại rồi lưu vào chủ đề:
          </p>
          <div className="mb-3 flex flex-col gap-2">
            {pending.map((p, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={p.word}
                  onChange={(event) =>
                    setPending((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, word: event.target.value } : item)),
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-2.5 py-1.5 text-sm text-black outline-none focus:border-emerald-500"
                />
                <input
                  value={p.meaning}
                  onChange={(event) =>
                    setPending((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, meaning: event.target.value } : item)),
                    )
                  }
                  placeholder="Nghĩa"
                  className="min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-2.5 py-1.5 text-sm text-black outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => removePending(index)}
                  aria-label="Bỏ từ này"
                  className="rounded-lg px-2 text-sm text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSavePending}
            disabled={saving}
            className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : `💾 Lưu ${pending.length} từ vào chủ đề`}
          </button>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddWord}
          className="mb-6 flex flex-wrap items-start gap-2 rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
        >
          <input
            autoFocus
            value={newWord}
            onChange={(event) => setNewWord(event.target.value)}
            placeholder="Từ vựng"
            className="min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          />
          <input
            value={newMeaning}
            onChange={(event) => setNewMeaning(event.target.value)}
            placeholder="Nghĩa (tuỳ chọn)"
            className="min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          />
          <button
            type="submit"
            disabled={adding || !newWord.trim()}
            className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
          >
            Thêm
          </button>
          {wordError && <p className="w-full text-sm text-red-600">{wordError}</p>}
        </form>
      )}

      {words.length === 0 ? (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-black bg-white p-8 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-black bg-emerald-100 text-2xl">
            📸
          </span>
          <p className="mb-1 font-semibold text-black">Chưa có từ vựng nào</p>
          <p className="mb-4 text-sm text-neutral-500">
            Đừng tốn công gõ tay từng từ — chụp ảnh trang sách để Ran Ran tự bóc tách từ &amp;
            dịch nghĩa trong vài giây.
          </p>
          <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
            <div className="rounded-xl border-2 border-black bg-amber-50 px-2 py-3 text-xs text-amber-900">
              <span className="mb-1 block text-lg">📖</span>1. Chụp ảnh sách
            </div>
            <div className="rounded-xl border-2 border-black bg-emerald-50 px-2 py-3 text-xs text-emerald-900">
              <span className="mb-1 block text-lg">🤖</span>2. AI quét từ
            </div>
            <div className="rounded-xl border-2 border-black bg-amber-50 px-2 py-3 text-xs text-amber-900">
              <span className="mb-1 block text-lg">🎉</span>3. Xong ngay!
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap gap-2">
          {words.map((w) => (
            <div
              key={w.id}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3 py-1.5 text-sm text-black shadow-[2px_2px_0_0_#000]"
            >
              <span className="font-medium">{w.word}</span>
              {w.meaning && <span className="text-neutral-500">— {w.meaning}</span>}
              <button
                type="button"
                onClick={() => handleDeleteWord(w.id)}
                aria-label={`Xoá ${w.word}`}
                className="text-neutral-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || words.length === 0}
        className="mb-6 rounded-full border-2 border-black bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
      >
        {generating ? "Đang tạo câu chuyện..." : "🪄 Tạo câu chuyện từ chủ đề này"}
      </button>

      {generateError && (
        <p className="mb-6 rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
          {generateError}
        </p>
      )}

      {story && (
        <div className="mb-6">
          <StoryCard
            content={story.content}
            translation={story.translation}
            vocabularyUsed={story.vocabulary_used}
            language={topic.language}
            highlight
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3.5 py-2 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
            >
              <span aria-hidden>🔄</span> Tạo câu chuyện khác
            </button>
            <Link
              href="/history"
              className="text-sm font-medium text-emerald-700 underline hover:text-emerald-800"
            >
              Xem lịch sử học →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
