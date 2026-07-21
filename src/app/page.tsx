import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
      />

      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-2xl font-bold text-gray-900 shadow-sm">
        V
      </span>

      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Voca English Memory
      </h1>
      <p className="mt-3 max-w-md text-gray-400">
        Biến danh sách từ vựng của bạn thành những câu chuyện riêng, dễ nhớ và khó quên.
      </p>
      <Link
        href={user ? "/vocabulary" : "/login"}
        className="mt-8 rounded-lg bg-amber-400 px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-amber-300"
      >
        {user ? "Nhập từ vựng ngay" : "Bắt đầu"}
      </Link>
    </main>
  );
}
