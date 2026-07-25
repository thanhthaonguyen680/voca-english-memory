import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewStoryList, { type StoryDeck } from "@/components/ReviewStoryList";
import type { VocabularyItem } from "@/lib/supabase/types";

export default async function ReviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: stories, error } = await supabase
    .from("stories")
    .select("id, content, vocabulary_used, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
        .map((item) => ({ word: item.word.trim(), meaning: item.meaning!.trim() }));

      return {
        id: story.id,
        snippet: story.content.replace(/\*\*/g, ""),
        createdAt: story.created_at,
        words,
      };
    })
    .filter((deck) => deck.words.length > 0);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-white">Ôn tập từ vựng</h1>
      <p className="mb-6 text-sm text-slate-400">
        Chọn 1 câu chuyện để ôn đúng bộ từ trong câu chuyện đó — nhìn từ tiếng Anh đoán nghĩa,
        hoặc nhìn nghĩa đoán từ tiếng Anh. Có thể luyện phát âm bằng giọng của bạn.
      </p>

      {error && (
        <p className="text-sm text-red-400">Không thể tải danh sách từ vựng. Vui lòng thử lại.</p>
      )}

      {!error && decks.length === 0 && (
        <p className="text-sm text-slate-400">
          Chưa có từ nào để ôn tập. Hãy tạo vài câu chuyện ở trang{" "}
          <a
            href="/vocabulary"
            className="font-medium text-amber-400 underline hover:text-amber-300"
          >
            Nhập từ vựng
          </a>{" "}
          trước nhé.
        </p>
      )}

      {!error && decks.length > 0 && <ReviewStoryList decks={decks} />}
    </main>
  );
}
