import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GrammarTenseList from "@/components/GrammarTenseList";

export default async function GrammarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-black">Ngữ pháp</h1>
      <p className="mb-6 text-sm text-neutral-600">
        12 thì trong tiếng Anh: cấu trúc, cách dùng, cách đặt câu hỏi và trả lời. Bấm vào từng
        thì để xem chi tiết, hoặc luyện tập ngay bằng bài trắc nghiệm.
      </p>

      <GrammarTenseList />
    </main>
  );
}
