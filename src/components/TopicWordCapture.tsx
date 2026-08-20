"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import ScanPhotoModal, { type SampleWord } from "@/components/ScanPhotoModal";
import AddWordModal from "@/components/AddWordModal";
import { createClient } from "@/lib/supabase/client";
import { compressImageToBase64 } from "@/lib/utils/image";
import type { Language } from "@/lib/types";
import type { Word, PendingWord } from "@/components/TopicDetail";

// Owns the whole "get more words into this topic" flow: scan-by-photo (+ its pending-review
// step), manual add, and the empty-state CTA — all three live here (not split further) because
// they share the same scanModalOpen/showAddForm trigger state; splitting the empty-state's
// duplicate buttons into a sibling component would mean two components fighting over one modal.
export default function TopicWordCapture({
  topic,
  words,
  generating,
  onWordsAdded,
  onGenerateBatch,
}: {
  topic: { id: string; language: Language };
  words: Word[];
  generating: boolean;
  onWordsAdded: (newWords: Word[]) => void;
  onGenerateBatch: (wordIds: string[]) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newWordType, setNewWordType] = useState("");
  const [adding, setAdding] = useState(false);
  const [wordError, setWordError] = useState("");

  const [pending, setPending] = useState<PendingWord[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastBatchIds, setLastBatchIds] = useState<string[] | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function isDuplicate(word: string, against: { word: string }[]) {
    const target = word.trim().toLowerCase();
    return against.some((item) => item.word.trim().toLowerCase() === target);
  }

  // Best-effort AI fallback for words the learner left with no meaning — never blocks saving
  // if it fails (same resilience pattern as the writing-feedback route), just leaves the gap
  // for the next story/palace generation to fill instead.
  async function fetchAiMeanings(
    targetWords: string[],
  ): Promise<Map<string, { meaning: string; type: string }>> {
    if (targetWords.length === 0) return new Map();
    try {
      const res = await fetch("/api/fill-meaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: targetWords, language: topic.language }),
      });
      if (!res.ok) return new Map();
      const data = await res.json();
      const items = (data.items ?? []) as { word: string; meaning: string; type: string }[];
      return new Map(items.map((item) => [item.word.toLowerCase(), item]));
    } catch {
      return new Map();
    }
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

    let meaning = newMeaning.trim();
    let wordType = newWordType;
    if (!meaning) {
      const aiMeanings = await fetchAiMeanings([word]);
      const ai = aiMeanings.get(word.toLowerCase());
      if (ai) {
        meaning = ai.meaning;
        wordType = wordType || ai.type;
      }
    }

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
        meaning: meaning || null,
        word_type: wordType || null,
        language: topic.language,
      })
      .select()
      .single();

    if (error || !data) {
      setWordError("Không thể thêm từ. Vui lòng thử lại.");
      setAdding(false);
      return;
    }

    onWordsAdded([
      {
        id: data.id,
        word: data.word,
        meaning: data.meaning,
        wordType: data.word_type,
        ipa: data.ipa,
      },
    ]);
    setNewWord("");
    setNewMeaning("");
    setNewWordType("");
    setAdding(false);
  }

  async function processImageFile(file: File) {
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

      const scanned = (
        data.words as { word: string; meaning?: string; type?: string; pronunciation?: string }[]
      )
        .filter((w) => !isDuplicate(w.word, words) && !isDuplicate(w.word, pending))
        .map((w) => ({
          word: w.word,
          meaning: w.meaning ?? "",
          wordType: w.type ?? "",
          ipa: w.pronunciation ?? "",
        }));
      setPending((prev) => [...prev, ...scanned]);
      setLastBatchIds(null);
    } catch {
      setScanError("Không thể xử lý ảnh. Vui lòng thử lại.");
    } finally {
      setScanning(false);
    }
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await processImageFile(file);
  }

  function handleUseSample(sampleWords: SampleWord[]) {
    const filtered = sampleWords
      .filter((w) => !isDuplicate(w.word, words) && !isDuplicate(w.word, pending))
      .map((w) => ({ word: w.word, meaning: w.meaning, wordType: w.wordType, ipa: w.ipa }));
    setPending((prev) => [...prev, ...filtered]);
    setLastBatchIds(null);
    setScanModalOpen(false);
  }

  function removePending(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSavePending() {
    if (pending.length === 0) return;
    setSaving(true);
    setScanError("");

    const missingMeaningWords = pending.filter((p) => !p.meaning.trim()).map((p) => p.word);
    const aiMeanings = await fetchAiMeanings(missingMeaningWords);
    const enrichedPending = pending.map((p) => {
      if (p.meaning.trim()) return p;
      const ai = aiMeanings.get(p.word.toLowerCase());
      if (!ai) return p;
      return { ...p, meaning: ai.meaning, wordType: p.wordType || ai.type };
    });

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
        enrichedPending.map((p) => ({
          user_id: user.id,
          topic_id: topic.id,
          word: p.word,
          meaning: p.meaning.trim() || null,
          word_type: p.wordType.trim() || null,
          ipa: p.ipa.trim() || null,
          language: topic.language,
        })),
      )
      .select();

    if (error || !data) {
      setScanError("Không thể lưu từ vào chủ đề. Vui lòng thử lại.");
      setSaving(false);
      return;
    }

    onWordsAdded(
      data.map((d) => ({
        id: d.id,
        word: d.word,
        meaning: d.meaning,
        wordType: d.word_type,
        ipa: d.ipa,
      })),
    );
    setLastBatchIds(data.map((d) => d.id));
    setPending([]);
    setSaving(false);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelected}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => setScanModalOpen(true)}
          disabled={scanning}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-emerald-300 px-3.5 py-2 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {scanning ? (
            "Đang quét ảnh..."
          ) : (
            <>
              <span aria-hidden>📷</span> Scan ảnh AI
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3.5 py-2 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
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
                      prev.map((item, i) =>
                        i === index ? { ...item, word: event.target.value } : item,
                      ),
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-2.5 py-1.5 text-sm text-black outline-none focus:border-emerald-500"
                />
                <input
                  value={p.meaning}
                  onChange={(event) =>
                    setPending((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, meaning: event.target.value } : item,
                      ),
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
            className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : `💾 Lưu ${pending.length} từ vào chủ đề`}
          </button>
        </div>
      )}

      {pending.length === 0 && lastBatchIds && lastBatchIds.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-black bg-amber-50 p-4 shadow-[4px_4px_0_0_#000]">
          <p className="text-sm text-amber-900">
            ✅ Đã lưu {lastBatchIds.length} từ vừa quét vào chủ đề. Tạo riêng 1 câu chuyện chỉ
            dùng đúng {lastBatchIds.length} từ này?
          </p>
          <button
            type="button"
            onClick={() => onGenerateBatch(lastBatchIds)}
            disabled={generating}
            className="rounded-full border-2 border-black bg-emerald-300 px-3.5 py-2 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
          >
            {generating ? "Đang tạo..." : "🪄 Tạo câu chuyện riêng cho batch này"}
          </button>
          <button
            type="button"
            onClick={() => setLastBatchIds(null)}
            className="text-xs text-amber-800 hover:underline"
          >
            Bỏ qua
          </button>
        </div>
      )}

      <AddWordModal
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        word={newWord}
        meaning={newMeaning}
        wordType={newWordType}
        onWordChange={setNewWord}
        onMeaningChange={setNewMeaning}
        onWordTypeChange={setNewWordType}
        onSubmit={handleAddWord}
        adding={adding}
        error={wordError}
      />

      {words.length === 0 && (
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

          <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2">
            <button
              type="button"
              onClick={() => setScanModalOpen(true)}
              disabled={scanning}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-black bg-emerald-300 px-5 py-3 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
            >
              {scanning ? (
                "Đang quét ảnh..."
              ) : (
                <>
                  <span aria-hidden>📸</span> Scan ảnh trang sách
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm((s) => !s)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-black bg-white px-5 py-3 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              + Thêm từ thủ công
            </button>
          </div>
        </div>
      )}

      <ScanPhotoModal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        scanning={scanning}
        onOpenCamera={() => {
          setScanModalOpen(false);
          cameraInputRef.current?.click();
        }}
        onChooseFile={() => {
          setScanModalOpen(false);
          fileInputRef.current?.click();
        }}
        onFileDropped={(file) => {
          setScanModalOpen(false);
          processImageFile(file);
        }}
        onUseSample={handleUseSample}
      />
    </>
  );
}
