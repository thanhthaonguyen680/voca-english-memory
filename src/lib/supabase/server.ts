import { createServerClient } from "@supabase/ssr";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component during render — safe to ignore
            // because the middleware refreshes the session on every request.
          }
        },
      },
    },
  );
}

// The signed-in user's id for the current request, resolved at most once per render — the
// navbar (root layout) and the page both need it. Uses getClaims(), which verifies the token
// locally against the project's cached public signing keys (ES256) rather than calling the
// Auth server like getUser() does, so a page load costs no Auth request at all. Server
// Components should call this instead of `supabase.auth.getUser()`; Route Handlers keep
// calling `getUser()` (they mutate data and spend AI quota, so they get the server-checked
// answer).
export const getCurrentUser = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? { id: data.claims.sub } : null;
});
