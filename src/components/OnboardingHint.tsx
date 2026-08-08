"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "voca:onboarding-seen";

function hasSeenOnboarding() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

// A one-time spotlight tooltip pointing at a specific action for first-time visitors — dashed
// highlight ring around the target + a callout bubble below it. Persisted per-browser in
// localStorage (same reasoning as the language toggle: a personal "have I seen this" flag,
// not account data). Dismisses permanently on: the ✕ button, "Bỏ qua hướng dẫn", or simply
// clicking the highlighted target itself (using the hint is as good as reading it).
export default function OnboardingHint({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so the first render always hides the hint and
    // this effect corrects it once the client mounts — a one-time hydration read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasSeenOnboarding()) setVisible(true);
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return <>{children}</>;

  return (
    <div className="relative inline-block">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-2 rounded-2xl border-4 border-dashed border-emerald-400"
      />
      <div onClickCapture={dismiss}>{children}</div>

      <div className="absolute left-1/2 top-full z-30 mt-4 w-72 -translate-x-1/2 rounded-2xl border-2 border-black bg-amber-200 p-4 shadow-[4px_4px_0_0_#000]">
        <span className="absolute -top-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-black bg-amber-200" />
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-black">{title}</p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Đóng hướng dẫn"
            className="shrink-0 text-black/50 hover:text-black"
          >
            ✕
          </button>
        </div>
        <p className="mt-1.5 text-sm text-black/80">{description}</p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 text-xs font-bold uppercase tracking-wide text-black hover:underline"
        >
          Bỏ qua hướng dẫn →
        </button>
      </div>
    </div>
  );
}

