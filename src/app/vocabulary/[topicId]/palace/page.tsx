import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureUserRooms } from "@/lib/palace-data";
import PalaceWalkthrough from "@/components/PalaceWalkthrough";

export default async function PalacePage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: topic, error: topicError } = await supabase
    .from("vocabulary_topics")
    .select("id, name, icon")
    .eq("id", topicId)
    .eq("user_id", user.id)
    .single();

  if (topicError || !topic) {
    notFound();
  }

  const [{ data: words }, rooms, { data: roomStories }] = await Promise.all([
    supabase
      .from("vocabulary_entries")
      .select(
        "id, word, meaning, word_type, palace_room, palace_imagery, palace_mastery, ipa, usage_note, example_sentence, palace_added_at",
      )
      .eq("topic_id", topicId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    ensureUserRooms(supabase, user.id),
    supabase
      .from("palace_room_stories")
      .select("room_id, story")
      .eq("topic_id", topicId)
      .eq("user_id", user.id),
  ]);

  const roomStoryMap = Object.fromEntries(
    (roomStories ?? []).map((r) => [r.room_id, r.story]),
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <PalaceWalkthrough
        topic={{ id: topic.id, name: topic.name, icon: topic.icon }}
        userId={user.id}
        initialRooms={rooms}
        initialRoomStories={roomStoryMap}
        initialWords={(words ?? []).map((w) => ({
          id: w.id,
          word: w.word,
          meaning: w.meaning,
          wordType: w.word_type,
          palaceRoom: w.palace_room,
          palaceImagery: w.palace_imagery,
          palaceMastery: w.palace_mastery,
          ipa: w.ipa,
          usageNote: w.usage_note,
          exampleSentence: w.example_sentence,
          palaceAddedAt: w.palace_added_at,
        }))}
      />
    </main>
  );
}
