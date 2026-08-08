import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStudyStreak } from "@/lib/streak";
import TopicList from "@/components/TopicList";
import type { Language } from "@/lib/constants";

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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const streak = await getStudyStreak(supabase, user.id);

  const [{ data: topics, error: topicsError }, { data: wordRows }] = await Promise.all([
    supabase
      .from("vocabulary_topics")
      .select("id, name, description, language, icon, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("vocabulary_entries")
      .select("topic_id")
      .eq("user_id", user.id)
      .not("topic_id", "is", null),
  ]);

  const wordCountByTopic = new Map<string, number>();
  for (const row of wordRows ?? []) {
    if (!row.topic_id) continue;
    wordCountByTopic.set(row.topic_id, (wordCountByTopic.get(row.topic_id) ?? 0) + 1);
  }

  const topicRows: TopicRow[] = (topics ?? []).map((topic) => ({
    id: topic.id,
    name: topic.name,
    description: topic.description,
    language: (topic.language as Language) ?? "en",
    icon: topic.icon || "📚",
    created_at: topic.created_at,
    wordCount: wordCountByTopic.get(topic.id) ?? 0,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-black">Nhập từ vựng</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Tạo chủ đề, thêm từ vựng vào đó (gõ tay hoặc chụp ảnh), rồi tạo câu chuyện từ toàn bộ
        từ trong chủ đề để giúp bạn ghi nhớ qua ngữ cảnh.
      </p>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-black bg-emerald-50 px-5 py-4 shadow-[4px_4px_0_0_#000]">
        <span className="text-2xl" aria-hidden>
          🔥
        </span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {streak.current > 0
              ? `Chuỗi học ${streak.current} ngày liên tiếp`
              : "Bắt đầu chuỗi học của bạn"}
          </p>
          <p className="text-xs text-emerald-700/80">
            {streak.studiedToday
              ? "Bạn đã học hôm nay — giữ vững phong độ nhé!"
              : streak.current > 0
                ? "Học hôm nay để tiếp tục chuỗi, đừng để mất!"
                : "Tạo 1 câu chuyện hôm nay để bắt đầu chuỗi học mỗi ngày."}
          </p>
        </div>
      </div>

      {topicsError && (
        <p className="text-sm text-red-600">Không thể tải danh sách chủ đề. Vui lòng thử lại.</p>
      )}

      {!topicsError && <TopicList initialTopics={topicRows} />}
    </main>
  );
}
