"use client";

import { useState } from "react";
import StoryCard from "@/components/StoryCard";
import type { VocabularyItem } from "@/lib/supabase/types";

type StoryRow = {
  id: string;
  content: string;
  translation: string | null;
  vocabulary_used: VocabularyItem[];
  created_at: string;
};

export default function HistoryList({ initialStories }: { initialStories: StoryRow[] }) {
  const [stories, setStories] = useState(initialStories);

  if (stories.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Bạn chưa có câu chuyện nào. Hãy tạo câu chuyện đầu tiên ở trang{" "}
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
          createdAt={story.created_at}
          onDeleted={(id) => setStories((prev) => prev.filter((s) => s.id !== id))}
        />
      ))}
    </div>
  );
}
