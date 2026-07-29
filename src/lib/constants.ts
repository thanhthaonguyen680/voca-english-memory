export const MAX_WORDS_PER_STORY = 30;
export const CHAT_AI_NAME = "Ran Ran";

export type Language = "en" | "zh";
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

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh";
}
