import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type StudyStreak = {
  current: number;
  studiedToday: boolean;
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// A day counts toward the streak if the user generated at least one story that day.
// Derived from `stories.created_at` — no extra table needed.
export async function getStudyStreak(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<StudyStreak> {
  const { data, error } = await supabase
    .from("stories")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return { current: 0, studiedToday: false };
  }

  const days = Array.from(new Set(data.map((row) => dayKey(new Date(row.created_at)))));

  const today = new Date();
  const studiedToday = days[0] === dayKey(today);

  const cursor = new Date(today);
  if (!studiedToday) {
    cursor.setDate(cursor.getDate() - 1);
    if (days[0] !== dayKey(cursor)) {
      // Most recent study day is older than yesterday — streak is broken.
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
