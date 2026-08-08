import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryList from "@/components/HistoryList";
import type { Language } from "@/lib/constants";
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

export type TopicOption = { id: string; name: string; icon: string };

export default async function HistoryPage() {
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
      .select("id, content, translation, vocabulary_used, language, topic_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("vocabulary_topics")
      .select("id, name, icon")
      .eq("user_id", user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-black">Lịch sử học</h1>

      {error && (
        <p className="text-sm text-red-600">Không thể tải lịch sử học. Vui lòng thử lại.</p>
      )}

      {!error && (
        <HistoryList
          initialStories={(stories as StoryRow[]) ?? []}
          topics={(topics as TopicOption[]) ?? []}
        />
      )}
    </main>
  );
}
