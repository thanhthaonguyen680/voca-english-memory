import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WritingForm from "@/components/WritingForm";

export default async function WritingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-white">Luyện viết</h1>
          <p className="text-sm text-slate-400">
            Viết theo cấu trúc Tiêu đề – Mở bài – Thân bài – Kết luận, AI sẽ nhận xét sau khi
            bạn nộp bài.
          </p>
        </div>
        <a
          href="/writing/history"
          className="shrink-0 text-sm font-medium text-amber-400 underline hover:text-amber-300"
        >
          Lịch sử →
        </a>
      </div>

      <WritingForm />
    </main>
  );
}
