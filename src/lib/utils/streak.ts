import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type StudyStreak = {
  current: number;
  studiedToday: boolean;
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// A day counts toward the streak if the user did anything meaningful that day: added at least
// one vocabulary word, or ran a Memory Palace generation. Derived from `vocabulary_entries`
// and `palace_generations` timestamps — no extra table needed. (Previously derived from the
// now-removed `stories` table.)
export async function getStudyStreak(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<StudyStreak> {
  const [{ data: words }, { data: palaceGens }] = await Promise.all([
    supabase.from("vocabulary_entries").select("created_at").eq("user_id", userId),
    supabase.from("palace_generations").select("created_at").eq("user_id", userId),
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
}
