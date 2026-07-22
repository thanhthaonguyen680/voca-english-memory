# Voca English Memory

Learn English vocabulary through "story-based memory": enter a list of words, AI (Google
Gemini `gemini-flash-lite-latest`) generates a short story using them — with a Vietnamese
translation, IPA pronunciation per word, and text-to-speech playback — saved for later review.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth, email/password) — free tier
- Google Gemini API (`gemini-flash-lite-latest`) — free tier, no credit card required; users
  can optionally add their own key on `/settings` to skip the shared daily limit
- Deployed on Vercel — free tier

## Project structure

```
src/
  app/
    page.tsx                     Home page
    login/page.tsx               Email + password sign in / sign up
    vocabulary/page.tsx          Enter vocabulary, calls the story-generation API
    history/page.tsx             History of previously generated stories
    review/page.tsx              Flashcard-style vocabulary review + pronunciation check
    settings/page.tsx            Add/remove a personal Gemini API key
    auth/callback/route.ts       Dormant — only used if magic-link auth is reintroduced
    api/generate-story/          API route: calls Gemini + rate limiting + saves to DB
    api/vocabulary-entries/      API route: edit a saved word's meaning
    api/user-settings/gemini-key/  API route: save/remove a user's own Gemini key (encrypted)
  components/                    Navbar, StoryCard, ReviewSession, GeminiKeyForm...
  lib/
    supabase/                    Supabase client (browser/server/middleware) + types
    gemini/                      Shared Gemini client (fallback when a user has no own key)
    crypto.ts                    AES-256-GCM encrypt/decrypt for stored per-user API keys
    speech.ts, pronunciation.ts  Browser Web Speech API helpers (TTS + speech recognition)
  proxy.ts                       Refreshes the session + protects the routes above
supabase/
  migrations/                    Timestamp-prefixed, in the format Supabase CLI itself uses
```

## 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com) (free tier).
2. Open the **SQL Editor** and run every file in `supabase/migrations/`, in filename order
   (oldest timestamp first — each one is a small, one-time schema change).
3. Under **Authentication > Providers > Email**, turn **off "Confirm email"**. This app uses
   plain email + password with no email step at all — leaving confirmation on will make
   sign-up hang waiting for a confirmation email that (on Supabase's default, non-SMTP email
   service) has real deliverability/template limitations.
4. Under **Project Settings > API**, copy the `Project URL` and `anon public` key.

## 2. Get a Gemini API key (free)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Sign in with a personal Google account (not a Workspace/company email) and create an API
   key — no billing/credit card required for the free tier. If you pick a **new** project
   when creating the key, you're less likely to hit the `limit: 0` free-tier quota issue that
   can happen with older/pre-existing GCP projects.

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
MAX_STORIES_PER_DAY=10
ENCRYPTION_KEY=...
```

- `MAX_STORIES_PER_DAY` — basic rate limit: each user without their own Gemini key can
  generate at most N stories (= N Gemini calls) per day using the shared server key.
- `ENCRYPTION_KEY` — any random long string (e.g. `openssl rand -base64 32`), used to encrypt
  a user's own Gemini API key before it's stored in the database (see `/settings`).

## 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 5. Deploy to Vercel

1. Push the code to GitHub.
2. Import the repo into [Vercel](https://vercel.com) (free tier).
3. Add the environment variables above under **Project Settings > Environment Variables**.

## Notes

- RLS ensures each user can only read/write their own `vocabulary_entries`, `stories`, and
  `user_settings` rows (`auth.uid() = user_id`).
- Rate limiting currently counts `stories` created today by server clock — simple, no extra
  table needed — and is skipped entirely for a user who has added their own Gemini key.
- A user's own Gemini API key is encrypted (AES-256-GCM, `src/lib/crypto.ts`) before being
  stored, and only decrypted server-side at the moment a story is generated.

See [rule.md](rule.md) for the conventions this project follows — read it before making
changes so future work stays consistent.
