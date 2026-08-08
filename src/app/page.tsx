import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-black shadow-[3px_3px_0_0_#000]">
        <span aria-hidden>✨</span> Sản phẩm của sự kỷ luật
      </span>

      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-black bg-emerald-300 text-2xl font-bold text-black shadow-[4px_4px_0_0_#000]">
        V
      </span>

      <h1 className="text-4xl font-extrabold tracking-tight text-black sm:text-5xl">
        Học từ vựng
        <br />
        không còn nhàm chán
      </h1>
      <p className="mt-4 max-w-md text-neutral-600">
        Học từ vựng theo từng chủ đề, biến chúng thành câu chuyện của riêng bạn — áp dụng
        nguyên lý <span className="font-semibold text-black">Cung điện trí nhớ</span> mà các
        nhà vô địch trí nhớ vẫn dùng, để nhớ sâu, nhớ lâu và không bao giờ quên.
      </p>
      <Link
        href={user ? "/vocabulary" : "/login"}
        className="mt-8 rounded-full border-2 border-black bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-black shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
      >
        {user ? "Nhập từ vựng ngay →" : "Bắt đầu miễn phí →"}
      </Link>
    </main>
  );
}
