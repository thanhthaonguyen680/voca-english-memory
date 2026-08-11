import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { STORY_MODEL } from "@/lib/gemini/client";
import { generateWithKeyPool } from "@/lib/gemini/pool";
import { MAX_WORDS_PER_STORY, DEFAULT_LANGUAGE } from "@/lib/constants";
import { isLanguage } from "@/lib/utils/language";
import { ensureUserRooms } from "@/lib/palace-data";

const MAX_PALACE_GENERATIONS_PER_DAY = Number(process.env.MAX_PALACE_GENERATIONS_PER_DAY ?? 10);

const PRONUNCIATION_HINT: Record<string, string> = {
  en: "IPA transcription, e.g. /wɜːrd/",
  zh: "Pinyin romanization with tone marks, e.g. nǐ hǎo",
};

const PALACE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      description: "One entry per input word, in the same order.",
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          imagery: {
            type: Type.STRING,
            description:
              "One vivid, exaggerated, slightly bizarre Vietnamese sentence picturing the " +
              "word's meaning as a scene happening in the given room — the stranger/funnier " +
              "the image, the more memorable it is for the Method of Loci technique.",
          },
          pronunciation: {
            type: Type.STRING,
            description: "The word's pronunciation. See the format requested in the prompt.",
          },
          wordType: {
            type: Type.STRING,
            description:
              "Most common part of speech, as a short abbreviation: n, v, adj, adv, or phrase.",
          },
          usageNote: {
            type: Type.STRING,
            description:
              "One short Vietnamese note on how the word/phrase is typically used (common " +
              "collocations or context) — max 1-2 câu.",
          },
          example: {
            type: Type.STRING,
            description: "One natural example sentence, in the word's own language, using it.",
          },
        },
        required: ["word", "imagery", "pronunciation", "wordType", "usageNote", "example"],
      },
    },
  },
  required: ["items"],
};

const ROOM_STORY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rooms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          roomId: { type: Type.STRING },
          story: {
            type: Type.STRING,
            description:
              "A short Vietnamese story (3-5 câu) connecting all the given imagery scenes, " +
              "in order, as if walking through the room and noticing each one in turn — helps " +
              "the learner recall the words in sequence.",
          },
        },
        required: ["roomId", "story"],
      },
    },
  },
  required: ["rooms"],
};

