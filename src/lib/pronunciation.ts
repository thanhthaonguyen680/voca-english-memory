type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResultList = {
  [index: number]: { [index: number]: SpeechRecognitionAlternative };
};
type SpeechRecognitionEventLike = { results: SpeechRecognitionResultList };

interface MinimalSpeechRecognition {
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => MinimalSpeechRecognition;

// Not part of TypeScript's DOM lib (non-standard API) — declared manually instead of
// pulling in an extra @types package for a handful of fields.
export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function normalizeForCompare(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}
