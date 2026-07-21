import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudyStreak } from "@/lib/streak";
import SignOutButton from "@/components/SignOutButton";
import StreakBadge from "@/components/StreakBadge";
import MobileMenu from "@/components/MobileMenu";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const streak = user ? await getStudyStreak(supabase, user.id) : null;

  return (
    <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-sm font-bold text-gray-900">
            V
          </span>
          <span className="text-sm font-semibold text-white">Voca English Memory</span>
        </Link>

        <div className="hidden items-center gap-5 text-sm sm:flex">
          {user ? (
            <>
              {streak && <StreakBadge current={streak.current} studiedToday={streak.studiedToday} />}
              <Link href="/vocabulary" className="text-gray-400 hover:text-white">
                Nhập từ vựng
              </Link>
              <Link href="/review" className="text-gray-400 hover:text-white">
                Ôn tập
              </Link>
              <Link href="/history" className="text-gray-400 hover:text-white">
                Lịch sử học
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-amber-400 px-3.5 py-1.5 font-medium text-gray-900 hover:bg-amber-300"
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
