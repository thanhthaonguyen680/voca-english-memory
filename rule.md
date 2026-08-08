# Rules — Voca English Memory

Mandatory rules for this project. Read before adding any new feature.

## Fixed stack

- Next.js 16 (App Router, Turbopack), TypeScript strict
- Supabase (Postgres + Auth), free tier
- Google Gemini SDK (`@google/genai`), model `gemini-flash-lite-latest` — chosen for its free
  tier (no credit card required, unlike the OpenAI API). Note: pinned versions like
  `gemini-2.0-flash` / `gemini-2.0-flash-lite` got their free-tier quota capped to 0 for new
  API keys — use a `-latest` alias so the app keeps tracking whichever model Google currently
  grants free quota to. Don't change the model or switch provider unless explicitly asked.
- Deploy: Vercel free tier
- Styling: plain Tailwind CSS, no component library (shadcn, MUI...) unless explicitly asked
- Package manager: npm (don't add `yarn.lock` / `pnpm-lock.yaml`)

## Next.js 16 — common pitfalls

- **Don't use `middleware.ts`** — that convention is deprecated. Use `src/proxy.ts` exporting
  a function named `proxy` (not `middleware`). The build will warn if this is done wrong.
- Route handlers and layouts use the App Router (`src/app/...`), not the Pages Router.
- `cookies()` in a Server Component / Route Handler is async — always `await cookies()`.

## Supabase client — use the right client in the right place

| Where | Import from | Why |
|---|---|---|
| Client Component (`"use client"`) | `@/lib/supabase/client` (`createClient`) | Uses `createBrowserClient`, runs in the browser |
| Server Component / Route Handler | `@/lib/supabase/server` (`createClient`, **async**) | Reads/writes cookies via `next/headers` |
| `src/proxy.ts` | `@/lib/supabase/middleware` (`updateSession`) | The only place using `createServerClient` directly with `request.cookies` |

Don't create additional client variants. Don't call the server `createClient` from a client
component, or vice versa.

## Auth: email + password

- `/login` (`src/app/login/page.tsx`) uses `supabase.auth.signUp` /
  `supabase.auth.signInWithPassword` — no email round-trip at all. This is a deliberate
  pivot away from two earlier approaches that both turned out to depend on things outside
  this repo:
  - **Magic link** (`signInWithOtp` + `/auth/callback`) depends on Supabase's Auth
    **Site URL / Redirect URLs** dashboard config matching the domain the user is on. Stale
    config (e.g. still `localhost:3000` after deploying) silently redirects to the wrong host
    with no error shown.
  - **OTP code** (`verifyOtp`) doesn't need a redirect, but the 6-digit code only reaches the
    user if the email template includes `{{ .Token }}` — and Supabase's default (non-SMTP)
    email service **locks template editing** entirely. Without custom SMTP configured, there
    is no way to get the code into the email at all.
  Password auth has neither dependency: signup/login complete client-side immediately.
- This requires **"Confirm email" turned OFF** in the Supabase dashboard (Authentication →
  Providers → Email), otherwise `signUp` won't return a session (`data.session` is null) and
  the user is stuck waiting on a confirmation email — which hits the exact same
  template/redirect problems above. The login page already handles that case (shows an info
  message instead of failing silently) but the simple, no-email-dependency flow only works
  with confirmation off.
- If magic link or OTP is revisited later (e.g. once custom SMTP is set up), don't delete
  `/auth/callback` — it's dormant, not dead, and is what a link-based flow would need again.

## `Database` type (`src/lib/supabase/types.ts`)

`@supabase/supabase-js` requires the exact `GenericSchema` shape — a missing field silently
makes `insert()` / `update()` infer as `never` instead of raising a clear error. Whenever a
new table is added, every table type **must** include all 4 fields:

```ts
some_table: {
  Row: { ... };
  Insert: { ... };
  Update: Partial<{ ... }>;
  Relationships: [];   // required, even with no foreign keys
};
```

And the `public` schema must include `Views: Record<string, never>` and
`Functions: Record<string, never>` if views/RPC aren't used. Missing any of the above produces
a confusing error like
`Object literal may only specify known properties, and 'x' does not exist in type 'never[]'`.

## Database & RLS

- Every new **per-user** table **must** have `enable row level security` and a policy
  `using (auth.uid() = user_id)` for select/insert (and delete if needed). Never disable RLS
  "just to make debugging easier". The one exception is shared/admin infrastructure with no
  per-user owner (e.g. `gemini_api_key_pool`): still `enable row level security`, but add zero
  policies and access it only via the service-role client (`@/lib/supabase/admin`) — see
  "Gemini API key pool" below.
- New migrations go in `supabase/migrations/<YYYYMMDDHHMMSS>_description.sql` — the same
  timestamp-prefix convention the Supabase CLI itself generates (`supabase migration new`),
  so filenames sort chronologically and stay compatible with `supabase db push` if the project
  ever adopts the CLI. Use the file's actual creation time. Don't edit an already-applied
  migration — write a new one to change the schema.
- Update `src/lib/supabase/types.ts` every time the schema changes, keeping it in sync with
  the migrations.

## API routes calling Gemini

- Always check `user` via `supabase.auth.getUser()` first and return `401` if not
  authenticated.
- Always rate-limit before calling Gemini (currently: count `stories`/`chat_logs`/`writings`
  created today, compare against the matching `MAX_*_PER_DAY`) — this is now **always**
  enforced per user, regardless of which pooled key ends up serving the request (see "Gemini
  API key pool" below). If a new AI-calling feature is added, apply the same daily-count
  mechanism — don't skip rate limiting "just for testing".
- Call Gemini via `generateWithKeyPool()` (`src/lib/gemini/pool.ts`), never by constructing a
  `GoogleGenAI` client directly in a route — the pool helper is what makes rotation/fallback
  work. The only file allowed to instantiate `GoogleGenAI` directly is `pool.ts` itself (plus
  `src/lib/gemini/client.ts` for the last-resort fallback instance).
- Wrap the Gemini call in its own `try/catch`, return a user-friendly Vietnamese error message,
  and `console.error` the original error for debugging — never leak a raw error to the
  response.
- Never expose `GEMINI_API_KEY` or any secret on the client — only use it inside a Route
  Handler (server-side).
- The per-story word cap (`MAX_WORDS_PER_STORY`) lives in `src/lib/constants.ts` — a shared
  file, since both `generate-story` (sampling from a topic) and `scan-vocabulary`/manual add
  (capping how much can be scanned/added) need the same limit. Update it there if the limit
  changes.
- The story generation call uses `responseMimeType: "application/json"` +
  `responseSchema` (see `buildStoryResponseSchema()` in `src/app/api/generate-story/route.ts`)
  to get the story, Vietnamese translation, and per-word IPA/Pinyin + meaning in one structured
  call instead of separate prompts/requests. Prefer this pattern over parsing free-form text
  whenever a new AI feature needs more than one field back.
- Story length scales with word count (`minWords`/`maxWords` in the route, roughly
  12–20 words of story per vocabulary word, floored at 40–90) instead of a fixed range —
  a fixed 100-200 word target made 1-2 word stories feel padded. Pass concrete numbers into
  the prompt (`between ${minWords} and ${maxWords} words`); a vague "roughly N words per
  word" instruction is not reliably followed by the model.
- Each generation call is a fresh, stateless `generateContent` request — Gemini does **not**
  see previous stories, so any recurring theme across stories is coincidence, not memory. The
  system instruction explicitly asks it to vary setting/characters/plot per call to reduce
  that. `TopicDetail`'s "Tạo câu chuyện khác" button re-calls the API with the same `topicId`
  to get a different story on demand — it's a real new API call (counts against
  `MAX_STORIES_PER_DAY`), not a client-side reshuffle; if the topic has more words than
  `MAX_WORDS_PER_STORY`, the route also re-samples a fresh random subset each call (see
  "Vocabulary topics" below), so a regenerate can genuinely use a different set of words too.
- Per-word `meaning`: a user-entered meaning (saved on the topic word) always wins; the
  AI-generated one only fills the gap when the word had no meaning yet (see the merge in the
  route, `entry.meaning || ai?.meaning`) — and that AI-filled meaning is then best-effort
  written back onto the topic's word row so it doesn't stay blank next time. Don't overwrite a
  user's own input with the AI's.

## Gemini API key pool (replaces per-user keys)

- The app rotates through a server-managed pool of Gemini API keys
  (`gemini_api_key_pool` table) instead of asking each user to bring their own key. This
  **replaces** the earlier "user enters their own Gemini API key" feature entirely — there is
  no `/settings` page, no `GeminiKeyForm`, no `/api/user-settings/gemini-key` route anymore.
  Purpose: multiply the effective free-tier daily quota across all users without requiring any
  action from them.
- All three AI-calling routes (`generate-story`, `chat`, `writing`) call
  `generateWithKeyPool()` (`src/lib/gemini/pool.ts`) instead of a route-local `GoogleGenAI`
  client, and always enforce their `MAX_*_PER_DAY` rate limit — there's no "skip the limit"
  path anymore since there's no concept of a user's own key.
- **Rotation is sticky, not round-robin**: `generateWithKeyPool()` always tries the lowest
  `sort_order` row with `is_valid = true` first, and keeps using that same key for every
  request until it hits a quota error — only then does it mark that row `is_valid = false` and
  move to the next one. Don't change this to round-robin; the whole point is draining one key
  fully (maximizing its daily quota) before touching the next.
- A quota error is detected by matching `RESOURCE_EXHAUSTED`, `429`, or `quota` in the thrown
  error's message (`isQuotaError` in `pool.ts`). Any other error (bad request, network failure,
  etc.) is rethrown immediately without touching the pool or trying another key — only quota
  exhaustion should trigger rotation.
