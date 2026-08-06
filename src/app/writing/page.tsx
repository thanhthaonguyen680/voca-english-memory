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
          <h1 className="mb-1 text-2xl font-bold text-black">Luyện viết</h1>
          <p className="text-sm text-neutral-600">
            Viết theo cấu trúc Tiêu đề – Mở bài – Thân bài – Kết luận, Ran Ran sẽ nhận xét sau
            khi bạn nộp bài.
          </p>
        </div>
        <a
          href="/writing/history"
          className="shrink-0 text-sm font-medium text-emerald-700 underline hover:text-emerald-800"
        >
          Lịch sử →
        </a>
      </div>

      <WritingForm />
    </main>
  );
}
