# Voca English Memory

Learn English vocabulary through "story-based memory": enter a list of words, AI (Google
Gemini `gemini-flash-lite-latest`) generates a short story using them — with a Vietnamese
translation, IPA pronunciation per word, and text-to-speech playback — saved for later review.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth) — free tier
- Google Gemini API (`gemini-flash-lite-latest`) — free tier, no credit card required
- Deployed on Vercel — free tier

## Project structure

```
src/
  app/
    page.tsx                 Home page
    login/page.tsx           Magic-link sign in
    auth/callback/route.ts   Handles the callback after clicking the magic link
    vocabulary/page.tsx      Enter vocabulary, calls the story-generation API
    history/page.tsx         History of previously generated stories
    api/generate-story/      API route: calls Gemini + rate limiting + saves to DB
  components/                Navbar, SignOutButton, StoryCard, BoldText...
  lib/
    supabase/                Supabase client (browser/server/middleware) + types
    gemini/                  Gemini client
    speech.ts                Text-to-speech helper (browser Web Speech API)
  proxy.ts                   Refreshes the session + protects /vocabulary, /history
supabase/
  migrations/                Timestamp-prefixed, in the format Supabase CLI itself uses
    20260720222132_init.sql                        Schema + Row Level Security
    20260721090849_add_story_translation.sql       Adds the `translation` column to stories
    20260721141856_add_vocabulary_update_policy.sql Adds the UPDATE policy vocabulary_entries needs
```

## 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com) (free tier).
2. Open the **SQL Editor** and run every file in `supabase/migrations/`, in filename order
   (oldest timestamp first):
   - [`20260720222132_init.sql`](supabase/migrations/20260720222132_init.sql) — creates the
     `vocabulary_entries` and `stories` tables and enables Row Level Security.
   - [`20260721090849_add_story_translation.sql`](supabase/migrations/20260721090849_add_story_translation.sql) —
     adds the `translation` column used for the Vietnamese story translation.
   - [`20260721141856_add_vocabulary_update_policy.sql`](supabase/migrations/20260721141856_add_vocabulary_update_policy.sql) —
     adds the UPDATE policy the `/review` "edit meaning" feature needs.
3. Under **Authentication > Providers**, make sure the **Email** provider is enabled (on by
   default). The app uses magic links (email OTP), no password required.
4. Under **Authentication > URL Configuration**, add:
   - Site URL: `http://localhost:3000` (dev) and your Vercel domain once deployed.
   - Redirect URLs: `http://localhost:3000/auth/callback` and
     `https://<your-vercel-domain>/auth/callback`.
5. Under **Project Settings > API**, copy the `Project URL` and `anon public` key.

## 2. Get a Gemini API key (free)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Sign in with a Google account and create an API key — no billing/credit card required for
   the free tier.

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
```

`MAX_STORIES_PER_DAY` is a basic rate limit: each user can generate at most N stories (= N
Gemini calls) per day, to prevent API abuse and stay comfortably inside the free-tier quota.

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
4. Update the Redirect URL in Supabase with the real Vercel domain once deployed.

## Notes

- RLS ensures each user can only read/write their own `vocabulary_entries` and `stories`
  (`auth.uid() = user_id`).
- Rate limiting currently counts `stories` created today by server clock — simple, no extra
  table needed, sufficient for an MVP.

See [rule.md](rule.md) for the conventions this project follows — read it before making
changes so future work stays consistent.
