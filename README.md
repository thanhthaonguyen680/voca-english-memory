# Voca English Memory

> 🇻🇳 **Giới thiệu nhanh (tiếng Việt):** Đây là dự án cá nhân của mình để học từ vựng tiếng
> Anh bằng kỹ thuật **Memory Palace** (cung điện ký ức / phương pháp Loci) mà chính các nhà vô
> địch trí nhớ thế giới vẫn dùng: gắn mỗi từ vào 1 vị trí quen thuộc trong "ngôi nhà trí nhớ"
> của riêng bạn, kèm 1 hình ảnh liên tưởng càng kỳ lạ, càng phóng đại thì càng dễ nhớ. Đây
> chính là kỹ thuật mình từng dùng để nhớ 100 con số ngẫu nhiên chỉ trong vài phút (và nhớ rất
> lâu nếu ôn lại), hay nhớ đúng thứ tự cả bộ 52 lá bài chỉ sau 1 lần xem qua — giờ áp dụng lại
> đúng nguyên lý đó cho việc học từ vựng. Sau khi xếp từ vào từng vị trí, app còn vẽ lại
> **hành trình ký ức** — sơ đồ các điểm dừng nối nhau bằng mũi tên (sân → cổng → phòng khách →
> ...) kèm từ vựng ở mỗi điểm, để dễ hình dung cả lộ trình trước khi đi "dạo" một vòng ôn lại
> trong đầu.
>
> Cách dùng: tạo chủ đề, thêm từ vựng (gõ tay, hoặc chụp/chọn ảnh để AI tự quét và tạo ra nghĩa
> + phiên âm IPA), rồi xếp vào cung điện trí nhớ để nhớ sâu, nhớ lâu. Ngoài ra còn có ôn tập từ
> vựng 2 chiều, luyện phát âm và bài tập ngữ pháp — tất cả đều miễn phí. Ban
> đầu mình định làm cho bản thân, sau mở ra cho vài người bạn cùng mục tiêu học từ vựng tiếng
> Anh. Giao diện app hoàn toàn bằng tiếng Việt.

**English below** 👇

This is a personal project I built to scratch my own itch: actually *remembering* English
vocabulary instead of cramming it, using the **Memory Palace** (Method of Loci) technique that
memory champions use — every word gets pinned to a spot in your own mental "house" with a
vivid, exaggerated image, then you take a mental walk through the rooms to recall them. It
worked well enough for me that I opened it up to a few friends chasing the same goal.

## Features

- **Memory Palace** (`/vocabulary/[topicId]/palace`): AI assigns each word in a topic to a
  room in your house and generates one vivid mnemonic image for it, plus a short connecting
  story per room. Walk the rooms as flashcards, self-report "got it / didn't", and track a
  per-word mastery level.
- **Memory journey map**: a numbered chain diagram (room → room → room, arrows between) showing
  every stop and the vocabulary placed there, for a quick overview of the whole route.
- **Add vocabulary by photo** (`/api/scan-vocabulary`): snap a page of a book/notebook and
  Gemini extracts the words, part of speech, and IPA/Pinyin — review the list, then save into
  the topic. Manual add + AI meaning fill-in are also there.
- **In-topic review**: quiz a topic's live word list English→Vietnamese, Vietnamese→English,
  or mixed, with voice pronunciation checking and a retry mode for missed cards.
- **Read-aloud pronunciation** for any word, via the browser's built-in speech synthesis
  (free, no API needed).
- **Grammar practice** (`/grammar`): a reference for all 12 English tenses, with 144
  multiple-choice questions and 72 Vietnamese → English translation prompts (AI-graded),
  drawn in short random sets.
- **Study streak**: tracks consecutive days with at least one activity (a word added, or a
  Memory Palace generation), shown right in the navbar to keep the habit going.
- The whole UI is in **Vietnamese**, since that's who this app is for.

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
    login/page.tsx               Username + password sign in / sign up
    vocabulary/page.tsx          Topic list — create topics, add words
    vocabulary/[topicId]/        Topic detail (words + in-topic review) and /palace (Memory Palace)
    grammar/page.tsx             Tense reference + multiple-choice and translation practice
    auth/callback/route.ts       Dormant — only used if magic-link auth is reintroduced
    api/palace/generate/         API route: assigns words to rooms + Gemini mnemonic imagery + stories
    api/scan-vocabulary/         API route: extract words from a photo via Gemini
    api/fill-meaning/            API route: AI meaning/type for words left blank
    api/grammar/check/           API route: AI-grades a translated sentence + rate limiting
  components/                    Navbar, PalaceWalkthrough, ReviewSession, GrammarQuiz...
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
   username + password (a synthetic email is derived from the username under the hood) with no
   email step at all — leaving confirmation on will make sign-up hang waiting for a
   confirmation email that can never arrive.
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
ENCRYPTION_KEY=...
```

- The per-feature limits in `.env.local.example` (scan / fill-meaning / Memory Palace
  generation / grammar checks) are optional — basic per-user
  daily rate limits, regardless of which pooled key ends up serving the request.
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

**How many keys do you need?** Each user can trigger at most the sum of the per-feature daily
limits in Gemini calls/day. Gemini's free tier is ~1,500 requests/day per key, so a small pool
(2-5 keys) comfortably covers a handful of users.

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
5. `vercel.json` pins Serverless Functions to `sin1` (Singapore) to match the Supabase
   project's region — every Server Component/API route calls Supabase, so a region mismatch
   adds real latency to every request. **This only takes effect on a Pro-or-higher plan** —
   Hobby (free) is fixed to `iad1` (US East) and ignores `regions`. On Hobby, either remove
   this file or accept the added cross-region latency; if you change which region your own
   Supabase project lives in, update `regions` here to match.

## Notes

- RLS ensures each user can only read/write their own `vocabulary_entries`, `vocabulary_topics`,
  and `palace_rooms` rows (`auth.uid() = user_id`). `gemini_api_key_pool`
  has RLS enabled with zero policies — only the service-role key (server-only, bypasses RLS) can
  touch it, since it's shared infrastructure with no per-user owner.
- Rate limiting counts rows in per-feature tables (`vocab_scans`,
  `meaning_fills`, `palace_generations`) created today by server clock — simple, no external
  rate-limit service. Those tables store no content, only a row per call, purely for counting.
- All Gemini calls go through `generateWithKeyPool()` (`src/lib/gemini/pool.ts`): sticky
  rotation through `gemini_api_key_pool` (drain the lowest-`sort_order` valid key fully before
  moving on), auto-invalidate on a quota error, auto-retry ~20h later, and fall back to the
  single `GEMINI_API_KEY` env var if the pool is empty or fully exhausted.
- The old "user brings their own Gemini key" feature has been replaced by the key pool above.
  `user_settings.gemini_api_key` and its encrypt/decrypt code path are dormant (table and
  `src/lib/crypto.ts` left in place, not deleted) rather than removed outright.
- The essay-writing (`/writing`) and AI conversation (`/chat`) features were **removed
  2026-10-12** to keep the app focused on vocabulary. The `writings` and `chat_logs` tables
  are left in place but dormant.
- The AI "Storytelling" feature (generate a story from a topic, story history, per-story
  flashcard decks) was **removed 2026-09-10** — it wasn't pulling its weight. The `stories`
  table is left in place but dormant; the study streak now counts activity days from
  `vocabulary_entries` + `palace_generations` instead.

See [rule.md](rule.md) for the conventions this project follows — read it before making
changes so future work stays consistent.
