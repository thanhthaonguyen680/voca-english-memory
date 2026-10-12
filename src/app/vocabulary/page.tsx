import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getStudyStreak } from "@/lib/utils/streak";
import TopicList from "@/components/TopicList";
import MethodsInfoButton from "@/components/MethodsInfoButton";
import type { Language } from "@/lib/types";

export type TopicRow = {
  id: string;
  name: string;
  description: string | null;
  language: Language;
  icon: string;
  created_at: string;
  wordCount: number;
};

export default async function VocabularyPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Guests can browse this page (see the empty state, read the intro, get familiar with the
  // app) without an account — they're only asked to log in once they actually try to create a
  // topic (see TopicList's onCreateClick guard below). Only a specific topic's own page
  // ("/vocabulary/[topicId]") requires auth, since that's where real per-user data lives.
  let streak = null;
  let topicRows: TopicRow[] = [];
  let topicsError = null;

  if (user) {
    // The word count comes back as an aggregate from the database (one small number per
    // topic) instead of downloading every word row just to count them here.
    const [currentStreak, { data: topics, error: fetchError }] = await Promise.all([
      getStudyStreak(user.id),
      supabase
        .from("vocabulary_topics")
        .select("id, name, description, language, icon, created_at, vocabulary_entries(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    streak = currentStreak;
    topicsError = fetchError;

    topicRows = (topics ?? []).map((topic) => ({
      id: topic.id,
      name: topic.name,
      description: topic.description,
      language: (topic.language as Language) ?? "en",
      icon: topic.icon || "📚",
      created_at: topic.created_at,
      wordCount: topic.vocabulary_entries[0]?.count ?? 0,
    }));
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-black">Nhập từ vựng</h1>
      <p className="mb-3 text-sm text-neutral-600">
        Gom từ vựng theo từng chủ đề, gõ tay hoặc chụp ảnh đều được. Rồi ôn lại bằng phương pháp{" "}
        <strong className="font-bold text-black">Memory Palace</strong> — dạo qua Cung điện trí nhớ
        để nhớ sâu và lâu hơn. Ngoài ra bạn còn có thể ôn tập 2 chiều Việt - Anh và luyện phát âm
        ngay trong từng chủ đề.
      </p>

      <MethodsInfoButton />

      {streak && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-black bg-violet-50 px-5 py-4 shadow-[4px_4px_0_0_#000]">
          <span className="text-2xl" aria-hidden>
            🔥
          </span>
          <div>
            <p className="text-sm font-semibold text-violet-800">
              {streak.current > 0
                ? `Chuỗi học ${streak.current} ngày liên tiếp`
                : "Bắt đầu chuỗi học của bạn"}
            </p>
            <p className="text-xs text-violet-700/80">
              {streak.studiedToday
                ? "Bạn đã học hôm nay — giữ vững phong độ nhé!"
                : streak.current > 0
                  ? "Học hôm nay để tiếp tục chuỗi, đừng để mất!"
                  : "Thêm từ vựng hoặc học Cung điện trí nhớ hôm nay để bắt đầu chuỗi."}
            </p>
          </div>
        </div>
      )}

      {topicsError && (
        <p className="text-sm text-red-600">Không thể tải danh sách chủ đề. Vui lòng thử lại.</p>
      )}

      {!topicsError && <TopicList initialTopics={topicRows} isLoggedIn={!!user} />}
    </main>
  );
}
