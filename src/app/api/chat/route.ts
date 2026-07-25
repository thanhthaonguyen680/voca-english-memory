import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STORY_MODEL } from "@/lib/gemini/client";
import { generateWithKeyPool } from "@/lib/gemini/pool";
import { CHAT_AI_NAME } from "@/lib/constants";

const MAX_CHAT_MESSAGES_PER_DAY = Number(process.env.MAX_CHAT_MESSAGES_PER_DAY ?? 30);
const MAX_HISTORY_TURNS = 20;

type ChatTurn = { role: "user" | "model"; text: string };

function startOfTodayISO() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const rawMessages = Array.isArray((body as { messages?: unknown })?.messages)
    ? (body as { messages: unknown[] }).messages
    : [];
  const scenario = String((body as { scenario?: unknown })?.scenario ?? "").trim();

  const messages: ChatTurn[] = rawMessages
    .map((entry) => {
      const record = entry as { role?: unknown; text?: unknown };
      const role: "user" | "model" = record.role === "model" ? "model" : "user";
      return { role, text: String(record.text ?? "").trim() };
    })
    .filter((entry) => entry.text.length > 0)
    .slice(-MAX_HISTORY_TURNS);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Thiếu tin nhắn để gửi." }, { status: 400 });
  }

  const { count, error: countError } = await supabase
    .from("chat_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfTodayISO());

  if (countError) {
    return NextResponse.json(
      { error: "Không thể kiểm tra giới hạn sử dụng." },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= MAX_CHAT_MESSAGES_PER_DAY) {
    return NextResponse.json(
      {
        error: `Bạn đã đạt giới hạn ${MAX_CHAT_MESSAGES_PER_DAY} tin nhắn/ngày. Vui lòng quay lại vào ngày mai.`,
      },
      { status: 429 },
    );
  }

  // Best-effort: bias the conversation toward words the user is actually learning.
  const { data: vocabRows } = await supabase
    .from("vocabulary_entries")
    .select("word")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(15);
  const vocabWords = Array.from(new Set((vocabRows ?? []).map((row) => row.word))).slice(0, 10);

  const systemInstruction =
    `Your name is ${CHAT_AI_NAME}. You are a friendly English conversation partner helping ` +
    `a Vietnamese learner practice speaking English. If asked your name, say ${CHAT_AI_NAME}. ` +
    "Keep replies short and natural (1-3 sentences), like real spoken conversation, not an essay. " +
    "conversation, not an essay. Stay in character for the roleplay scenario given below, if " +
    "any. Gently keep the conversation going by asking a follow-up question. If the learner " +
    "writes in Vietnamese or makes a clear grammar mistake, briefly and kindly correct them " +
    "in English before continuing, without breaking the flow too much." +
    (scenario ? ` Roleplay scenario: ${scenario}.` : " No specific roleplay — free conversation.") +
    (vocabWords.length > 0
      ? ` When natural, try to reuse some of these words the learner is studying: ${vocabWords.join(", ")}.`
      : "");

  let reply: string;
  try {
    const response = await generateWithKeyPool({
      model: STORY_MODEL,
      contents: messages.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      config: {
        temperature: 0.9,
        maxOutputTokens: 300,
        systemInstruction,
      },
    });

    reply = response.text?.trim() ?? "";
  } catch (err) {
    console.error("Gemini chat failed", err);
    return NextResponse.json(
      { error: "Không thể trò chuyện lúc này. Vui lòng thử lại sau." },
      { status: 502 },
    );
  }

  if (!reply) {
    return NextResponse.json(
      { error: "Không thể trò chuyện lúc này. Vui lòng thử lại sau." },
      { status: 502 },
    );
  }

  const { error: logError } = await supabase.from("chat_logs").insert({ user_id: user.id });
  if (logError) {
    console.error("Failed to log chat usage", logError);
  }

  return NextResponse.json({ reply });
}
