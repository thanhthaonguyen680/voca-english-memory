import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { STORY_MODEL } from "@/lib/gemini/client";
import { generateWithKeyPool } from "@/lib/gemini/pool";
import { MAX_WORDS_PER_STORY, DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/constants";

const MAX_VOCAB_SCANS_PER_DAY = Number(process.env.MAX_VOCAB_SCANS_PER_DAY ?? 10);
// Base64 length ≈ raw bytes × 4/3 — this keeps the raw image under ~4.5MB, comfortably below
// Vercel's serverless request body limit.
const MAX_IMAGE_BASE64_LENGTH = 6_000_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  zh: "Chinese (Simplified, Hán tự)",
};

const SCAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    words: {
      type: Type.ARRAY,
      description: "Every distinct vocabulary word/phrase found in the image.",
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaning: {
            type: Type.STRING,
            description:
              "The Vietnamese meaning, ONLY if it is also clearly written next to the word " +
              "in the image itself. Empty string if no meaning is visible — never invent one.",
          },
        },
        required: ["word", "meaning"],
      },
    },
  },
  required: ["words"],
};

type ScanResult = { words: { word: string; meaning: string }[] };

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
  const imageBase64 = String(record.imageBase64 ?? "");
  const mimeType = String(record.mimeType ?? "");
  const rawLanguage = record.language;
  const language: Language = isLanguage(rawLanguage) ? rawLanguage : DEFAULT_LANGUAGE;

  if (!imageBase64 || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "Vui lòng chọn 1 ảnh (JPEG, PNG hoặc WebP)." }, { status: 400 });
  }

  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn hoặc chụp lại ở độ phân giải thấp hơn." },
      { status: 400 },
    );
  }

  const { count, error: countError } = await supabase
    .from("vocab_scans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfTodayISO());

  if (countError) {
    return NextResponse.json(
      { error: "Không thể kiểm tra giới hạn sử dụng." },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= MAX_VOCAB_SCANS_PER_DAY) {
    return NextResponse.json(
      {
        error: `Bạn đã đạt giới hạn ${MAX_VOCAB_SCANS_PER_DAY} lượt quét ảnh/ngày. Vui lòng quay lại vào ngày mai.`,
      },
      { status: 429 },
    );
  }

  const languageName = LANGUAGE_NAME[language];

  let result: ScanResult;
  try {
    const response = await generateWithKeyPool({
      model: STORY_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `Look at this image (a photo of a notebook, textbook, flashcards, or a ` +
                `written list). Extract every distinct ${languageName} vocabulary word or ` +
                "short phrase visible in it that a language learner would want to study. " +
                "Ignore unrelated text such as page numbers, dates, or sentences that aren't " +
                "vocabulary entries. If a Vietnamese meaning is also clearly written right " +
                `next to a word, include it — otherwise leave meaning as an empty string, ` +
                `never guess one. Return at most ${MAX_WORDS_PER_STORY} words.`,
            },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
        responseSchema: SCAN_RESPONSE_SCHEMA,
      },
    });

    result = JSON.parse(response.text ?? "");
  } catch (err) {
    console.error("Gemini scan vocabulary failed", err);
    return NextResponse.json(
      { error: "Không thể quét ảnh lúc này. Vui lòng thử lại sau." },
      { status: 502 },
    );
  }

  const words = (result.words ?? [])
    .map((entry) => ({
      word: String(entry.word ?? "").trim(),
      meaning: String(entry.meaning ?? "").trim() || undefined,
    }))
    .filter((entry) => entry.word.length > 0)
    .slice(0, MAX_WORDS_PER_STORY);

  if (words.length === 0) {
    return NextResponse.json(
      { error: "Không tìm thấy từ vựng nào trong ảnh. Vui lòng thử ảnh khác rõ nét hơn." },
      { status: 422 },
    );
  }

  const { error: logError } = await supabase.from("vocab_scans").insert({ user_id: user.id });
  if (logError) {
    console.error("Failed to log vocab scan usage", logError);
  }

  return NextResponse.json({ words });
}
