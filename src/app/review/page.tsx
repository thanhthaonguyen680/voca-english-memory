import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewSession from "@/components/ReviewSession";

export default async function ReviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: entries, error } = await supabase
    .from("vocabulary_entries")
    .select("word, meaning, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Dedupe by word (case-insensitive); skip words that never got a meaning saved,
  // since both quiz directions need one to be checkable.
  const pool = new Map<string, { word: string; meaning: string }>();
  for (const entry of entries ?? []) {
    const key = entry.word.trim().toLowerCase();
    if (pool.has(key) || !entry.meaning) continue;
    pool.set(key, { word: entry.word.trim(), meaning: entry.meaning.trim() });
  }
  const words = Array.from(pool.values());

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-white">Ôn tập từ vựng</h1>
      <p className="mb-6 text-sm text-gray-400">
        Kiểm tra trí nhớ 2 chiều: nhìn từ tiếng Anh đoán nghĩa, hoặc nhìn nghĩa đoán từ tiếng
        Anh. Có thể luyện phát âm bằng giọng của bạn.
      </p>

      {error && (
        <p className="text-sm text-red-400">Không thể tải danh sách từ vựng. Vui lòng thử lại.</p>
      )}

      {!error && words.length === 0 && (
        <p className="text-sm text-gray-400">
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

      {!error && words.length > 0 && <ReviewSession words={words} />}
    </main>
  );
}
