import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { STORY_MODEL } from "@/lib/gemini/client";
import { generateWithKeyPool } from "@/lib/gemini/pool";
import { MAX_WORDS_PER_STORY, DEFAULT_LANGUAGE } from "@/lib/constants";
import type { Language } from "@/lib/types";
import { isLanguage } from "@/lib/utils/language";

const MAX_MEANING_FILLS_PER_DAY = Number(process.env.MAX_MEANING_FILLS_PER_DAY ?? 30);

const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  zh: "Chinese (Simplified, Hán tự)",
};

const FILL_MEANING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      description: "One entry per input word, in the same order.",
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaning: {
            type: Type.STRING,
            description: "A short, natural Vietnamese meaning for the word.",
          },
          type: {
            type: Type.STRING,
            description:
              "The word's most common part of speech, as a short abbreviation: n, v, adj, " +
              "adv, or phrase.",
          },
        },
        required: ["word", "meaning", "type"],
      },
    },
  },
  required: ["items"],
};

type FillResult = { items: { word: string; meaning: string; type: string }[] };

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
  const rawWords = Array.isArray(record.words) ? record.words : [];
  const words = rawWords
    .map((w) => String(w ?? "").trim())
    .filter((w) => w.length > 0)
    .slice(0, MAX_WORDS_PER_STORY);
  const language: Language = isLanguage(record.language) ? record.language : DEFAULT_LANGUAGE;

  if (words.length === 0) {
    return NextResponse.json({ error: "Thiếu từ vựng." }, { status: 400 });
  }

  const { count, error: countError } = await supabase
    .from("meaning_fills")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfTodayISO());

  if (countError) {
    return NextResponse.json({ error: "Không thể kiểm tra giới hạn sử dụng." }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_MEANING_FILLS_PER_DAY) {
    return NextResponse.json(
      {
        error: `Bạn đã đạt giới hạn ${MAX_MEANING_FILLS_PER_DAY} lượt tự động tạo nghĩa/ngày. Vui lòng quay lại vào ngày mai.`,
      },
      { status: 429 },
    );
  }

  const languageName = LANGUAGE_NAME[language];

  let result: FillResult;
  try {
    const response = await generateWithKeyPool({
      model: STORY_MODEL,
      contents: `${languageName} words:\n` + words.join("\n"),
      config: {
        temperature: 0.3,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
        responseSchema: FILL_MEANING_SCHEMA,
        systemInstruction:
          `For each ${languageName} word or phrase, give a short, natural Vietnamese meaning ` +
          "and its most common part of speech (n, v, adj, adv, or phrase). Reply in Vietnamese " +
          "for the meaning field.",
      },
    });

    result = JSON.parse(response.text ?? "");
  } catch (err) {
    console.error("Gemini fill-meaning failed", err);
    return NextResponse.json(
      { error: "Không thể tự động tạo nghĩa lúc này. Vui lòng thử lại sau." },
      { status: 502 },
    );
  }

  const { error: logError } = await supabase.from("meaning_fills").insert({ user_id: user.id });
  if (logError) {
    console.error("Failed to log meaning-fill usage", logError);
  }

  return NextResponse.json({ items: result.items ?? [] });
}
