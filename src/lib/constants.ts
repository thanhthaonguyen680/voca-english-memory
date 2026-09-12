import type { Language } from "@/lib/types";

// Max words handled in one AI batch (scan / fill-meaning / Memory Palace generation). Named
// for its original use (per-story cap); kept as-is since it's imported in several routes.
export const MAX_WORDS_PER_STORY = 30;
export const CHAT_AI_NAME = "Ran Ran";

export const DEFAULT_LANGUAGE: Language = "en";

export const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: "en", label: "Tiếng Anh", flag: "🇬🇧" },
  { id: "zh", label: "Tiếng Trung", flag: "🇨🇳" },
];

// BCP-47 codes for the Web Speech API (speechSynthesis / SpeechRecognition).
export const SPEECH_LANG: Record<Language, string> = {
  en: "en-US",
  zh: "zh-CN",
};
