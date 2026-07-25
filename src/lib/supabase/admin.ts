import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Service-role client — bypasses RLS entirely. Server-only: never import this from a
// Client Component, and never let SUPABASE_SERVICE_ROLE_KEY reach the browser. Only use it
// for shared/admin data with no auth.uid() owner (e.g. gemini_api_key_pool), never for
// reading/writing a specific user's own data — use @/lib/supabase/server for that so RLS
// still applies.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
