import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type StudyStreak = {
  current: number;
  studiedToday: boolean;
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Newest rows only: PostgREST caps a response at 1000 rows, so an unordered "all rows" query
// silently returned an arbitrary slice once a learner passed that many words — and with it a
// wrong streak. A streak only ever depends on the most recent activity.
const RECENT_ROWS = 1000;

// A day counts toward the streak if the user did anything meaningful that day: added at least
// one vocabulary word, or ran a Memory Palace generation. Derived from `vocabulary_entries`
// and `palace_generations` timestamps — no extra table needed. Cached per request because the
// navbar and the topic list page both show it.
export const getStudyStreak = cache(async (userId: string): Promise<StudyStreak> => {
  const supabase = await createClient();
  const [{ data: words }, { data: palaceGens }] = await Promise.all([
    supabase
      .from("vocabulary_entries")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_ROWS),
    supabase
      .from("palace_generations")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_ROWS),
  ]);

  const stamps = [
    ...(words ?? []).map((r) => r.created_at),
    ...(palaceGens ?? []).map((r) => r.created_at),
  ];

  if (stamps.length === 0) {
    return { current: 0, studiedToday: false };
  }

  // Distinct activity days, newest first (sort by real time, not the non-zero-padded key).
  const days = Array.from(
    new Map(
      stamps
        .map((s) => new Date(s))
        .sort((a, b) => b.getTime() - a.getTime())
        .map((d) => [dayKey(d), d] as const),
    ).keys(),
  );

  const today = new Date();
  const studiedToday = days[0] === dayKey(today);

  const cursor = new Date(today);
  if (!studiedToday) {
    cursor.setDate(cursor.getDate() - 1);
    if (days[0] !== dayKey(cursor)) {
      // Most recent activity is older than yesterday — streak is broken.
      return { current: 0, studiedToday: false };
    }
  }

  let current = 0;
  for (const day of days) {
    if (day !== dayKey(cursor)) break;
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, studiedToday };
});
