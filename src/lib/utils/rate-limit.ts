import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Every AI feature is rate-limited the same way: one row per call in its own table
// (`user_id` + `created_at`, no content), counted for "today" by server clock.
type UsageTable =
  | "vocab_scans"
  | "meaning_fills"
  | "palace_generations"
  | "grammar_checks";

function startOfTodayISO() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

// Returns how many calls the user has made today, or null if the count itself failed — callers
// treat null as "can't verify the limit" and refuse the request rather than letting it through.
export async function countUsageToday(
  supabase: SupabaseClient<Database>,
  table: UsageTable,
  userId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfTodayISO());

  if (error) {
    console.error(`Failed to count ${table} usage`, error);
    return null;
  }
  return count ?? 0;
}

// Best-effort: a failed log must never fail a request whose AI call already succeeded.
export async function logUsage(
  supabase: SupabaseClient<Database>,
  table: UsageTable,
  userId: string,
) {
  const { error } = await supabase.from(table).insert({ user_id: userId });
  if (error) {
    console.error(`Failed to log ${table} usage`, error);
  }
}
