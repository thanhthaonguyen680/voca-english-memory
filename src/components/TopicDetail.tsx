"use client";

import { useState } from "react";
import Link from "next/link";
import ReviewSession from "@/components/ReviewSession";
import TopicWordCapture from "@/components/TopicWordCapture";
import TopicWordList from "@/components/TopicWordList";
import TopicStoryView from "@/components/TopicStoryView";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import type { Language } from "@/lib/types";
import type { VocabularyItem } from "@/lib/supabase/types";

// Shared with TopicWordCapture.tsx / TopicWordList.tsx / TopicStoryView.tsx — this file stays
// the source of truth for these view-model shapes since it owns the state they describe.
export type Word = {
  id: string;
  word: string;
  meaning: string | null;
  wordType: string | null;
  ipa: string | null;
};
export type PendingWord = { word: string; meaning: string; wordType: string; ipa: string };
export type Topic = {
  id: string;
  name: string;
  description: string | null;
  language: Language;
  icon: string;
};
export type GeneratedStory = {
  content: string;
  translation: string | null;
  vocabulary_used: VocabularyItem[];
};

export default function TopicDetail({
  topic,
  initialWords,
  initialStory = null,
  dueReviewDay = null,
}: {
  topic: Topic;
  initialWords: Word[];
  initialStory?: GeneratedStory | null;
  dueReviewDay?: number | null;
}) {
  const [words, setWords] = useState<Word[]>(initialWords);
  const [mode, setMode] = useState<"list" | "review" | "story">("list");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [story, setStory] = useState<GeneratedStory | null>(initialStory);
  const [showReviewReminder, setShowReviewReminder] = useState(dueReviewDay !== null);

  const flag = LANGUAGES.find((item) => item.id === topic.language)?.flag;
  const reviewableWords = words
    .filter((w) => w.meaning && w.meaning.trim())
    .map((w) => ({ word: w.word, meaning: w.meaning as string }));

  // Best-effort: marks this topic as reviewed today, for the spaced-repetition reminder (see
  // getDueReviewDay in utils/spaced-review.ts). Story generation marks it server-side instead
  // (generate-story/route.ts), since that route already validates topic ownership.
  function markTopicReviewed() {
    const supabase = createClient();
    supabase
      .from("vocabulary_topics")
      .update({ last_reviewed_at: new Date().toISOString() })
      .eq("id", topic.id)
      .then(({ error }) => {
        if (error) console.error("Failed to mark topic as reviewed", error);
      });
  }

  function handleStartReview() {
    setMode("review");
    setShowReviewReminder(false);
    markTopicReviewed();
  }

  function handleWordsAdded(newWords: Word[]) {
    setWords((prev) => [...prev, ...newWords]);
  }

  function handleWordDeleted(id: string) {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }

  function handleWordUpdated(
    id: string,
    patch: { meaning: string | null; wordType: string | null },
  ) {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  async function handleGenerate(wordIds?: string[]) {
    setGenerating(true);
    setGenerateError("");
    setStory(null);
    setShowReviewReminder(false);
    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id, ...(wordIds ? { wordIds } : {}) }),
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
      setMode("story");
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
        className="mb-4 inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        ← Tất cả chủ đề
      </Link>

      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-black">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black bg-amber-100 text-lg">
          {topic.icon}
        </span>
        {flag} {topic.name}
      </h1>
      {topic.description && <p className="mb-4 text-sm text-neutral-600">{topic.description}</p>}

      {mode === "review" ? (
        <ReviewSession
          words={reviewableWords}
          language={topic.language}
          onExit={() => setMode("list")}
          exitLabel="Quay lại"
        />
      ) : mode === "story" && story ? (
        <TopicStoryView
          story={story}
          language={topic.language}
          generating={generating}
          onBack={() => setMode("list")}
          onRegenerate={() => handleGenerate()}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => (story ? setMode("story") : handleGenerate())}
              disabled={generating || (!story && words.length === 0)}
              className="rounded-full border-2 border-black bg-violet-300 px-5 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
            >
              {generating
                ? "Đang tạo câu chuyện..."
                : story
                  ? "📖 Xem câu chuyện đã tạo"
                  : "🪄 Tạo câu chuyện từ chủ đề này"}
            </button>
            <button
              type="button"
              onClick={handleStartReview}
              disabled={reviewableWords.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
            >
              📝 Ôn tập từ vựng
            </button>
            {words.length > 0 && (
              <Link
                href={`/vocabulary/${topic.id}/palace`}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                🏰 Cung điện trí nhớ
              </Link>
            )}
          </div>

          <TopicWordCapture
            topic={{ id: topic.id, language: topic.language }}
            words={words}
            generating={generating}
            onWordsAdded={handleWordsAdded}
            onGenerateBatch={(ids) => handleGenerate(ids)}
          />

          {words.length > 0 && (
            <TopicWordList
              words={words}
              language={topic.language}
              onDeleteWord={handleWordDeleted}
              onWordUpdated={handleWordUpdated}
            />
          )}

          {generateError && (
            <p className="mb-6 rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
              {generateError}
            </p>
          )}
        </>
      )}

      {showReviewReminder && dueReviewDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setShowReviewReminder(false)}
            className="fixed inset-0 cursor-default bg-black/50"
          />
          <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl border-2 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-black bg-amber-100 text-2xl">
              ⏰
            </span>
            <div>
              <h2 className="font-bold text-black">Đến lúc ôn tập rồi!</h2>
              <p className="mt-1.5 text-sm text-neutral-600">
                Đã {dueReviewDay} ngày kể từ khi bạn tạo &ldquo;{topic.name}&rdquo; — đây là mốc
                ôn tập theo phương pháp lặp lại ngắt quãng (spaced repetition), ôn lại ngay để
                nhớ lâu hơn nhé!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowReviewReminder(false)}
                className="flex-1 rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleStartReview}
                disabled={reviewableWords.length === 0}
                className="flex-1 rounded-full border-2 border-black bg-violet-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
              >
                📝 Ôn tập ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
