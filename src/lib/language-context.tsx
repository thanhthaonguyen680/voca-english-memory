"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/constants";

const STORAGE_KEY = "voca:language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

// App-wide "which language am I learning right now" toggle, switched from the navbar and
// read by every page that generates or speaks content (vocabulary, chat, writing). Persisted
// per-browser in localStorage — this is a personal preference, not account data, so there's
// no need for a DB column or extra round-trip just to remember it.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    // localStorage isn't available during SSR, so the first render always uses the default
    // and this effect corrects it once the client mounts — a one-time hydration read, not a
    // derived-state loop.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLanguage(stored)) setLanguageState(stored);
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
