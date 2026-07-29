"use client";

import { useState } from "react";
import StoryCard from "@/components/StoryCard";
import { LANGUAGES, type Language } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";
import type { VocabularyItem } from "@/lib/supabase/types";

type StoryRow = {
  id: string;
  content: string;
  translation: string | null;
  vocabulary_used: VocabularyItem[];
  language: Language;
  created_at: string;
};

const LANGUAGE_FLAG: Record<Language, string> = Object.fromEntries(
  LANGUAGES.map((item) => [item.id, item.flag]),
) as Record<Language, string>;

export default function HistoryList({ initialStories }: { initialStories: StoryRow[] }) {
  const { language } = useLanguage();
  const [allStories, setAllStories] = useState(initialStories);
  const stories = allStories.filter((story) => story.language === language);

  if (stories.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Chưa có câu chuyện {LANGUAGE_FLAG[language]} nào. Hãy tạo câu chuyện đầu tiên ở trang{" "}
        <a
          href="/vocabulary"
          className="font-medium text-amber-400 underline hover:text-amber-300"
        >
          Nhập từ vựng
        </a>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {stories.map((story) => (
        <StoryCard
          key={story.id}
          id={story.id}
          content={story.content}
          translation={story.translation}
          vocabularyUsed={story.vocabulary_used}
          language={story.language}
          createdAt={story.created_at}
          onDeleted={(id) => setAllStories((prev) => prev.filter((s) => s.id !== id))}
        />
      ))}
    </div>
  );
}
