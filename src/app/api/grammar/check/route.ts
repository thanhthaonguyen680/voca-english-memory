import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { STORY_MODEL } from "@/lib/gemini/client";
import { generateWithKeyPool } from "@/lib/gemini/pool";
import { TENSES, type TenseId } from "@/lib/grammar-data";

const MAX_GRAMMAR_CHECKS_PER_DAY = Number(process.env.MAX_GRAMMAR_CHECKS_PER_DAY ?? 20);

const CHECK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    correct: {
      type: Type.BOOLEAN,
      description:
        "True only if the sentence is grammatically correct, uses the target tense " +
        "correctly, and matches the meaning of the Vietnamese sentence.",
    },
    feedback: {
      type: Type.STRING,
      description:
        "1-2 short sentences in Vietnamese explaining what's right or wrong, focused on the " +
        "target tense specifically.",
    },
    correctedSentence: {
      type: Type.STRING,
      description: "A correct English sentence using the target tense for this meaning.",
    },
  },
  required: ["correct", "feedback", "correctedSentence"],
};

type CheckResult = { correct: boolean; feedback: string; correctedSentence: string };

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

  const record = body as Record<string, unknown>;
  const vi = String(record.vi ?? "").trim();
  const answer = String(record.answer ?? "").trim();
  const tenseId = String(record.tenseId ?? "") as TenseId;
  const tense = TENSES.find((t) => t.id === tenseId);

  if (!vi || !answer || !tense) {
    return NextResponse.json({ error: "Thiếu dữ liệu câu cần dịch hoặc câu trả lời." }, { status: 400 });
  }

  const { count, error: countError } = await supabase
    .from("grammar_checks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfTodayISO());

  if (countError) {
    return NextResponse.json(
      { error: "Không thể kiểm tra giới hạn sử dụng." },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= MAX_GRAMMAR_CHECKS_PER_DAY) {
    return NextResponse.json(
      {
        error: `Bạn đã đạt giới hạn ${MAX_GRAMMAR_CHECKS_PER_DAY} lượt chấm bài/ngày. Vui lòng quay lại vào ngày mai.`,
      },
      { status: 429 },
    );
  }

  let result: CheckResult;
  try {
    const response = await generateWithKeyPool({
      model: STORY_MODEL,
      contents:
        `Vietnamese sentence: "${vi}"\n` +
        `Target tense: ${tense.nameEn}\n` +
        `Learner's English translation: "${answer}"`,
      config: {
        temperature: 0.2,
        maxOutputTokens: 300,
        responseMimeType: "application/json",
        responseSchema: CHECK_RESPONSE_SCHEMA,
        systemInstruction:
          "You are a strict but encouraging English grammar teacher grading a Vietnamese " +
          `learner's attempt to translate a sentence into English using the ${tense.nameEn} ` +
          "tense specifically. Judge whether the learner's sentence is grammatically correct, " +
          "correctly uses the target tense (not just any correct tense), and preserves the " +
          "meaning of the Vietnamese sentence. Minor spelling/capitalization slips don't count " +
          "as wrong if the grammar and tense are correct. Reply with the structured fields.",
      },
    });

    result = JSON.parse(response.text ?? "");
  } catch (err) {
    console.error("Gemini grammar check failed", err);
    return NextResponse.json(
      { error: "Không thể chấm điểm lúc này. Vui lòng thử lại sau." },
      { status: 502 },
    );
  }

  const { error: logError } = await supabase.from("grammar_checks").insert({ user_id: user.id });
  if (logError) {
    console.error("Failed to log grammar check usage", logError);
  }

  return NextResponse.json({
    correct: Boolean(result.correct),
    feedback: String(result.feedback ?? ""),
    correctedSentence: String(result.correctedSentence ?? ""),
  });
}
