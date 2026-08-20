"use client";

import Link from "next/link";
import StoryCard from "@/components/StoryCard";
import type { Language } from "@/lib/types";
import type { GeneratedStory } from "@/components/TopicDetail";

export default function TopicStoryView({
  story,
  language,
  generating,
  onBack,
  onRegenerate,
}: {
  story: GeneratedStory;
  language: Language;
  generating: boolean;
  onBack: () => void;
  onRegenerate: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        ← Quay lại
      </button>
      <StoryCard
        content={story.content}
        translation={story.translation}
        vocabularyUsed={story.vocabulary_used}
        language={language}
        highlight
      />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3.5 py-2 text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
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
    </>
  );
}