- An invalidated key gets a chance to retry automatically ~20h later
  (`RETRY_AFTER_HOURS` in `pool.ts`), since Gemini's free-tier daily quota resets roughly every
  24h. If every key is currently invalid and none has passed its retry window, the pool query
  returns nothing and the helper falls through to the single shared `GEMINI_API_KEY` env var
  (`src/lib/gemini/client.ts`) as a last resort — keep that fallback, don't remove it even
  though the pool is meant to be the normal path.
- Each pooled key is **encrypted before it ever reaches the database**
  (`src/lib/crypto.ts`, AES-256-GCM, keyed off the server-only `ENCRYPTION_KEY` env var) and
  only decrypted server-side, inside `generateWithKeyPool()`, right before use.
- `gemini_api_key_pool` is read/written exclusively via `createAdminClient()`
  (`src/lib/supabase/admin.ts`), a Supabase client built with `SUPABASE_SERVICE_ROLE_KEY` that
  bypasses RLS entirely. The table has RLS **enabled with zero policies** — there's no
  `auth.uid()` owner for shared infrastructure like this, so don't add an anon/authenticated
  policy to it; the service-role client is the only intended access path. Never import
  `createAdminClient` from anything that runs in the browser.
- Add a key to the pool with `node scripts/add-gemini-key.mjs <api-key> [label]` — it
  reimplements the same AES-256-GCM encryption inline (a plain `.mjs` script can't import
  `src/lib/crypto.ts`'s TypeScript) and auto-assigns the next `sort_order`. Don't insert keys
  by hand through the SQL editor — the encryption has to match `decrypt()`'s exact format
  (`iv:authTag:ciphertext`, each base64) or the pool will silently fail to decrypt that row.
- `user_settings.gemini_api_key` and its migration/RLS are left in place but **dormant** — not
  read or written by any current code path. Don't delete the table or `src/lib/crypto.ts`'s
  `maskKey` (still used by the CLI script's confirmation output) without discussing first.

## Vocabulary topics (`/vocabulary`, `/vocabulary/[topicId]`)

- **Replaced (2026-08-08) the old flow of typing a fresh word list and immediately generating
  one story from it.** `/vocabulary` is now a topic list (`TopicList.tsx`): create a "chủ đề"
  (icon + name + optional description, language fixed at creation time from the active
  `useLanguage()` toggle), then open it (`/vocabulary/[topicId]`, `TopicDetail.tsx`) to
  accumulate words into it over time — via the manual add form or the photo scanner — and
  generate a story from however many words it currently holds, whenever you want. Don't bring
  back a "type words → generate immediately" page; that's what this replaced and why.
- Topic creation is a **modal**, not an inline expanding form — picked emoji icon
  (`TOPIC_ICONS` in `TopicList.tsx`, stored in the `vocabulary_topics.icon` column, default
  `📚`) shown as a live preview badge next to the modal title, uppercase field labels
  (`TÊN CHỦ ĐỀ *` / `MÔ TẢ`), Hủy/submit footer. The icon is purely decorative (shown on the
  topic card and the topic detail header) — don't read anything into it server-side.
- `vocabulary_entries` gained a `topic_id` column (migration
  `20260808101216_add_vocabulary_topics.sql`) and is now the live word bank a topic's words are
  read from — see the note about this in "Vocabulary review" below. Old rows from before this
  migration keep `topic_id = null` and are simply invisible to every new query (all of which
  filter on `topic_id`); they're intentionally not backfilled or deleted.
- `generate-story` takes `{ topicId }` in its POST body — **not** a `words` array or
  `language` anymore. It looks up the topic (ownership-checked via `.eq("user_id", user.id)`),
  reads the topic's own `language` column, and fetches every `vocabulary_entries` row with
  that `topic_id`. If the topic has more words than `MAX_WORDS_PER_STORY`, it takes a random
  sample rather than always the first N — so regenerating from a large, long-lived topic
  actually surfaces different words each time instead of being stuck on the same subset
  forever.
- **Optional `{ wordIds }`** in the same request scopes the story to one specific batch of
  words instead of sampling from the whole topic (still `.eq("topic_id", ...).eq("user_id", ...)`
  first, `wordIds` only narrows further — never a way to reach another user's or another
  topic's words). This exists so a topic can keep accumulating words indefinitely (many scans
  over time) while each scanned batch can still get its *own* dedicated story instead of every
  generation mixing the whole growing pool together. `TopicDetail.tsx` uses this right after
  `handleSavePending()`: the just-inserted rows' ids become `lastBatchIds`, surfaced as a
  one-off amber banner ("🪄 Tạo câu chuyện riêng cho batch này") that disappears once used or
  dismissed. The plain "Tạo câu chuyện từ chủ đề này" / "Tạo câu chuyện khác" buttons still
  call `generate-story` with no `wordIds`, keeping the existing whole-topic-sample behavior.
- Adding words to a topic happens two ways, both inserting directly into `vocabulary_entries`
  from the client (RLS-protected, no API route needed — same pattern as deleting a story):
  - **Manual add** (`TopicDetail`'s "+ Thêm từ" form): one word + optional meaning at a time,
    inserted immediately on submit.
  - **Photo scan**: reuses `/api/scan-vocabulary` unchanged (it just extracts words from an
    image; it doesn't know about topics), but the *client-side* handling is different from the
    old `VocabularyForm` — see "Scan vocabulary from a photo" below for the review-before-save
    step.
  Both paths de-duplicate case-insensitively against words already in the topic
  (`isDuplicate()` in `TopicDetail.tsx`) before inserting, so re-scanning a page you already
  added doesn't create duplicate word chips.
- Removing a single word from a topic (`handleDeleteWord`) does **not** go through
  `ConfirmDialog`, unlike every other delete in the app — deliberately: a single word is
  trivial to re-add (unlike losing an entire story or writing), so a confirmation prompt would
  just be friction. Deleting an entire **topic** (`TopicList`) *does* use `ConfirmDialog`,
  since that cascades (`on delete cascade` on `vocabulary_entries.topic_id`) and destroys every
  word in it at once — a much higher-stakes action.
- A topic word getting a meaning backfilled by a story-generation call (see the note in "API
  routes calling Gemini" above) means the topic's own word list can end up more complete over
  time purely from generating stories — that's intentional, not a side effect to prevent.

## First-visit onboarding hint (`src/components/OnboardingHint.tsx`)

- A one-time spotlight tooltip (dashed highlight ring + amber callout bubble, arrow pointing
  at the target) for first-time visitors, currently wrapped around `TopicList`'s "+ Tạo chủ đề"
  button — the very first action a new user needs on the redesigned `/vocabulary`. Persisted
  per-browser in `localStorage` (`voca:onboarding-seen`), same reasoning as the language
  toggle: a personal "have I seen this" flag, not account data, so it deliberately has no DB
  column and doesn't sync across devices/resets on a fresh browser.
- Dismisses permanently three ways: the ✕ button, "Bỏ qua hướng dẫn", or simply clicking the
  highlighted target itself (`onClickCapture` on the wrapper — using the feature is as good as
  reading about it, don't make the user dismiss it separately after they've already acted).
- `TopicList` only renders it while `topics.length === 0` — this both targets genuinely new
  users (nothing created yet) and automatically skips it for anyone who already has topics
  (existing users from before this feature shipped, or someone who created a topic in a
  previous session before ever seeing/dismissing the hint), without needing extra logic beyond
  the render condition already there.
- `OnboardingHint` is written as a generic reusable wrapper (`title`/`description`/`children`),
  not hardcoded to this one button — reuse it for future onboarding call-outs rather than
  building a second one-off tooltip component. It intentionally does **not** attempt a
  multi-step guided tour (no shared "which step" state, no cross-page persistence of tour
  progress) — that's a meaningfully bigger feature than what was asked for; if a multi-step
  tour is wanted later, that's worth discussing as its own design rather than bolting onto
  this component.

## Scan vocabulary from a photo (`/api/scan-vocabulary`)

- Lets a learner photograph or upload an image (notebook page, textbook, flashcards) instead
  of typing words by hand. `TopicDetail`'s hidden file input (`accept="image/*"
  capture="environment"`) opens the phone camera directly on mobile while still falling back
  to a normal file picker (with gallery access) on desktop/unsupported browsers — don't remove
  `capture`, it's what makes "chụp ảnh" the default action instead of "chọn file".
- The photo is downscaled client-side first (`src/lib/image.ts`, `compressImageToBase64` — max
  1600px on the long edge, JPEG quality 0.85) before being base64-encoded and POSTed. This
  keeps the payload well under Vercel's serverless body-size limit and reduces Gemini's image
  token cost; don't send the original full-resolution file.
- The route sends the image as multimodal input (`parts: [{ text }, { inlineData: { mimeType,
  data } }]`) through `generateWithKeyPool()` like every other Gemini call — same key pool,
  same `try/catch` → friendly-Vietnamese-error pattern, same rules apply.
- **Rate-limited by its own table, `vocab_scans`** (mirrors `chat_logs` exactly: just
  `user_id` + `created_at`, no image or extracted-word content stored), compared against
  `MAX_VOCAB_SCANS_PER_DAY`. This is deliberately separate from `MAX_STORIES_PER_DAY` — scanning
  a photo doesn't create a story by itself, it only fills in the form, so it needs its own
  daily budget rather than borrowing another feature's.
- The extraction prompt explicitly forbids inventing a meaning: `meaning` is only filled in if
  it's *also visibly written next to the word in the image itself* (e.g. a bilingual word
  list); otherwise the model must return an empty string. Don't relax this to "guess a
  reasonable meaning" — that would silently produce wrong meanings the learner didn't ask for
  (the AI-generated meaning during actual story generation is a different, intentional case).
- The route itself just extracts words from an image — it doesn't know about topics. Scanned
  words come back to `TopicDetail` as a **pending review list** (editable word/meaning,
  removable per row) rather than being saved immediately; the learner reviews for OCR mistakes
  and clicks "Lưu N từ vào chủ đề" to bulk-insert them into `vocabulary_entries`. Don't skip
  this review step — the whole point is catching bad OCR before it permanently pollutes a
  topic's word bank.
- Scanning is language-aware like every other content-generating feature: it sends the
  app-wide `language` from `useLanguage()` and asks the model to extract that language's words
  specifically, so scanning a Chinese vocabulary list while in English mode won't happen.

## Conversation practice (`/chat`)

- `src/app/api/chat/route.ts` is **stateless**: the client (`ChatSession.tsx`) resends the
  full message history (capped to the last `MAX_HISTORY_TURNS = 20`) on every turn, and the
  route just forwards it as Gemini's `contents` array (`{role: "user"|"model", parts:[{text}]}`).
  There's no server-side chat session object and no persisted transcript — don't add one just
  to "simplify" the client; a serverless route can't hold state between requests anyway, so
  resending history is the only correct approach here, not a shortcut.
- `chat_logs` exists **only** for rate-limiting (mirrors the `stories`/`MAX_STORIES_PER_DAY`
  pattern, `MAX_CHAT_MESSAGES_PER_DAY` env var, always enforced — see "Gemini API key pool"
  above). It stores no message content — just `user_id` + `created_at` — because the
  conversation itself is never persisted. Don't add columns to store chat text there; if real
  conversation history/logging is wanted later, that's a different, deliberate feature — not
  something to bolt onto the rate-limit table.
- The system instruction pulls up to 10 of the user's own `vocabulary_entries` words and asks
  Gemini to naturally reuse them in conversation — this is what ties `/chat` back to the app's
  "learn through context" premise instead of being a generic chatbot. Keep that when editing
  the prompt.
- AI replies are automatically read aloud via `speak()` (same TTS helper as everywhere else)
  the moment they arrive — that auto-play is the actual point of this feature ("AI nói tương
  tác lại"), don't make it opt-in/behind a button.
- Voice input (`getSpeechRecognitionConstructor`, from `src/lib/pronunciation.ts`, already used
  by `PronunciationCheck`) fills the text input rather than auto-sending — the learner can
  review/edit a mis-transcribed sentence before it's sent, consistent with how the rest of the
  app treats speech recognition as an input aid, not a blind auto-submit.

## Writing practice (`/writing`, `/writing/history`)

- Structure is fixed: title (required) + overview/conclusion (optional) + body (required) —
  matches how the user described the feature. Don't make title/body optional; the AI feedback
  prompt and the history list both assume they exist.
- `writings` is a normal per-user table (same `auth.uid() = user_id` RLS shape as `stories`),
  **not** a rate-limit-only table like `chat_logs` — it stores the full essay text and the AI's
  feedback, because (unlike `/chat`) the whole point here is a persistent history the user
  re-reads later.
- The Gemini call in `src/app/api/writing/route.ts` returns **plain text feedback**, not
  structured JSON — unlike `generate-story`, there's only one field to get back (the feedback
  itself), so a `responseSchema` would just be overhead. Only reach for structured JSON output
  when a call genuinely needs multiple distinct fields back.
- Feedback failure must never block saving the essay: the Gemini call is wrapped in its own
  `try/catch` that only sets `feedback = null` on error and continues to the `insert` — a
  learner's work should never be lost because the AI call happened to fail. `WritingForm`
  reflects that: if `feedback` comes back null it shows "chưa lấy được nhận xét" instead of an
  error, since the save itself still succeeded.
- Rate limiting follows the same pattern as `stories`/`chat_logs`: count `writings` rows
  created today, compare to `MAX_WRITINGS_PER_DAY`, always enforced. Keep this consistent if a
  fourth AI-calling feature is ever added — don't invent a different limiting mechanism per
  feature.
- Deleting a writing (`WritingHistoryList`) follows the same pattern as deleting a story:
  browser client, direct `.delete()`, RLS-protected, no API route needed, confirmed via the
  shared `ConfirmDialog` component — not `window.confirm`.

## Grammar reference (`/grammar`)

- **Deliberately static, not AI-generated** — `src/lib/grammar-data.ts` hand-curates all 12
  English tenses (structure, usage, signal words, examples, question/short-answer patterns)
  plus a matching multiple-choice question bank (`GRAMMAR_QUESTIONS`). Grammar rules are fixed
  and objective, unlike a story's wording — generating them fresh via Gemini each time would
  risk the model hallucinating an incorrect rule or, worse, marking an exercise answer wrong
  when it's actually right. Don't switch this to an AI call "for variety"; add more hand-written
  questions to the bank instead if it needs to feel less repetitive.
- **English-only regardless of the app-wide language toggle** (`useLanguage()` from
  `src/lib/language-context.tsx`) — tenses are an English-specific grammar concept, so this
  page doesn't read or react to the Anh/Trung switcher at all, unlike every other
  content-generating feature. Don't wire it up to `language`; that switch controls what
  language new vocabulary/stories/chat/writing are *in*, which isn't relevant to a fixed
  grammar reference.
- `/grammar` is behind login (added to `PROTECTED_PATHS` in `src/lib/supabase/middleware.ts`)
  for consistency with the rest of the app's learning tools.
- `GrammarTenseList.tsx` (browse: expandable card per tense) is the shared entry point for
  **two** separate practice modes, each scoped to one tense or `"mixed"` (all 12):
  - **Multiple-choice** (`GrammarQuiz.tsx`, `GRAMMAR_QUESTIONS` in `grammar-data.ts`) — fully
    static, no AI call. Grading a typed grammar answer reliably needs the same kind of
    loose-matching logic `ReviewSession` already fights with for Vietnamese meanings, and
    grammar answers have far less acceptable variation than a translation does — MCQ sidesteps
    that ambiguity and keeps grading 100% deterministic. Don't switch this to an AI call "for
    variety"; add more hand-written questions to `GRAMMAR_QUESTIONS` instead.
  - **Dịch câu (Việt → Anh)** (`GrammarTranslationPractice.tsx`, prompts from
    `TRANSLATION_PROMPTS` in `grammar-data.ts`, graded by `POST /api/grammar/check`) — this
    *is* AI-graded, unlike everything else in this feature, because judging a free-written
    sentence for "did they use this tense correctly and does it mean the right thing" isn't
    something a static answer key can do (unlike MCQ, there's no finite list of correct
    strings to match against). The route sends the Vietnamese sentence, the target tense name,
    and the learner's attempt to Gemini via `generateWithKeyPool()` with a structured
    `{correct, feedback, correctedSentence}` response schema — same key-pool/try-catch/
    Vietnamese-error pattern as every other AI route. `TRANSLATION_PROMPTS` entries are
    intentionally *different* Vietnamese sentences from each tense's `examples` shown on the
    reference card, so the practice sentence isn't something the learner can just read the
    answer to a few lines above.
  - Rate-limited via its own table, `grammar_checks` (mirrors `chat_logs`/`vocab_scans` —
    just `user_id` + `created_at`, no sentence/feedback content stored), compared against
    `MAX_GRAMMAR_CHECKS_PER_DAY`. Only the translation mode counts against this; MCQ is free
    and unlimited since it costs no AI call.
  - Both modes reuse `ReviewSession.tsx`'s shuffle-deck/score/retry pattern — reuse that
    structure rather than inventing a third quiz flow if a fourth is ever added.

## Voice (text-to-speech)

- Pronunciation/story playback uses the browser's built-in Web Speech API
  (`window.speechSynthesis`, wrapped in `src/lib/speech.ts`) — free, no API key, no extra
  dependency. Don't introduce a paid TTS API (Gemini TTS, ElevenLabs, etc.) unless explicitly
  asked, since it would break the free-tier-only constraint.
- Buttons that call `speak()` render unconditionally (no `typeof window` check at render time)
  to avoid SSR/hydration mismatches — `speak()` itself no-ops safely if the browser doesn't
  support `speechSynthesis`.
- In `StoryCard`, each vocabulary chip has two independent click targets: the 🔊 icon speaks
  the word, the word text itself toggles a "show meaning" panel below the chip (per-chip
  `openWords` state, a `Set<number>`). Don't merge these two actions back into one click
  handler — they were split on purpose so the two behaviors don't fight each other.
- Deleting a story (`StoryCard`'s optional `id`/`onDeleted` props) deletes directly from the
  client via `@/lib/supabase/client`'s browser client (RLS's `stories_delete_own` policy is
  the only thing enforcing ownership — no API route needed for a plain delete-your-own-row).
  `StoryCard` only shows the 🗑️ button when an `id` prop is passed, so the same component
  stays usable for the just-generated result on a topic page (no `id` yet, no delete button)
  and for `/history` rows (has `id`). `HistoryList` (client) owns the list state so a delete
  updates the UI immediately without a refetch — the same
  Server-Component-fetches/Client-Component-mutates split as `TopicDetail`.
- Destructive confirmations use `src/components/ConfirmDialog.tsx`, not the browser's native
  `window.confirm()` — the native dialog can't be styled and looks jarringly out of place
  against the app's custom theme. Reuse `ConfirmDialog` for any future destructive action
  instead of reaching for `window.confirm`/`window.alert` again. Not every deletion needs it,
  though — see "Vocabulary topics" below for the one deliberate exception.

## Study streak

- The daily streak (`src/lib/streak.ts`, `getStudyStreak`) is **derived** from
  `stories.created_at` — a day counts if the user generated at least one story that day. No
  separate streak table/column. Don't add one; recompute from `stories` instead, to avoid two
  sources of truth that can drift.
- "Day" boundaries use local server time (`new Date()`, `getFullYear/Month/Date`), matching how
  `MAX_STORIES_PER_DAY` rate limiting already defines "today" — keep both conventions in sync
  if either changes.
- Server Components that need the streak call `getStudyStreak(supabase, user.id)` directly
  (see `Navbar.tsx`, `vocabulary/page.tsx`). Pages needing both server-fetched data (streak,
  topic list) and client interactivity (forms, buttons) split into `page.tsx` (Server
  Component, fetches data) + a `"use client"` component for the interactive part (see
  `TopicList.tsx`, `TopicDetail.tsx`) — don't make the whole page a Client Component just
  because part of it needs `useState`.

## Vocabulary review (`/review`)

- **Review decks are scoped one-per-story, never merged.** `review/page.tsx` reads `stories`
  (`id, content, vocabulary_used, created_at`) directly — each story's own `vocabulary_used`
  jsonb array *is* its deck. `ReviewStoryList` shows a picker (snippet + word chips + date);
  picking one renders `ReviewSession` scoped to just that story's words. Don't go back to
  pooling every word the user has ever studied into one combined deck — that was the previous
  design and was deliberately replaced because (a) it merged unrelated stories' vocabulary
  together, and (b) deleting a story didn't remove its words from review.
- This also means **no separate table is needed for review or for cascade-delete**: a story's
  words live only inside that story's row, so deleting the story (`StoryCard`'s existing
  delete flow) automatically removes its words from `/review` too — for free, via normal row
  deletion. If a future feature needs a "words from every story combined" view, derive it by
  reading all `stories` rows and flattening client/server-side — don't reintroduce a
  denormalized word table to get there.
- **`stories.topic_id`** (migration `20260808174434_add_story_topic.sql`) tags which topic a
  story was generated from, purely so `/history` and `/review` can filter/find things by topic
  once a user has several — it does **not** change the "decks are never merged" rule above;
  filtering by topic just narrows *which* one-per-story decks are shown in the picker, it
  never combines their words. `on delete set null` (not cascade) on this column is deliberate:
  deleting a topic must not delete the stories already generated from it, same reasoning as
  why review reads each story's frozen `vocabulary_used` snapshot instead of the live topic —
  a past story stays reviewable even after its source topic is gone, just shown under the
  "Khác" filter pill instead of a named one. `HistoryList.tsx`/`ReviewStoryList.tsx` both
  render the same topic-filter-pills pattern (`Tất cả` / one pill per topic actually in use /
  `Khác` for untagged stories) — reuse that pattern, don't build a different filter UI for a
  third list if one's ever added.
- `vocabulary_entries` is **no longer dormant** — since the topic redesign (see "Vocabulary
  topics" below) it's the live per-topic word bank that `generate-story` reads *from*. Review
  itself still only reads each story's own frozen `vocabulary_used` snapshot, not
  `vocabulary_entries` directly — a story's deck doesn't change retroactively if its source
  topic's words are edited/deleted afterward, which is the correct behavior (a past story
  should stay reviewable exactly as it was generated).
- Within a deck, words are deduped by lowercased word and filtered to ones with a non-empty
  `meaning` (both quiz directions need one to grade against) — same rules as before, just
  scoped per-story now (`review/page.tsx`).
- Grading (`src/components/ReviewSession.tsx`, `isCorrectAnswer`): the Việt→Anh direction
  requires a normalized exact match (English words are standardized enough for that); the
  Anh→Việt direction uses a looser containment match, since a Vietnamese meaning is often
  phrased several valid ways (e.g. "táo" vs "quả táo"). The correct answer is always revealed
  after submitting either way, so an auto-grading false negative is still visible to the user.
  Don't switch to strict equality for the Vietnamese direction — it was loosened on purpose.
- Wrong answers accumulate in `wrongCards` (reset on every `beginDeck`/new session) and, on
  the results screen, unlock a "Luyện lại câu sai" button that starts a new deck scoped to
  just those cards via `retryWrongCards`. `startSession` and `retryWrongCards` both funnel
  through the shared `beginDeck` helper — don't duplicate the deck-building/shuffle logic
  when adding another way to start a session. `ReviewSession` also takes an `onExit` prop
  (wired to "← Chọn câu chuyện khác" / "Chọn câu chuyện khác") to pop back up to
  `ReviewStoryList`'s picker — a third navigation level above `setMode(null)` (back to mode
  picker) and `beginDeck` (back to card 1 of the same deck).
- If a card's meaning is wrong (typically a mistyped meaning from adding words into a topic,
  or an AI-filled one that wasn't quite right), `EditableMeaning` lets the user fix it inline
  wherever the meaning is shown
  (the vi-en prompt, or the revealed en-vi answer) — saves via
  `PATCH /api/stories/[id]/vocabulary` (`storyId` in the URL, `{word, meaning}` in the body),
  which finds the matching entry inside *that one story's* `vocabulary_used` array and updates
  only its `meaning`. This is intentionally scoped to one story, not global — the same word
  can have independent copies (and independently-fixed meanings) across different stories,
  matching the "decks are never merged" rule above. `EditableMeaning` therefore requires a
  `storyId` prop; don't make it optional.
- If the user pronounces a word correctly (`PronunciationCheck`'s `onResult`) after already
  submitting a wrong text answer for that card, `ReviewSession.handlePronunciationResult`
  flips that card's verdict to correct instead of leaving a confusing "🎤 correct" next to a
  "❌ Chưa đúng" on screen. Guarded by `pronunciationOverridden` so it only fires once per
  card and never double-counts the score.
- Pronunciation check (`src/components/PronunciationCheck.tsx`) uses the browser's
  `SpeechRecognition` / `webkitSpeechRecognition` API — free, no key, no dependency, same
  "free-tier only" reasoning as the `speak()` TTS helper. It has no official TypeScript types
  in `lib.dom`, so `src/lib/pronunciation.ts` declares a minimal local interface instead of
  pulling in an extra `@types` package. Not all browsers support it (notably Safari/Firefox
  are inconsistent) — the component must degrade to an "unsupported" state, never throw.

## Multi-language support (English + Chinese)

- `src/lib/constants.ts` exports `Language = "en" | "zh"`, `LANGUAGES` (id/label/flag, used to
  render the language picker), `SPEECH_LANG` (BCP-47 codes for TTS/speech recognition), and
  `isLanguage()` (a type guard for parsing `language` out of an untrusted request body). Any
  new language-aware code should go through these, not a locally re-declared union.
- `stories`, `writings`, and `vocabulary_entries` each have a `language text not null default
  'en'` column (migration `20260729223259_add_language_support.sql`) with a check constraint
  limiting it to `'en' | 'zh'`. Existing rows default to `'en'` since everything before this
  migration was English-only. A story/writing's language is fixed at creation time — there's
  no "convert this deck to another language" operation.
- The per-word `ipa` field on `VocabularyItem` is reused for Chinese too — it holds an IPA
  transcription for English words and a Pinyin romanization (with tone marks, e.g. `nǐ hǎo`)
  for Chinese words. Don't rename the field or add a parallel `pinyin` field; treat `ipa` as
  "however this word's pronunciation is written," not literally IPA.
- `generate-story`'s `STORY_RESPONSE_SCHEMA` became `buildStoryResponseSchema(language)` — the
  JSON shape is identical across languages, only the `ipa` field's schema *description* changes
  (asks the model for IPA vs Pinyin) and the system instruction's target language changes.
  Follow this pattern (vary the prompt, not the schema) if a third language is ever added.
- **Chat corrections stay in the target language for English, but switch to Vietnamese for
  Chinese** (`correctionLanguage` in `src/app/api/chat/route.ts`): correcting an English
  mistake in English is immersive and the learner can still follow it; correcting a Chinese
  mistake in Hán tự a beginner can't read yet defeats the point, so those corrections go in
  Vietnamese instead. Don't unify this to one language for both.
- Chat's vocabulary-context lookup (`vocabulary_entries`) filters `.eq("language", language)`
  so an English chat session never gets Chinese words suggested into it, and vice versa.
- **Reviewing Việt→Trung typed answers grades against Pinyin, not Hán tự** — a learner without
  a Chinese IME can't reliably type characters under quiz time pressure, but anyone can type
  romanized Pinyin. `isCorrectAnswer` in `ReviewSession.tsx` branches on `language`: for `zh`
  in the `vi-en` direction it compares the typed answer against `card.ipa` (the Pinyin) via
  `normalizePinyin()` (`src/lib/pronunciation.ts` — NFD-normalizes and strips combining tone
  diacritics + spaces) instead of `normalizeForCompare()` against the Hán tự. This means a
  learner can type `"ni hao"`, `"nihao"`, or `"nǐ hǎo"` and all grade as correct — tone marks
  are optional, not required. The Anh↔Việt path is untouched (still `normalizeForCompare`
  against the word itself). Voice-based pronunciation checking (`PronunciationCheck`) still
  compares against the Hán tự (`current.word`), not Pinyin, since Chinese speech recognition
  returns characters, not romanization — only the *typed* Việt→Trung answer uses Pinyin.
- **The language to generate new content in is a single, app-wide toggle, not a per-page
  picker.** `src/lib/language-context.tsx`'s `LanguageProvider` wraps the whole app in
  `layout.tsx` and holds the current `Language`, persisted per-browser in `localStorage`
  (`voca:language`) — this is a personal UI preference, not account data, so it deliberately
  has no DB column and doesn't sync across devices. `LanguageSwitcher.tsx` (a flag + dropdown)
  is the only place it's changed, rendered in both `Navbar` (desktop) and `MobileMenu`. Every
  language-aware form (`TopicList` when creating a topic, `ChatSession`, `WritingForm`) reads
  it via `useLanguage()` — don't reintroduce a local per-form language picker; that was the
  first version of this feature and was replaced because switching languages separately on
  every page was repetitive and confusing about which one was "active". Note that
  `generate-story` no longer takes `language` in its request body at all — a topic's
  `language` is fixed at topic-creation time and the route reads it from the topic row itself
  (see "Vocabulary topics" below), so there's nothing to pass per-generation.
  `StoryCard`, `ReviewStoryList`'s deck picker, and `WritingHistoryList` are the exception:
  they show a *specific past story/writing's own* stored `language` (fixed at creation time),
  not the live global toggle, so mixed-language history stays visually distinguishable.
- `useLanguage()` throws if called outside `LanguageProvider` — every client component that
  needs the active language must be a descendant of the root layout's `<LanguageProvider>`
  (true for anything rendered inside `{children}`, so this should never actually happen).
- `speak()` and `SpeechRecognition.lang` must always be set from `SPEECH_LANG[language]` for
  the story/card/message actually being read or listened to — never hardcode `"en-US"` in a
  new call site now that a second language exists.

## Env vars

Add new variables to `.env.local.example` whenever one is introduced. Never commit the real
`.env.local` (already in `.gitignore`). `NEXT_PUBLIC_*` variables are public — never put a
secret there.

## UI / UX

- All user-facing text (buttons, form labels, error messages, page copy) stays in
  **Vietnamese** — this app targets Vietnamese speakers learning English. Code (identifiers,
  comments) stays in English.
- **Light "Notebook" neo-brutalist theme, no toggle.** This *replaced* the earlier dark
  "Navy Blue" theme (2026-08-06) — a deliberate full redesign, not a tweak. Don't revert to
  the old dark navy/amber palette or bring back `prefers-color-scheme` branching; this is a
  firm switch either way.
  - Body: `bg-[#FAF7F0] bg-[radial-gradient(#00000017_1.5px,transparent_1.5px)]
    bg-[length:22px_22px] text-black` (set on `<body>` in `layout.tsx`; `globals.css`'s
    `--background`/`--foreground` are the same-tone fallback, `#faf7f0`/`#111111`) — a warm
    cream base with a subtle dot-grid pattern, not a flat color. Keep the dot pattern; it's
    what keeps the light theme from looking like a bare default page.
  - Text scale: primary `text-black`, secondary `text-neutral-600`, muted/icon
    `text-neutral-400` — Tailwind's **neutral** scale, not `slate`/`gray`, for warm-gray tones
    that sit well on the cream background.
  - Surfaces are **white cards on a thick black border with a hard offset shadow**, not soft
    blur shadows: `rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]`.
    Highlighted/tinted cards (e.g. the just-generated story, streak banner) use
    `bg-emerald-50` instead of white, same border+shadow. This "neo-brutalism" hard-shadow
    look (flat color, no blur, no gradient on cards, offset shadow instead of soft elevation)
    is the whole point of the redesign — don't soften it back to `shadow-sm`/blurred shadows.
  - **Two accent colors, each with a specific job** (2026-08-08, revised from the initial
    single-green redesign): **emerald is primary** — main/default actions (`bg-emerald-300`),
    tinted surfaces (`bg-emerald-50` with `border-emerald-300`/`text-emerald-700`), links
    (`text-emerald-700 hover:text-emerald-800 underline`). **Amber is the secondary accent**,
    used for: the streak badge (`StreakBadge.tsx`, 🔥 reads more naturally in fire-colored
    amber than green); the standalone "Đăng nhập" nav pill (`Navbar.tsx`/`MobileMenu.tsx` — an
    entry-point action, distinct from primary in-flow actions like form submit buttons, which
    stay emerald); and **bold vocabulary words inside story text** (`BoldText.tsx`,
    `text-amber-700`) — these needed amber specifically because emerald text on the
    `bg-emerald-50` highlighted-story background had too little contrast to read as
    "bolded/important" (emerald-on-emerald visually sinks into the card). Don't use amber for
    primary CTAs/submit buttons, and don't introduce a third brand color — pick emerald or
    amber for anything new based on whether it's a primary action/surface (emerald) or a
    secondary highlight/something that needs to visually pop off an emerald-tinted surface
    (amber), not on preference.
  - **Buttons are pills with the same hard-shadow treatment**: `rounded-full border-2
    border-black ... shadow-[3px_3px_0_0_#000] transition-all hover:shadow-none
    hover:translate-x-[3px] hover:translate-y-[3px]` — hovering "presses" the button into its
    own shadow instead of just darkening a fill color. Primary = `bg-emerald-300 text-black`,
    secondary/outline = `bg-white text-black`, danger = `bg-red-300 text-black`. Every button
    across the app should follow this exact shadow-press pattern; a plain flat button
    (no border/shadow) reads as visually inconsistent with everything else now.
  - Inputs: `rounded-lg border-2 border-black bg-white text-black
    placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2
    focus:ring-emerald-300` — same thick black border as cards/buttons, not a separate
    lighter-weight style.
  - Small pill badges (streak, language switcher, deck flags): `rounded-full border-2
    border-black bg-white shadow-[2px_2px_0_0_#000]` — same family as buttons, just smaller
    and non-interactive (or with a lighter shadow if interactive).
  - Success/error tints: `bg-green-50 text-green-700 border-green-600` /
    `bg-red-50 text-red-700 border-red-600` — light-mode shades now, not the `/10`
    dark-mode-style opacity tints from before.
- No complex loading skeletons/animations — use simple status text (e.g. "Đang tạo câu
  chuyện...") in line with the "simple, clean UI" requirement.
- Routes that require auth (`/vocabulary`, `/history`) are protected in `src/proxy.ts` via
  `PROTECTED_PATHS` in `src/lib/supabase/middleware.ts`. When a new route needs auth, add it
  to that array instead of checking `user` ad hoc in multiple places.
- Story rendering (bold vocabulary, translation block, per-word IPA, voice buttons) is
  centralized in `src/components/StoryCard.tsx` + `src/components/BoldText.tsx`, used by both
  a topic page's just-generated result and `/history` (past stories). Extend that component
  rather than duplicating story markup in a page.
- The Vietnamese translation block is **collapsed by default** (`showTranslation` state in
  `StoryCard.tsx`, toggle button "▸ Bản dịch tiếng Việt (thử tự dịch trước nhé!)") — the
  learner is meant to try reading/translating the English story themselves first, using the
  translation as an answer key rather than something shown alongside the story by default.
  Don't default it to open.
- The translation also gets **bolded vocabulary words**, same as the story itself — the
  `translation` field's prompt (`buildStoryResponseSchema` description *and* the
  `systemInstruction`, both, since a schema description alone isn't reliably followed) asks
  Gemini to wrap the Vietnamese word/phrase corresponding to each bolded story word in
  `**bold**` markdown too, at its natural position in the translated sentence. `StoryCard`
  renders the translation through the same `<BoldText>` component used for the story text, so
  no separate parsing logic was needed — just reuse it.

## Before reporting a task "done"

1. `npm run lint` — must be clean, no new warnings.
2. `npm run build` — must build with no TypeScript errors (see the `Database` type section
   above if the error involves `.insert()` / `.update()`).
3. If the UI changed: run `npm run dev` and manually verify (or `curl`) at least the main
   affected route before reporting completion.
