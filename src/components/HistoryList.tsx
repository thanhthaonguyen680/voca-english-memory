"use client";

import { useState } from "react";
import Link from "next/link";
import StoryCard from "@/components/StoryCard";
import { LANGUAGES, type Language } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";
import type { TopicOption } from "@/app/history/page";
import type { VocabularyItem } from "@/lib/supabase/types";

type StoryRow = {
  id: string;
  content: string;
  translation: string | null;
  vocabulary_used: VocabularyItem[];
  language: Language;
  topic_id: string | null;
  created_at: string;
};

const LANGUAGE_FLAG: Record<Language, string> = Object.fromEntries(
  LANGUAGES.map((item) => [item.id, item.flag]),
) as Record<Language, string>;

const ALL_TOPICS = "all";
const NO_TOPIC = "none";

export default function HistoryList({
  initialStories,
  topics,
}: {
  initialStories: StoryRow[];
  topics: TopicOption[];
}) {
  const { language } = useLanguage();
  const [allStories, setAllStories] = useState(initialStories);
  const [topicFilter, setTopicFilter] = useState<string>(ALL_TOPICS);

  const byLanguage = allStories.filter((story) => story.language === language);
  const hasUntagged = byLanguage.some((story) => !story.topic_id);
  const topicsInUse = topics.filter((topic) =>
    byLanguage.some((story) => story.topic_id === topic.id),
  );

  const stories = byLanguage.filter((story) => {
    if (topicFilter === ALL_TOPICS) return true;
    if (topicFilter === NO_TOPIC) return !story.topic_id;
    return story.topic_id === topicFilter;
  });

  if (byLanguage.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Chưa có câu chuyện {LANGUAGE_FLAG[language]} nào. Hãy tạo câu chuyện đầu tiên ở trang{" "}
        <Link
          href="/vocabulary"
          className="font-medium text-emerald-700 underline hover:text-emerald-800"
        >
          Nhập từ vựng
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(topicsInUse.length > 0 || hasUntagged) && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTopicFilter(ALL_TOPICS)}
            className={
              topicFilter === ALL_TOPICS
                ? "rounded-full border-2 border-black bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000]"
                : "rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-50"
            }
          >
            Tất cả
          </button>
          {topicsInUse.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setTopicFilter(topic.id)}
              className={
                topicFilter === topic.id
                  ? "rounded-full border-2 border-black bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000]"
                  : "rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-50"
              }
            >
              {topic.icon} {topic.name}
            </button>
          ))}
          {hasUntagged && (
            <button
              type="button"
              onClick={() => setTopicFilter(NO_TOPIC)}
              className={
                topicFilter === NO_TOPIC
                  ? "rounded-full border-2 border-black bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000]"
                  : "rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-50"
              }
            >
              Khác
            </button>
          )}
        </div>
      )}

      {stories.length === 0 ? (
        <p className="text-sm text-neutral-500">Không có câu chuyện nào trong bộ lọc này.</p>
      ) : (
        stories.map((story) => (
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
        ))
      )}
    </div>
  );
}
