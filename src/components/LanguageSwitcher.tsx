"use client";

import { useState } from "react";
import { LANGUAGES } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((item) => item.id === language) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Chọn ngôn ngữ đang học"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
      >
        <span aria-hidden>{current.flag}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
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
          <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-800 p-1.5 shadow-lg">
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setLanguage(item.id);
                  setOpen(false);
                }}
                className={
                  item.id === language
                    ? "flex w-full items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300"
                    : "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                }
              >
                <span aria-hidden>{item.flag}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
