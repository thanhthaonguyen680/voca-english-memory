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
              "ONE short, highly visual Vietnamese sentence — not a story — that lets the " +
              "learner recall the ENGLISH word/phrase itself (its sound/spelling), not just " +
              "its meaning, when they picture it in the given room. For a single word, anchor " +
              "the image to a Vietnamese sound-alike of its pronunciation/spelling. For a " +
              "multi-word phrase, mentally split it into components, build a sound/spelling " +
              "image for each component, then merge them into one combined scene. Make it " +
              "exaggerated and bizarre (giant size, bright color, motion, weird sound, " +
              "illogical action) — the room is only the container for where the scene " +
              "happens, never a substitute for the word-sound association itself.",
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
          "You are a Memory Palace + mnemonic expert building word-retrieval imagery for a " +
          "Vietnamese learner of English vocabulary. The single most important goal: when the " +
          "learner sees the room + image later, they must be able to recall the ENGLISH " +
          "word/phrase FIRST, and only then its Vietnamese meaning. Never build a scene that " +
          "only represents the word's MEANING — that fails the goal even if it's vivid.\n\n" +
          "Core rules:\n" +
          "1. The association must anchor to the English word itself (its sound or spelling), " +
          "not just to what it means. 'English word → sound/spelling → meaning', never " +
          "'image → meaning' alone.\n" +
          "2. For a SINGLE word, prioritize a phonetic association: find a Vietnamese sound, " +
          "name, or familiar object that echoes the word's pronunciation or spelling, and " +
          "build the image around that sound-alike.\n" +
          "3. For a PHRASE, never treat it as one unit. Split it into its component words, " +
          "invent a sound/spelling-anchored image for EACH component separately, then merge " +
          "all components into one single combined scene (e.g. for 'basic knowledge': BASIC → " +
          "a giant BASE/pedestal glowing with the letters BASIC; KNOWLEDGE → a giant brain " +
          "full of books; combined scene → the giant glowing BASE has that book-filled brain " +
          "sitting on top of it, shaking so hard the books fly everywhere).\n" +
          "4. Keep it to ONE short scene, not a story: one weird action + 1-2 objects tied " +
          "directly to the word. No 3-5 sentence narration.\n" +
          "5. Self-check before finalizing: if the learner forgets the English word and only " +
          "looks at the image, could they retrieve the ENGLISH WORD (not just the meaning) " +
          "from it? If not, rebuild the image.\n" +
          "6. Make it exaggerated and memorable: giant/oversized objects, bright colors, " +
          "motion, imaginary sounds, illogical or absurd actions, unusual scale.\n" +
          "7. The assigned room is only a container for WHERE the scene happens — never let " +
          "the room itself stand in for the word's meaning or sound.\n\n" +
          "For each word and its assigned room, also provide: its pronunciation as " +
          `${PRONUNCIATION_HINT[language] ?? PRONUNCIATION_HINT.en}; its most common part of ` +
          "speech (n/v/adj/adv/phrase); one short Vietnamese usage note (common collocations " +
          "or context); one natural example sentence in the word's own language. Reply in " +
          "Vietnamese except for the pronunciation and example sentence fields.",
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
          // Only ever set once — this update only ever touches rows that were pending
          // (palace_room is null), i.e. words getting their first room assignment.
          palace_added_at: new Date().toISOString(),
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
