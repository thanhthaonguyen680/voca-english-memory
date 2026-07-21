import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryList from "@/components/HistoryList";
import type { VocabularyItem } from "@/lib/supabase/types";

type StoryRow = {
  id: string;
  content: string;
  translation: string | null;
  vocabulary_used: VocabularyItem[];
  created_at: string;
};

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: stories, error } = await supabase
    .from("stories")
    .select("id, content, translation, vocabulary_used, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-white">Lịch sử học</h1>

      {error && (
        <p className="text-sm text-red-400">Không thể tải lịch sử học. Vui lòng thử lại.</p>
      )}

      {!error && <HistoryList initialStories={(stories as StoryRow[]) ?? []} />}
    </main>
  );
}
