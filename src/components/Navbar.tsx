import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudyStreak } from "@/lib/streak";
import SignOutButton from "@/components/SignOutButton";
import StreakBadge from "@/components/StreakBadge";
import MobileMenu from "@/components/MobileMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const streak = user ? await getStudyStreak(supabase, user.id) : null;

  return (
    <header className="relative z-30 border-b-2 border-black bg-[#FAF7F0]/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-black bg-emerald-300 text-sm font-bold text-black">
            V
          </span>
          <span className="text-sm font-semibold text-black">Voca English Memory</span>
        </Link>

        <div className="hidden items-center gap-5 text-sm sm:flex">
          {user ? (
            <>
              {streak && <StreakBadge current={streak.current} studiedToday={streak.studiedToday} />}
              <Link href="/vocabulary" className="text-neutral-600 hover:text-black">
                Nhập từ vựng
              </Link>
              <Link href="/review" className="text-neutral-600 hover:text-black">
                Ôn tập
              </Link>
              <Link href="/chat" className="text-neutral-600 hover:text-black">
                Luyện nói
              </Link>
              <Link href="/writing" className="text-neutral-600 hover:text-black">
                Luyện viết
              </Link>
              <Link href="/grammar" className="text-neutral-600 hover:text-black">
                Ngữ pháp
              </Link>
              <Link href="/history" className="text-neutral-600 hover:text-black">
                Lịch sử học
              </Link>
              <LanguageSwitcher />
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border-2 border-black bg-emerald-300 px-3.5 py-1.5 font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
            >
              Đăng nhập
            </Link>
          )}
        </div>

        <div className="sm:hidden">
          <MobileMenu
            loggedIn={Boolean(user)}
            streakCurrent={streak?.current ?? null}
            studiedToday={streak?.studiedToday ?? false}
          />
        </div>
      </nav>
    </header>
  );
}
