import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { gemini, STORY_MODEL } from "@/lib/gemini/client";
import { MAX_WORDS_PER_STORY } from "@/lib/constants";
import { decrypt } from "@/lib/crypto";
import type { VocabularyItem } from "@/lib/supabase/types";

const STORY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    story: {
      type: Type.STRING,
      description:
        "The English story. Wrap each vocabulary word in **bold** markdown the first " +
        "time it appears.",
    },
    translation: {
      type: Type.STRING,
      description: "A natural Vietnamese translation of the whole story.",
    },
    words: {
      type: Type.ARRAY,
      description: "One entry per input vocabulary word, in the same order.",
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          ipa: {
            type: Type.STRING,
            description: "IPA phonetic transcription, e.g. /əˈpæl/",
          },
          meaning: {
            type: Type.STRING,
            description: "A short Vietnamese meaning/translation of the word.",
          },
        },
        required: ["word", "ipa", "meaning"],
      },
    },
  },
  required: ["story", "translation", "words"],
};

type StoryGenerationResult = {
  story: string;
  translation: string;
  words: { word: string; ipa: string; meaning: string }[];
};

const MAX_STORIES_PER_DAY = Number(process.env.MAX_STORIES_PER_DAY ?? 10);

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

  const rawWords = Array.isArray((body as { words?: unknown })?.words)
    ? ((body as { words: unknown[] }).words)
    : [];

  const words: VocabularyItem[] = rawWords
    .map((entry) => {
      const record = entry as { word?: unknown; meaning?: unknown };
      return {
        word: String(record.word ?? "").trim(),
        meaning: record.meaning ? String(record.meaning).trim() : undefined,
      };
    })
    .filter((entry) => entry.word.length > 0)
    .slice(0, MAX_WORDS_PER_STORY);

  if (words.length === 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập ít nhất 1 từ vựng." },
      { status: 400 },
    );
  }

  // A user's own Gemini key uses their own quota — only rate-limit the shared server key.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("gemini_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  let geminiClient = gemini;
  if (settings?.gemini_api_key) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: decrypt(settings.gemini_api_key) });
    } catch (err) {
      console.error("Failed to decrypt stored Gemini API key", err);
    }
  }
  const usesOwnKey = geminiClient !== gemini;

  if (!usesOwnKey) {
    const { count, error: countError } = await supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfTodayISO());

    if (countError) {
      return NextResponse.json(
        { error: "Không thể kiểm tra giới hạn sử dụng." },
        { status: 500 },
      );
    }

    if ((count ?? 0) >= MAX_STORIES_PER_DAY) {
      return NextResponse.json(
        {
          error:
            `Bạn đã đạt giới hạn ${MAX_STORIES_PER_DAY} câu chuyện/ngày. Vui lòng quay lại ` +
            "vào ngày mai, hoặc thêm API key riêng ở trang Cài đặt để không bị giới hạn.",
        },
        { status: 429 },
      );
    }
  }

  const wordList = words
    .map((entry) => (entry.meaning ? `${entry.word} (${entry.meaning})` : entry.word))
    .join(", ");

  // Scale story length to the word count instead of a fixed range — a handful of words
  // in a 100-200 word story reads as padded and rambling.
  const minWords = Math.max(40, words.length * 12);
  const maxWords = Math.max(90, words.length * 20);

  let result: StoryGenerationResult;
  try {
    const response = await geminiClient.models.generateContent({
      model: STORY_MODEL,
      contents: `Write a short story using these vocabulary words: ${wordList}`,
      config: {
        temperature: 0.9,
        maxOutputTokens: 2500,
        responseMimeType: "application/json",
        responseSchema: STORY_RESPONSE_SCHEMA,
        systemInstruction:
          "You are a creative English teacher. Write a story in English that is simple and " +
          `easy to understand, between ${minWords} and ${maxWords} words long, that ` +
          "naturally fits ALL of the given vocabulary words in context so a learner can " +
          "remember them through the story. Don't pad the story past that length. Vary the " +
          "setting, characters, and plot each time so repeated requests don't feel like a " +
          "continuation of a previous story. Also provide a natural Vietnamese translation " +
          "of the story, the IPA phonetic transcription for each vocabulary word, and a " +
          "short Vietnamese meaning for each vocabulary word.",
      },
    });

    result = JSON.parse(response.text ?? "");
  } catch (err) {
    console.error("Gemini generate story failed", err);
    return NextResponse.json(
      {
        error: usesOwnKey
          ? "Không thể tạo câu chuyện với API key riêng của bạn. Vui lòng kiểm tra lại key ở " +
            "trang Cài đặt."
          : "Không thể tạo câu chuyện lúc này. Vui lòng thử lại sau.",
      },
      { status: 502 },
    );
  }

  const content = result.story?.trim();
  if (!content) {
    return NextResponse.json(
      { error: "Không thể tạo câu chuyện lúc này. Vui lòng thử lại sau." },
      { status: 502 },
    );
  }

  const aiByWord = new Map(
    (result.words ?? []).map((entry) => [entry.word.toLowerCase(), entry]),
  );
  // A user-entered meaning always wins; AI fills in the gaps so every word has one.
  const enrichedWords: VocabularyItem[] = words.map((entry) => {
    const ai = aiByWord.get(entry.word.toLowerCase());
    return {
      ...entry,
      ipa: ai?.ipa,
      meaning: entry.meaning || ai?.meaning,
    };
  });

  const { data: story, error: insertError } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      content,
      translation: result.translation?.trim() || null,
      vocabulary_used: enrichedWords,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to save story", insertError);
    return NextResponse.json({ error: "Không thể lưu câu chuyện." }, { status: 500 });
  }

  // Best-effort: keep a record of the words the user has studied.
  const { error: vocabError } = await supabase.from("vocabulary_entries").insert(
    enrichedWords.map((entry) => ({
      user_id: user.id,
      word: entry.word,
      meaning: entry.meaning ?? null,
    })),
  );
  if (vocabError) {
    console.error("Failed to save vocabulary entries", vocabError);
  }

  return NextResponse.json({ story });
}
