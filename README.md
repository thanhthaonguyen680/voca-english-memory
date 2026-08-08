# Voca English Memory

> 🇻🇳 **Giới thiệu nhanh (tiếng Việt):** Đây là dự án cá nhân của mình để học từ vựng tiếng
> Anh theo phương pháp **Storytelling Technique** (kể chuyện) và **Memory Palace** (cung điện
> ký ức) — những kỹ thuật mình từng dùng để nhớ 100 con số chỉ trong vài phút (và nhớ rất lâu
> nếu ôn lại), hay nhớ ngẫu nhiên cả bộ 52 lá bài chỉ sau 1 lần xem qua. Cách dùng: tạo chủ đề,
> thêm từ vựng (gõ tay, hoặc chụp/chọn ảnh để AI tự quét và tạo ra nghĩa + phiên âm IPA), rồi
> biến thành câu chuyện riêng để nhớ sâu, nhớ lâu. Ngoài ra còn có ôn tập từ vựng 2 chiều,
> luyện phát âm, luyện nói, luyện viết, và ngữ pháp — tất cả đều miễn phí. Ban đầu mình định
> làm cho bản thân, sau mở ra cho vài người bạn cùng mục tiêu học từ vựng tiếng Anh. Giao diện
> app hoàn toàn bằng tiếng Việt; phần còn lại của README này viết bằng tiếng Anh theo thông lệ
> GitHub.

This is a personal project I built to scratch my own itch: learning English vocabulary
through **"super memory" story-based recall** — instead of memorizing words in isolation, I
enter a list of words and AI weaves them into a short, meaningful story that's much easier to
picture and remember than rote drilling. It worked well enough for me that I opened it up to a
few friends chasing the same goal.

If you're also looking for a way to actually *remember* vocabulary instead of cramming it,
this might be for you.

## Features

- **Vocabulary → AI story** (`/vocabulary`): enter a list of words, Gemini writes a short
  English story using all of them, with a Vietnamese translation, IPA pronunciation, and a
  meaning for each word. Hit "Tạo câu chuyện khác" to get a different story for the same words.
- **Read-aloud pronunciation** for any word or story, via the browser's built-in speech
  synthesis (free, no API needed).
- **Story history** (`/history`): revisit every story you've generated, delete the ones you
  don't need anymore.
- **Per-story review decks** (`/review`): each story is its own flashcard deck (words are
  never pooled across stories) — quiz English→Vietnamese, Vietnamese→English, or mixed, with
  pronunciation checking via your own voice, and a retry mode for just the cards you missed.
- **AI conversation practice — "Ran Ran"** (`/chat`): free-form or scenario-based roleplay
  chat that naturally works your own vocabulary into the conversation, replies in both text
  and voice, and accepts typed or spoken input.
- **Writing practice** (`/writing`): write a short essay (title, intro, body, conclusion) and
  get AI feedback in Vietnamese. Full history of past essays + feedback is kept
  (`/writing/history`).
- **Study streak**: tracks consecutive days with at least one story generated, shown right in
  the navbar to keep the habit going.
- The whole UI is in **Vietnamese** with a dark theme, since that's who this app is for.

## Why free-tier only

This is a personal/small-friend-group app with no paid plan behind it, so the entire stack is
deliberately built on free tiers (Supabase, Gemini, Vercel) — see [rule.md](rule.md) for the
full reasoning. To keep several people sharing the app from burning through AI quota too fast,
the server rotates through a pool of Gemini API keys (see step 4 below).

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth, email/password) — free tier
- Google Gemini API (`gemini-flash-lite-latest`) — free tier, no credit card required; the
  server rotates through a pool of API keys (`gemini_api_key_pool`) to multiply the effective
  free-tier daily quota across everyone using the app
- Deployed on Vercel — free tier

## Project structure

```
src/
  app/
    page.tsx                     Home page
    login/page.tsx               Email + password sign in / sign up
    vocabulary/page.tsx          Enter vocabulary, calls the story-generation API
    history/page.tsx             History of previously generated stories
    review/page.tsx              Per-story flashcard review + pronunciation check
    chat/page.tsx                Roleplay voice/text conversation practice with Gemini
    writing/page.tsx             Write title/overview/body/conclusion, get AI feedback
    writing/history/page.tsx     Past writings + feedback, with delete
    auth/callback/route.ts       Dormant — only used if magic-link auth is reintroduced
    api/generate-story/          API route: calls Gemini (via key pool) + rate limiting + saves to DB
    api/stories/[id]/vocabulary/ API route: fix a mistyped meaning within one story's words
    api/chat/                    API route: multi-turn Gemini conversation + rate limiting
    api/writing/                 API route: saves an essay + gets AI feedback + rate limiting
  components/                    Navbar, StoryCard, ReviewSession, ChatSession, WritingForm...
  lib/
    supabase/                    Supabase client (browser/server/middleware) + types
    supabase/admin.ts            Service-role Supabase client (server-only, bypasses RLS)
    gemini/client.ts             Shared Gemini client — last-resort fallback if the pool is empty
    gemini/pool.ts               Sticky API key rotation: generateWithKeyPool()
    crypto.ts                    AES-256-GCM encrypt/decrypt for pooled Gemini API keys
    speech.ts, pronunciation.ts  Browser Web Speech API helpers (TTS + speech recognition)
  proxy.ts                       Refreshes the session + protects the routes above
supabase/
  migrations/                    Timestamp-prefixed, in the format Supabase CLI itself uses
scripts/
  add-gemini-key.mjs             CLI: encrypt + insert a Gemini API key into the pool
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

## 2. Get Gemini API keys (free)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Sign in with a personal Google account (not a Workspace/company email) and create an API
   key — no billing/credit card required for the free tier. If you pick a **new** project
   when creating the key, you're less likely to hit the `limit: 0` free-tier quota issue that
   can happen with older/pre-existing GCP projects.
3. Repeat to create a few keys (2-5 is a reasonable starting pool) — the app rotates through
   all of them to multiply the effective daily quota. See step 4 for how many you actually
   need for your expected number of users.

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
MAX_STORIES_PER_DAY=10
MAX_CHAT_MESSAGES_PER_DAY=30
MAX_WRITINGS_PER_DAY=10
ENCRYPTION_KEY=...
```

