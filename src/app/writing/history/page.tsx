import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import WritingHistoryList from "@/components/WritingHistoryList";

export default async function WritingHistoryPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  if (!user) {
    redirect("/login");
  }

  const { data: writings, error } = await supabase
    .from("writings")
    .select("id, title, overview, body, conclusion, feedback, language, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-black">Lịch sử viết</h1>
        <Link
          href="/writing"
          className="text-sm font-medium text-violet-700 underline hover:text-violet-800"
        >
          + Viết bài mới
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600">Không thể tải lịch sử viết. Vui lòng thử lại.</p>
      )}

      {!error && <WritingHistoryList initialWritings={writings ?? []} />}
    </main>
  );
}
