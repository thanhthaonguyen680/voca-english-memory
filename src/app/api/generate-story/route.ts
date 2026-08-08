import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { STORY_MODEL } from "@/lib/gemini/client";
import { generateWithKeyPool } from "@/lib/gemini/pool";
import { MAX_WORDS_PER_STORY, DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/constants";
import type { VocabularyItem } from "@/lib/supabase/types";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  zh: "Chinese (Simplified)",
};

// The schema's shape stays the same across languages (both need story/translation/per-word
// phonetic+meaning) — only the "ipa" field's meaning changes: IPA for English, Pinyin with
// tone marks for Chinese. Reusing the field name avoids touching every place that reads it.
function buildStoryResponseSchema(language: Language) {
  return {
    type: Type.OBJECT,
    properties: {
      story: {
        type: Type.STRING,
        description:
          `The ${LANGUAGE_NAME[language]} story. Wrap each vocabulary word in **bold** ` +
          "markdown the first time it appears.",
      },
      translation: {
        type: Type.STRING,
        description:
          "A natural Vietnamese translation of the whole story. Wrap the Vietnamese words/" +
          "phrases that correspond to each bolded vocabulary word in the story in **bold** " +
          "markdown too, at the same position they naturally occur in the translated sentence.",
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
              description:
                language === "zh"
                  ? "Pinyin romanization with tone marks, e.g. nǐ hǎo"
                  : "IPA phonetic transcription, e.g. /əˈpæl/",
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
}

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

  const topicId = String((body as { topicId?: unknown })?.topicId ?? "").trim();
  if (!topicId) {
    return NextResponse.json({ error: "Thiếu chủ đề." }, { status: 400 });
  }

  const { data: topic, error: topicError } = await supabase
    .from("vocabulary_topics")
    .select("id, language")
    .eq("id", topicId)
    .eq("user_id", user.id)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Không tìm thấy chủ đề." }, { status: 404 });
  }

  const language: Language = isLanguage(topic.language) ? topic.language : DEFAULT_LANGUAGE;

  const { data: topicWords, error: wordsError } = await supabase
    .from("vocabulary_entries")
    .select("word, meaning")
    .eq("topic_id", topicId)
    .eq("user_id", user.id);

  if (wordsError) {
    return NextResponse.json({ error: "Không thể tải từ vựng của chủ đề." }, { status: 500 });
  }

  if (!topicWords || topicWords.length === 0) {
    return NextResponse.json(
      { error: "Chủ đề này chưa có từ vựng nào. Vui lòng thêm từ trước khi tạo câu chuyện." },
      { status: 400 },
    );
  }

  // Large topics accumulate more words than fit in one story — sample randomly so repeated
  // generations from the same topic surface different words instead of always the first N.
  const words: VocabularyItem[] = shuffle(
    topicWords.map((entry) => ({
      word: entry.word,
      meaning: entry.meaning ?? undefined,
    })),
  ).slice(0, MAX_WORDS_PER_STORY);

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
        error: `Bạn đã đạt giới hạn ${MAX_STORIES_PER_DAY} câu chuyện/ngày. Vui lòng quay lại vào ngày mai.`,
      },
      { status: 429 },
    );
  }

  const wordList = words
    .map((entry) => (entry.meaning ? `${entry.word} (${entry.meaning})` : entry.word))
    .join(", ");

  // Scale story length to the word count instead of a fixed range — a handful of words
  // in a 100-200 word story reads as padded and rambling.
  const minWords = Math.max(40, words.length * 12);
  const maxWords = Math.max(90, words.length * 20);

  const languageName = LANGUAGE_NAME[language];
  const phoneticInstruction =
    language === "zh"
      ? "the Pinyin romanization (with tone marks) for each vocabulary word"
      : "the IPA phonetic transcription for each vocabulary word";

  let result: StoryGenerationResult;
  try {
    const response = await generateWithKeyPool({
      model: STORY_MODEL,
      contents: `Write a short story using these vocabulary words: ${wordList}`,
      config: {
        temperature: 0.9,
        maxOutputTokens: 2500,
        responseMimeType: "application/json",
        responseSchema: buildStoryResponseSchema(language),
        systemInstruction:
          `You are a creative ${languageName} teacher. Write a story in ${languageName} ` +
          `that is simple and easy to understand, between ${minWords} and ${maxWords} words ` +
          "long, that naturally fits ALL of the given vocabulary words in context so a " +
          "learner can remember them through the story. Don't pad the story past that " +
          "length. Vary the setting, characters, and plot each time so repeated requests " +
          "don't feel like a continuation of a previous story. Wrap each vocabulary word in " +
          "**bold** markdown the first time it appears in the story. Also provide a natural " +
          "Vietnamese translation of the story — in the translation, wrap the Vietnamese " +
          "word/phrase corresponding to each bolded vocabulary word in **bold** markdown too " +
          `(same words, same story, just the translated language), ${phoneticInstruction}, ` +
          "and a short Vietnamese meaning for each vocabulary word.",
      },
    });

    result = JSON.parse(response.text ?? "");
  } catch (err) {
    console.error("Gemini generate story failed", err);
    return NextResponse.json(
      { error: "Không thể tạo câu chuyện lúc này. Vui lòng thử lại sau." },
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
      language,
      topic_id: topicId,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to save story", insertError);
    return NextResponse.json({ error: "Không thể lưu câu chuyện." }, { status: 500 });
  }

  // Best-effort: if a topic word had no meaning yet, backfill it with the one Gemini just
  // generated for the story, so the topic's word list reads better next time it's viewed.
  await Promise.all(
    enrichedWords
      .filter((entry) => entry.meaning)
      .map((entry) =>
        supabase
          .from("vocabulary_entries")
          .update({ meaning: entry.meaning })
          .eq("topic_id", topicId)
          .eq("user_id", user.id)
          .eq("word", entry.word)
          .is("meaning", null),
      ),
  );

  return NextResponse.json({ story });
}
