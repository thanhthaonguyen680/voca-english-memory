import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewStoryList, { type StoryDeck } from "@/components/ReviewStoryList";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/constants";
import type { VocabularyItem } from "@/lib/supabase/types";

export default async function ReviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: stories, error }, { data: topics }] = await Promise.all([
    supabase
      .from("stories")
      .select("id, content, vocabulary_used, language, topic_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("vocabulary_topics")
      .select("id, name, icon")
      .eq("user_id", user.id),
  ]);

  // Each story is its own deck — words are never merged across stories, and deleting a
  // story (which also deletes its vocabulary_used) automatically removes it from here too.
  const decks: StoryDeck[] = (stories ?? [])
    .map((story) => {
      const seen = new Set<string>();
      const words = (story.vocabulary_used as VocabularyItem[])
        .filter((item) => {
          const key = item.word.trim().toLowerCase();
          if (!item.meaning || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((item) => ({
          word: item.word.trim(),
          meaning: item.meaning!.trim(),
          ipa: item.ipa,
        }));

      return {
        id: story.id,
        snippet: story.content.replace(/\*\*/g, ""),
        createdAt: story.created_at,
        language: isLanguage(story.language) ? story.language : DEFAULT_LANGUAGE,
        topicId: story.topic_id,
        words,
      };
    })
    .filter((deck) => deck.words.length > 0);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-black">Ôn tập từ vựng</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Chọn 1 câu chuyện để ôn đúng bộ từ trong câu chuyện đó — nhìn từ đoán nghĩa, hoặc nhìn
        nghĩa đoán từ. Có thể luyện phát âm bằng giọng của bạn.
      </p>

      {error && (
        <p className="text-sm text-red-600">Không thể tải danh sách từ vựng. Vui lòng thử lại.</p>
      )}

      {!error && <ReviewStoryList decks={decks} topics={topics ?? []} />}
    </main>
  );
}
