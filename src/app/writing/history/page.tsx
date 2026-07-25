import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WritingHistoryList from "@/components/WritingHistoryList";

export default async function WritingHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: writings, error } = await supabase
    .from("writings")
    .select("id, title, overview, body, conclusion, feedback, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Lịch sử viết</h1>
        <a
          href="/writing"
          className="text-sm font-medium text-amber-400 underline hover:text-amber-300"
        >
          + Viết bài mới
        </a>
      </div>

      {error && (
        <p className="text-sm text-red-400">Không thể tải lịch sử viết. Vui lòng thử lại.</p>
      )}

      {!error && <WritingHistoryList initialWritings={writings ?? []} />}
    </main>
  );
}
