"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { speak } from "@/lib/speech";
import { getSpeechRecognitionConstructor } from "@/lib/pronunciation";
import { CHAT_AI_NAME } from "@/lib/constants";

type Turn = { role: "user" | "model"; text: string };

type Scenario = {
  id: string;
  label: string;
  prompt: string;
  opening: string;
};

const MAX_TEXTAREA_HEIGHT = 120;

const SCENARIOS: Scenario[] = [
  {
    id: "free",
    label: "Tự do trò chuyện",
    prompt: "",
    opening: "Hi! What would you like to talk about today?",
  },
  {
    id: "cafe",
    label: "Quán cà phê",
    prompt: "The AI plays a barista at a coffee shop; the learner is a customer ordering.",
    opening: "Hi there, welcome in! What can I get started for you today?",
  },
  {
    id: "interview",
    label: "Phỏng vấn xin việc",
    prompt: "The AI plays a job interviewer; the learner is the candidate.",
    opening: "Thanks for coming in today. Can you start by telling me a bit about yourself?",
  },
  {
    id: "directions",
    label: "Hỏi đường",
    prompt: "The AI plays a stranger on the street; the learner is a tourist asking for directions.",
    opening: "Hello! You look a little lost — can I help you find something?",
  },
  {
    id: "restaurant",
    label: "Nhà hàng",
    prompt: "The AI plays a waiter at a restaurant; the learner is a customer ordering food.",
    opening: "Good evening! Welcome to our restaurant. Have you decided what you'd like to order?",
  },
];

export default function ChatSession() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function startScenario(chosen: Scenario) {
    setScenario(chosen);
    setMessages([{ role: "model", text: chosen.opening }]);
    setError("");
    speak(chosen.opening);
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
    recognition.lang = "en-US";
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
        body: JSON.stringify({ messages: nextMessages, scenario: scenario.prompt }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      setMessages((prev) => [...prev, { role: "model", text: data.reply as string }]);
      speak(data.reply as string);
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
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
        <p className="mb-4 text-sm text-slate-400">Chọn 1 chủ đề để bắt đầu trò chuyện:</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => startScenario(item)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-medium text-white hover:border-amber-400"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-amber-400">
          {CHAT_AI_NAME} · {scenario.label}
        </span>
        <button
          type="button"
          onClick={endScenario}
          className="text-xs text-slate-400 hover:text-white"
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
              <span className="mb-0.5 px-1 text-[11px] text-slate-500">{CHAT_AI_NAME}</span>
            )}
            <div
              className={
                msg.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-amber-400 px-3.5 py-2 text-sm text-slate-900"
                  : "max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-700 px-3.5 py-2 text-sm text-white"
              }
            >
              {msg.text}
              {msg.role === "model" && (
                <button
                  type="button"
                  onClick={() => speak(msg.text)}
                  title="Nghe lại"
                  aria-label="Nghe lại"
                  className="ml-2 align-middle text-slate-300 hover:text-white"
                >
                  🔊
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-xs text-slate-500">{CHAT_AI_NAME} đang trả lời...</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

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
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600"
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
          className="min-w-0 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-base text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-11 shrink-0 rounded-lg bg-amber-400 px-4 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
