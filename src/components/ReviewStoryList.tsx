"use client";

import { useState } from "react";
import ReviewSession from "@/components/ReviewSession";
import { LANGUAGES, type Language } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";

export type StoryDeck = {
  id: string;
  snippet: string;
  createdAt: string;
  language: Language;
  words: { word: string; meaning: string; ipa?: string }[];
};

const LANGUAGE_FLAG: Record<Language, string> = Object.fromEntries(
  LANGUAGES.map((item) => [item.id, item.flag]),
) as Record<Language, string>;

export default function ReviewStoryList({ decks: allDecks }: { decks: StoryDeck[] }) {
  const { language } = useLanguage();
  const decks = allDecks.filter((deck) => deck.language === language);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = decks.find((deck) => deck.id === selectedId) ?? null;

  if (decks.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Chưa có câu chuyện {LANGUAGE_FLAG[language]} nào để ôn tập. Hãy tạo ở trang{" "}
        <a
          href="/vocabulary"
          className="font-medium text-emerald-700 underline hover:text-emerald-800"
        >
          Nhập từ vựng
        </a>
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
      {decks.map((deck) => (
        <button
          key={deck.id}
          type="button"
          onClick={() => setSelectedId(deck.id)}
          className="rounded-2xl border-2 border-black bg-white p-4 text-left shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
        >
          <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
            <span>
              {LANGUAGE_FLAG[deck.language]} {deck.words.length} từ
            </span>
            <time>{new Date(deck.createdAt).toLocaleString("vi-VN")}</time>
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
              <span className="px-1 text-xs text-neutral-400">+{deck.words.length - 6}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
