import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/vocabulary" itself (the topic list) is deliberately NOT protected — guests can browse it to
// get a feel for the app before signing up. Only a specific topic ("/vocabulary/xxx", which
// reads/writes that user's own data) requires auth, hence the separate "/vocabulary/" prefix.
const PROTECTED_PATHS = ["/vocabulary/", "/grammar"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() verifies the access token's signature locally against the project's cached
  // public keys (the project signs with ES256) instead of asking the Auth server on every
  // request the way getUser() does. It still refreshes an expiring session first, which is
  // what keeps the cookies above up to date.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
