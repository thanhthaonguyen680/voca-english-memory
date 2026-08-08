"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { speak } from "@/lib/speech";
import { getSpeechRecognitionConstructor } from "@/lib/pronunciation";
import { CHAT_AI_NAME, LANGUAGES, SPEECH_LANG, type Language } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";

type Turn = { role: "user" | "model"; text: string };

type Scenario = {
  id: string;
  label: string;
  prompt: string;
  opening: Record<Language, string>;
};

const MAX_TEXTAREA_HEIGHT = 120;

const SCENARIOS: Scenario[] = [
  {
    id: "free",
    label: "Tự do trò chuyện",
    prompt: "",
    opening: {
      en: "Hi! What would you like to talk about today?",
      zh: "你好！你今天想聊什么？",
    },
  },
  {
    id: "cafe",
    label: "Quán cà phê",
    prompt: "The AI plays a barista at a coffee shop; the learner is a customer ordering.",
    opening: {
      en: "Hi there, welcome in! What can I get started for you today?",
      zh: "你好，欢迎光临！今天要点什么？",
    },
  },
  {
    id: "interview",
    label: "Phỏng vấn xin việc",
    prompt: "The AI plays a job interviewer; the learner is the candidate.",
    opening: {
      en: "Thanks for coming in today. Can you start by telling me a bit about yourself?",
      zh: "谢谢你今天过来面试。可以先自我介绍一下吗？",
    },
  },
  {
    id: "directions",
    label: "Hỏi đường",
    prompt: "The AI plays a stranger on the street; the learner is a tourist asking for directions.",
    opening: {
      en: "Hello! You look a little lost — can I help you find something?",
      zh: "你好！你看起来有点迷路，需要帮忙吗？",
    },
  },
  {
    id: "restaurant",
    label: "Nhà hàng",
    prompt: "The AI plays a waiter at a restaurant; the learner is a customer ordering food.",
    opening: {
      en: "Good evening! Welcome to our restaurant. Have you decided what you'd like to order?",
      zh: "晚上好！欢迎光临。您决定好要点什么了吗？",
    },
  },
];

export default function ChatSession() {
  const { language } = useLanguage();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function startScenario(chosen: Scenario) {
    const opening = chosen.opening[language];
    setScenario(chosen);
    setMessages([{ role: "model", text: opening }]);
    setError("");
    speak(opening, SPEECH_LANG[language]);
  }

  function endScenario() {
    setScenario(null);
    setMessages([]);
    setInput("");
    setError("");
  }

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function resetTextareaHeight() {
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  }

  function autoGrowTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  function handleMic() {
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setError("Trình duyệt không hỗ trợ nhận diện giọng nói.");
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = SPEECH_LANG[language];
    recognition.maxAlternatives = 1;
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      if (textareaRef.current) autoGrowTextarea(textareaRef.current);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !scenario) return;

    const nextMessages: Turn[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    resetTextareaHeight();
    setError("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, scenario: scenario.prompt, language }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      setMessages((prev) => [...prev, { role: "model", text: data.reply as string }]);
      speak(data.reply as string, SPEECH_LANG[language]);
      scrollToBottom();
    } catch {
      setError("Không thể kết nối tới server.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (!scenario) {
    return (
      <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_#000]">
        <p className="mb-4 text-sm text-neutral-600">
          Đang luyện nói bằng {LANGUAGES.find((item) => item.id === language)?.flag}{" "}
          {LANGUAGES.find((item) => item.id === language)?.label.toLowerCase()} — đổi ở góc
          trên. Chọn 1 chủ đề để bắt đầu trò chuyện:
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => startScenario(item)}
              className="rounded-lg border-2 border-black bg-white px-4 py-3 text-left text-sm font-medium text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#000]"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col rounded-2xl border-2 border-black bg-white p-4 shadow-[5px_5px_0_0_#000]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-800">
          {CHAT_AI_NAME} · {LANGUAGES.find((item) => item.id === language)?.flag} {scenario.label}
        </span>
        <button
          type="button"
          onClick={endScenario}
          className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          ← Đổi chủ đề
        </button>
      </div>

      <div className="mb-3 flex max-h-[50vh] min-h-[240px] flex-col gap-3 overflow-y-auto pr-1">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {msg.role === "model" && (
              <span className="mb-0.5 px-1 text-[11px] text-neutral-400">{CHAT_AI_NAME}</span>
            )}
            <div
              className={
                msg.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm border-2 border-black bg-emerald-300 px-3.5 py-2 text-sm text-black"
                  : "max-w-[80%] rounded-2xl rounded-bl-sm border-2 border-black bg-white px-3.5 py-2 text-sm text-black"
              }
            >
              {msg.text}
              {msg.role === "model" && (
                <button
                  type="button"
                  onClick={() => speak(msg.text, SPEECH_LANG[language])}
                  title="Nghe lại"
                  aria-label="Nghe lại"
                  className="ml-2 align-middle text-neutral-500 hover:text-black"
                >
                  🔊
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-xs text-neutral-400">{CHAT_AI_NAME} đang trả lời...</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
        className="flex items-end gap-2"
      >
        <button
          type="button"
          onClick={handleMic}
          disabled={listening}
          title="Nói câu trả lời"
          className={
            listening
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-red-300 text-black"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000]"
          }
        >
          🎤
        </button>
        <textarea
          ref={textareaRef}
          rows={2}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            autoGrowTextarea(event.target);
          }}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Đang nghe..." : "Nhập hoặc bấm mic để nói..."}
          className="min-w-0 flex-1 resize-none rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-base text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-11 shrink-0 rounded-full border-2 border-black bg-emerald-300 px-4 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