- `MAX_STORIES_PER_DAY` / `MAX_CHAT_MESSAGES_PER_DAY` / `MAX_WRITINGS_PER_DAY` — basic
  per-user rate limits: at most N stories, N chat messages, or N writing feedback calls per
  day, regardless of which pooled key ends up serving the request.
- `SUPABASE_SERVICE_ROLE_KEY` — from **Project Settings > API > service_role**. ⚠️ Server-only
  secret, bypasses RLS entirely — never expose to the browser. Used only to read/write the
  `gemini_api_key_pool` table (which has no per-user owner, so RLS can't scope a normal
  policy to it).
- `ENCRYPTION_KEY` — any random long string (e.g. `openssl rand -base64 32`), used to encrypt
  each pooled Gemini API key before it's stored in the database.
- `GEMINI_API_KEY` — last-resort fallback, only used if `gemini_api_key_pool` is empty or every
  pooled key is exhausted. Not required once you've populated the pool (step 4), but good to
  keep set as a safety net.

## 4. Populate the Gemini key pool

Add each Gemini API key from step 2 into the pool (encrypts it and inserts a row via the
service-role client):

```bash
node scripts/add-gemini-key.mjs "AIzaSy..." "key 1"
node scripts/add-gemini-key.mjs "AIzaSy..." "key 2"
```

The app tries keys in insertion order, fully draining one (sticky rotation) before moving to
the next, and automatically retries an exhausted key ~20h later once Gemini's daily quota
resets. See `src/lib/gemini/pool.ts`.

**How many keys do you need?** Each user can trigger at most
`MAX_STORIES_PER_DAY + MAX_CHAT_MESSAGES_PER_DAY + MAX_WRITINGS_PER_DAY` Gemini calls/day
(50 with the defaults above). Gemini's free tier is ~1,500 requests/day per key, so:

## 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 6. Deploy to Vercel

1. Push the code to GitHub.
2. Import the repo into [Vercel](https://vercel.com) (free tier).
3. Add the environment variables above under **Project Settings > Environment Variables**
   (including `SUPABASE_SERVICE_ROLE_KEY`).
4. Run `scripts/add-gemini-key.mjs` locally against the same Supabase project to populate the
   pool — it writes straight to the DB, so there's nothing separate to do on Vercel itself.

## Notes

- RLS ensures each user can only read/write their own `vocabulary_entries`, `stories`,
  `chat_logs`, and `writings` rows (`auth.uid() = user_id`). `gemini_api_key_pool` has RLS
  enabled with zero policies — only the service-role key (server-only, bypasses RLS) can touch
  it, since it's shared infrastructure with no per-user owner.
- Rate limiting counts `stories`/`chat_logs`/`writings` rows created today by server clock —
  simple, no external rate-limit service. `chat_logs` stores no message content, only a row per
  turn, purely for counting.
- `/chat` conversations are not persisted — history lives in the browser tab for the length of
  the session and is resent with each request (Gemini's `generateContent` is stateless across
  serverless invocations either way, so there's no server-side session to lose).
- All Gemini calls go through `generateWithKeyPool()` (`src/lib/gemini/pool.ts`): sticky
  rotation through `gemini_api_key_pool` (drain the lowest-`sort_order` valid key fully before
  moving on), auto-invalidate on a quota error, auto-retry ~20h later, and fall back to the
  single `GEMINI_API_KEY` env var if the pool is empty or fully exhausted.
- The old "user brings their own Gemini key" feature has been replaced by the key pool above.
  `user_settings.gemini_api_key` and its encrypt/decrypt code path are dormant (table and
  `src/lib/crypto.ts` left in place, not deleted) rather than removed outright.
- `/writing` always saves the essay even if the AI feedback call fails — feedback is a
  nice-to-have, not a condition for saving the user's work.
- `/review` reads each story's own `vocabulary_used` directly — decks are per-story, never
  merged, and deleting a story removes its words from review automatically (no separate table,
  no cascade needed — the words live inside the story row itself).

See [rule.md](rule.md) for the conventions this project follows — read it before making
changes so future work stays consistent.
