"use client";

import { useState } from "react";
import Link from "next/link";
import ReviewSession from "@/components/ReviewSession";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import type { Language } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";

export type StoryDeck = {
  id: string;
  snippet: string;
  createdAt: string;
  language: Language;
  topicId: string | null;
  words: { word: string; meaning: string; ipa?: string }[];
};

export type TopicOption = { id: string; name: string; icon: string };

const LANGUAGE_FLAG: Record<Language, string> = Object.fromEntries(
  LANGUAGES.map((item) => [item.id, item.flag]),
) as Record<Language, string>;

const ALL_TOPICS = "all";
const NO_TOPIC = "none";

export default function ReviewStoryList({
  decks: initialDecks,
  topics,
}: {
  decks: StoryDeck[];
  topics: TopicOption[];
}) {
  const { language } = useLanguage();
  const [allDecksRaw, setAllDecksRaw] = useState(initialDecks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string>(ALL_TOPICS);
  const [deleteTarget, setDeleteTarget] = useState<StoryDeck | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const supabase = createClient();
    const { error } = await supabase.from("stories").delete().eq("id", deleteTarget.id);

    if (error) {
      setDeleteError("Không thể xoá. Vui lòng thử lại.");
      setDeleting(false);
      return;
    }

    setAllDecksRaw((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  const byLanguage = allDecksRaw.filter((deck) => deck.language === language);
  const hasUntagged = byLanguage.some((deck) => !deck.topicId);
  const topicsInUse = topics.filter((topic) =>
    byLanguage.some((deck) => deck.topicId === topic.id),
  );

  const decks = byLanguage.filter((deck) => {
    if (topicFilter === ALL_TOPICS) return true;
    if (topicFilter === NO_TOPIC) return !deck.topicId;
    return deck.topicId === topicFilter;
  });

  const selected = byLanguage.find((deck) => deck.id === selectedId) ?? null;

  if (byLanguage.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Chưa có câu chuyện {LANGUAGE_FLAG[language]} nào để ôn tập. Hãy tạo ở trang{" "}
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

  if (selected) {
    return (
      <ReviewSession
        key={selected.id}
        storyId={selected.id}
        words={selected.words}
        language={selected.language}
        onExit={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
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

      {deleteError && (
        <p className="rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
          {deleteError}
        </p>
      )}

      {decks.length === 0 ? (
        <p className="text-sm text-neutral-500">Không có câu chuyện nào trong bộ lọc này.</p>
      ) : (
        decks.map((deck) => {
          const topic = topics.find((t) => t.id === deck.topicId);
          return (
            <div
              key={deck.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(deck.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedId(deck.id);
              }}
              className="cursor-pointer rounded-2xl border-2 border-black bg-white p-4 text-left shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-400">
                <span>
                  {LANGUAGE_FLAG[deck.language]} {deck.words.length} từ
                  {topic && <> · {topic.icon} {topic.name}</>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <time>{new Date(deck.createdAt).toLocaleString("vi-VN")}</time>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(deck);
                    }}
                    aria-label="Xoá thẻ này"
                    className="text-neutral-400 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </span>
              </div>
              <p className="mb-2 line-clamp-2 text-sm text-neutral-700">{deck.snippet}</p>
              <div className="flex flex-wrap gap-1">
                {deck.words.slice(0, 6).map((item) => (
                  <span
                    key={item.word}
                    className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                  >
                    {item.word}
                  </span>
                ))}
                {deck.words.length > 6 && (
                  <span className="px-1 text-xs text-neutral-400">
                    +{deck.words.length - 6}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xoá thẻ ôn tập này?"
        description="Câu chuyện và toàn bộ từ vựng của nó sẽ bị xoá khỏi Ôn tập lẫn Lịch sử học. Không thể hoàn tác."
        confirmLabel="Xoá"
        danger
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