type PalaceWordResult = {
  word: string;
  imagery: string;
  pronunciation: string;
  wordType: string;
  usageNote: string;
  example: string;
};
type PalaceResult = { items: PalaceWordResult[] };
type RoomStoryResult = { rooms: { roomId: string; story: string }[] };

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

  const language = isLanguage(topic.language) ? topic.language : DEFAULT_LANGUAGE;

  const { count: assignedCount, error: countAssignedError } = await supabase
    .from("vocabulary_entries")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId)
    .eq("user_id", user.id)
    .not("palace_room", "is", null);

  if (countAssignedError) {
    return NextResponse.json({ error: "Không thể kiểm tra Cung điện trí nhớ." }, { status: 500 });
  }

  const { data: pendingWords, error: pendingError } = await supabase
    .from("vocabulary_entries")
    .select("id, word, meaning, word_type")
    .eq("topic_id", topicId)
    .eq("user_id", user.id)
    .is("palace_room", null)
    .order("created_at", { ascending: true })
    .limit(MAX_WORDS_PER_STORY);

  if (pendingError) {
    return NextResponse.json({ error: "Không thể tải từ vựng của chủ đề." }, { status: 500 });
  }

  if (!pendingWords || pendingWords.length === 0) {
    return NextResponse.json(
      { error: "Mọi từ trong chủ đề này đã có trong Cung điện trí nhớ rồi." },
      { status: 400 },
    );
  }

  const { count, error: countError } = await supabase
    .from("palace_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfTodayISO());

  if (countError) {
    return NextResponse.json({ error: "Không thể kiểm tra giới hạn sử dụng." }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_PALACE_GENERATIONS_PER_DAY) {
    return NextResponse.json(
      {
        error: `Bạn đã đạt giới hạn ${MAX_PALACE_GENERATIONS_PER_DAY} lượt tạo Cung điện trí nhớ/ngày. Vui lòng quay lại vào ngày mai.`,
      },
      { status: 429 },
    );
  }

  const rooms = await ensureUserRooms(supabase, user.id);

  // Continue the round-robin from where the last batch left off, so revisiting the same topic
  // later keeps assigning rooms in the same fixed order instead of restarting at room 0 and
  // reusing rooms sooner than necessary.
  const startOffset = assignedCount ?? 0;
  const assignments = pendingWords.map((entry, index) => ({
    ...entry,
    room: rooms[(startOffset + index) % rooms.length],
  }));

  const wordList = assignments
    .map((entry) => `${entry.word}${entry.meaning ? ` (${entry.meaning})` : ""} → ${entry.room.name}`)
    .join("\n");

  let result: PalaceResult;
  try {
    const response = await generateWithKeyPool({
      model: STORY_MODEL,
      contents:
        "Vocabulary words with their assigned room (word (Vietnamese meaning) → room):\n" +
        wordList,
      config: {
        temperature: 1,
        maxOutputTokens: 2500,
        responseMimeType: "application/json",
        responseSchema: PALACE_RESPONSE_SCHEMA,
        systemInstruction:
          "You are helping a Vietnamese learner build a Memory Palace (Method of Loci) to " +
          "remember vocabulary. For each word and its assigned room, provide: (1) one vivid, " +
          "exaggerated, slightly absurd Vietnamese sentence that pictures the word's meaning " +
          "as something bizarre happening in that specific room — the stranger and more " +
          `visual the image, the easier it is to recall; (2) its pronunciation as ` +
          `${PRONUNCIATION_HINT[language] ?? PRONUNCIATION_HINT.en}; (3) its most common part ` +
          "of speech (n/v/adj/adv/phrase); (4) one short Vietnamese usage note (common " +
          "collocations or context); (5) one natural example sentence in the word's own " +
          "language. Keep the imagery sentence short (1 câu). Reply in Vietnamese except for " +
          "the pronunciation and example sentence fields.",
      },
    });

    result = JSON.parse(response.text ?? "");
  } catch (err) {
    console.error("Gemini palace generation failed", err);
    return NextResponse.json(
      { error: "Không thể tạo Cung điện trí nhớ lúc này. Vui lòng thử lại sau." },
      { status: 502 },
    );
  }

  const aiByWord = new Map(
    (result.items ?? []).map((entry) => [entry.word.toLowerCase(), entry]),
  );

  await Promise.all(
    assignments.map((entry) => {
      const ai = aiByWord.get(entry.word.toLowerCase());
      return supabase
        .from("vocabulary_entries")
        .update({
          palace_room: entry.room.id,
          palace_imagery: ai?.imagery ?? null,
          ipa: ai?.pronunciation ?? null,
          usage_note: ai?.usageNote ?? null,
          example_sentence: ai?.example ?? null,
          word_type: entry.word_type || ai?.wordType || null,
        })
        .eq("id", entry.id);
    }),
  );

  // Connect every word currently in each affected room (not just this batch's new words) into
  // one short story per room — non-fatal if it fails, this is a bonus on top of the per-word
  // imagery that already made it into the database above.
  try {
    const affectedRoomIds = [...new Set(assignments.map((a) => a.room.id))];
    const roomRosters = await Promise.all(
      affectedRoomIds.map(async (roomId) => {
        const { data: roomWords } = await supabase
          .from("vocabulary_entries")
          .select("word, palace_imagery")
          .eq("topic_id", topicId)
          .eq("user_id", user.id)
          .eq("palace_room", roomId)
          .not("palace_imagery", "is", null)
          .order("created_at", { ascending: true });
        const room = rooms.find((r) => r.id === roomId);
        return { roomId, roomName: room?.name ?? roomId, words: roomWords ?? [] };
      }),
    );

    const roomPromptText = roomRosters
      .map(
        (r) =>
          `Room "${r.roomName}" (id: ${r.roomId}):\n` +
          r.words.map((w) => `- ${w.word}: ${w.palace_imagery}`).join("\n"),
      )
      .join("\n\n");

    const roomResponse = await generateWithKeyPool({
      model: STORY_MODEL,
      contents:
        "Rooms with their vocabulary imagery scenes, in the order they were placed:\n\n" +
        roomPromptText,
      config: {
        temperature: 1,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
        responseSchema: ROOM_STORY_SCHEMA,
        systemInstruction:
          "You are helping a Vietnamese learner use the Memory Palace (Method of Loci) " +
          "technique. For each room, connect ALL of its imagery scenes into ONE short, " +
          "flowing Vietnamese story (3-5 câu) that visits each scene in the given order — " +
          "like walking through the room and noticing each bizarre image in sequence. This " +
          "helps recall both the words and their order. Reply in Vietnamese.",
      },
    });

    const roomStoryResult: RoomStoryResult = JSON.parse(roomResponse.text ?? "");

    await Promise.all(
      (roomStoryResult.rooms ?? []).map((r) =>
        supabase.from("palace_room_stories").upsert(
          {
            topic_id: topicId,
            room_id: r.roomId,
            user_id: user.id,
            story: r.story,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "topic_id,room_id" },
        ),
      ),
    );
  } catch (err) {
    console.error("Gemini room story generation failed", err);
  }

  const { error: logError } = await supabase.from("palace_generations").insert({ user_id: user.id });
  if (logError) {
    console.error("Failed to log palace generation usage", logError);
  }

  return NextResponse.json({ assigned: assignments.length });
}
