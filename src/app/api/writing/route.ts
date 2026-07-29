import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STORY_MODEL } from "@/lib/gemini/client";
import { generateWithKeyPool } from "@/lib/gemini/pool";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/constants";

const MAX_WRITINGS_PER_DAY = Number(process.env.MAX_WRITINGS_PER_DAY ?? 10);

const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  zh: "Chinese (Mandarin)",
};

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
  const title = String(record.title ?? "").trim();
  const overview = String(record.overview ?? "").trim();
  const essayBody = String(record.body ?? "").trim();
  const conclusion = String(record.conclusion ?? "").trim();
  const language: Language = isLanguage(record.language) ? record.language : DEFAULT_LANGUAGE;

  if (!title || !essayBody) {
    return NextResponse.json(
      { error: "Vui lòng nhập ít nhất tiêu đề và phần thân bài." },
      { status: 400 },
    );
  }

  const { count, error: countError } = await supabase
    .from("writings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfTodayISO());

  if (countError) {
    return NextResponse.json(
      { error: "Không thể kiểm tra giới hạn sử dụng." },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= MAX_WRITINGS_PER_DAY) {
    return NextResponse.json(
      {
        error: `Bạn đã đạt giới hạn ${MAX_WRITINGS_PER_DAY} bài viết/ngày. Vui lòng quay lại vào ngày mai.`,
      },
      { status: 429 },
    );
  }

  const essayText = [
    `Title: ${title}`,
    overview && `Overview: ${overview}`,
    `Body: ${essayBody}`,
    conclusion && `Conclusion: ${conclusion}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const languageName = LANGUAGE_NAME[language];

  let feedback: string | null = null;
  try {
    const response = await generateWithKeyPool({
      model: STORY_MODEL,
      contents: `Here is a learner's essay:\n\n${essayText}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
        systemInstruction:
          `You are a friendly, encouraging ${languageName} writing coach helping a ` +
          "Vietnamese learner improve their essay writing. Reply in Vietnamese. Structure " +
          "your reply as: (1) 1-2 sentences genuinely encouraging about what they did well, " +
          "(2) up to 5 bullet points with the most important corrections, each showing the " +
          "original phrase and a corrected version with a short reason, (3) 1 closing " +
          "sentence suggesting one concrete thing to focus on next time. Keep it concise — " +
          "this is quick feedback, not a full rewrite of the essay.",
      },
    });

    feedback = response.text?.trim() || null;
  } catch (err) {
    console.error("Gemini writing feedback failed", err);
    // Feedback is a nice-to-have, not a hard requirement — still save the essay if it fails.
  }

  const { data: writing, error: insertError } = await supabase
    .from("writings")
    .insert({
      user_id: user.id,
      title,
      overview: overview || null,
      body: essayBody,
      conclusion: conclusion || null,
      feedback,
      language,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to save writing", insertError);
    return NextResponse.json({ error: "Không thể lưu bài viết." }, { status: 500 });
  }

  return NextResponse.json({ writing });
}
