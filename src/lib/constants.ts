import type { Language } from "@/lib/types";

// Max words handled in one AI call (scan / fill-meaning / Memory Palace generation).
export const MAX_WORDS_PER_BATCH = 30;

// Part-of-speech abbreviations offered in the add-word and edit-word forms. The AI routes
// (scan, fill-meaning, Memory Palace) ask Gemini for this same set — keep the prompts in sync.
export const WORD_TYPES = ["n", "v", "adj", "adv", "phrase"];

export const DEFAULT_LANGUAGE: Language = "en";

// How a word's pronunciation should be written, per language — interpolated into AI prompts.
// The result is stored in `vocabulary_entries.ipa` either way (see rule.md).
export const PRONUNCIATION_HINT: Record<Language, string> = {
  en: "IPA transcription, e.g. /wɜːrd/",
  zh: "Pinyin romanization with tone marks, e.g. nǐ hǎo",
};

export const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: "en", label: "Tiếng Anh", flag: "🇬🇧" },
  { id: "zh", label: "Tiếng Trung", flag: "🇨🇳" },
];

// BCP-47 codes for the Web Speech API (speechSynthesis / SpeechRecognition).
export const SPEECH_LANG: Record<Language, string> = {
  en: "en-US",
  zh: "zh-CN",
};
