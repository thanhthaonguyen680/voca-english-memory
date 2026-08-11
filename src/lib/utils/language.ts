import type { Language } from "@/lib/types";

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh";
}
