"use client";

import { useState } from "react";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import StreakBadge from "@/components/StreakBadge";

type MobileMenuProps = {
  loggedIn: boolean;
  streakCurrent: number | null;
  studiedToday: boolean;
};

const LINKS = [
  { href: "/vocabulary", label: "Nhập từ vựng" },
  { href: "/review", label: "Ôn tập" },
  { href: "/history", label: "Lịch sử học" },
  { href: "/settings", label: "Cài đặt" },
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
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800"
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
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-lg">
            {loggedIn ? (
              <div className="flex flex-col gap-1">
                {streakCurrent !== null && (
                  <div className="mb-1 px-1">
                    <StreakBadge current={streakCurrent} studiedToday={studiedToday} />
                  </div>
                )}
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-1 border-t border-slate-700 px-3 pt-2">
                  <SignOutButton />
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg bg-amber-400 px-3 py-2 text-center text-sm font-medium text-slate-900 hover:bg-amber-300"
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
