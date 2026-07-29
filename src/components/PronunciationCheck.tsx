"use client";

import { useState } from "react";
import { getSpeechRecognitionConstructor, normalizeForCompare } from "@/lib/pronunciation";

type Status = "idle" | "listening" | "correct" | "incorrect" | "unsupported";

type PronunciationCheckProps = {
  word: string;
  lang?: string;
  onResult?: (correct: boolean) => void;
};

export default function PronunciationCheck({
  word,
  lang = "en-US",
  onResult,
}: PronunciationCheckProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [heard, setHeard] = useState("");

  function handleClick() {
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setStatus("unsupported");
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = lang;
    recognition.maxAlternatives = 1;
    setStatus("listening");
    setHeard("");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setHeard(transcript);
      const correct = normalizeForCompare(transcript) === normalizeForCompare(word);
      setStatus(correct ? "correct" : "incorrect");
      onResult?.(correct);
    };
    recognition.onerror = () => setStatus("idle");
    recognition.onend = () => {
      setStatus((prev) => (prev === "listening" ? "idle" : prev));
    };

    recognition.start();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "listening"}
        title="Kiểm tra phát âm bằng giọng của bạn"
        className={
          status === "listening"
            ? "rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-400"
            : "rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-600"
        }
      >
        {status === "listening" ? "🎙️ Đang nghe..." : "🎤 Kiểm tra phát âm"}
      </button>
      {status === "correct" && (
        <span className="text-xs font-medium text-green-400">✅ Đúng rồi!</span>
      )}
      {status === "incorrect" && (
        <span className="text-xs font-medium text-red-400">❌ Nghe thành &ldquo;{heard}&rdquo;</span>
      )}
      {status === "unsupported" && (
        <span className="text-xs text-slate-500">Trình duyệt không hỗ trợ nhận diện giọng nói</span>
      )}
    </div>
  );
}
