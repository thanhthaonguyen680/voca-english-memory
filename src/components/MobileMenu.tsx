"use client";

import { useState } from "react";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import StreakBadge from "@/components/StreakBadge";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type MobileMenuProps = {
  loggedIn: boolean;
  streakCurrent: number | null;
  studiedToday: boolean;
};

const LINKS = [
  { href: "/vocabulary", label: "Nhập từ vựng" },
  { href: "/review", label: "Ôn tập" },
  { href: "/chat", label: "Luyện nói" },
  { href: "/writing", label: "Luyện viết" },
  { href: "/grammar", label: "Ngữ pháp" },
  { href: "/history", label: "Lịch sử học" },
];

export default function MobileMenu({ loggedIn, streakCurrent, studiedToday }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-black hover:bg-black/5"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
            {loggedIn ? (
              <div className="flex flex-col gap-1">
                {streakCurrent !== null && (
                  <div className="mb-1 px-1">
                    <StreakBadge current={streakCurrent} studiedToday={studiedToday} />
                  </div>
                )}
                <div className="mb-1 flex items-center justify-between px-1">
                  <span className="text-xs text-neutral-400">Ngôn ngữ học</span>
                  <LanguageSwitcher />
                </div>
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-black hover:bg-emerald-50"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-1 border-t-2 border-black px-3 pt-2">
                  <SignOutButton />
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-full border-2 border-black bg-amber-300 px-3 py-2 text-center text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
