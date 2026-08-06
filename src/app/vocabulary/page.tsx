import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStudyStreak } from "@/lib/streak";
import VocabularyForm from "@/components/VocabularyForm";

export default async function VocabularyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const streak = await getStudyStreak(supabase, user.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-black">Nhập từ vựng</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Nhập các từ vựng bạn muốn học, Ran Ran sẽ tạo một câu chuyện ngắn để giúp bạn ghi nhớ
        qua ngữ cảnh.
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

      <VocabularyForm />
    </main>
  );
}
