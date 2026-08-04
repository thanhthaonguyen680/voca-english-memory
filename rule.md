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
  file, not duplicated between the API route and the client form, since both must enforce the
  same limit. Update it there if the limit changes.
- The story generation call uses `responseMimeType: "application/json"` +
  `responseSchema` (see `STORY_RESPONSE_SCHEMA` in `src/app/api/generate-story/route.ts`) to
  get the story, Vietnamese translation, and per-word IPA + meaning in one structured call
  instead of separate prompts/requests. Prefer this pattern over parsing free-form text
  whenever a new AI feature needs more than one field back.
- Story length scales with word count (`minWords`/`maxWords` in the route, roughly
  12–20 words of story per vocabulary word, floored at 40–90) instead of a fixed range —
  a fixed 100-200 word target made 1-2 word stories feel padded. Pass concrete numbers into
  the prompt (`between ${minWords} and ${maxWords} words`); a vague "roughly N words per
  word" instruction is not reliably followed by the model.
- Each generation call is a fresh, stateless `generateContent` request — Gemini does **not**
  see previous stories, so any recurring theme across stories is coincidence, not memory. The
  system instruction explicitly asks it to vary setting/characters/plot per call to reduce
  that. `VocabularyForm`'s "Tạo câu chuyện khác" button re-calls the API with the same word
  list (stored in `lastWords`) to get a different story on demand — it's a real new API call
  (counts against `MAX_STORIES_PER_DAY`), not a client-side reshuffle.
- Per-word `meaning`: a user-entered meaning always wins; the AI-generated one only fills the
  gap when the user left it blank (see the merge in the route, `entry.meaning || ai?.meaning`).
  Don't overwrite a user's own input with the AI's.

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

## Scan vocabulary from a photo (`/api/scan-vocabulary`)

- Lets a learner photograph or upload an image (notebook page, textbook, flashcards) instead
  of typing words by hand. `VocabularyForm`'s hidden file input (`accept="image/*"
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
- Scanned words are **merged into**, not replacing, whatever the learner already typed
  (`mergeScannedWords` in `VocabularyForm.tsx` keeps non-empty existing rows and appends the
  scan results, capped at `MAX_WORDS_PER_STORY`) — scanning a second photo (or a photo after
  typing a few words by hand) shouldn't discard prior input.
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
  stays usable for the just-generated result on `/vocabulary` (no `id` yet, no delete button)
  and for `/history` rows (has `id`). `HistoryList` (client) owns the list state so a delete
  updates the UI immediately without a refetch — the same
  Server-Component-fetches/Client-Component-mutates split as `VocabularyForm`.
- Destructive confirmations use `src/components/ConfirmDialog.tsx`, not the browser's native
  `window.confirm()` — the native dialog can't be styled and looks jarringly out of place
  against a custom dark theme. Reuse `ConfirmDialog` for any future destructive action instead
  of reaching for `window.confirm`/`window.alert` again.

## Study streak

- The daily streak (`src/lib/streak.ts`, `getStudyStreak`) is **derived** from
  `stories.created_at` — a day counts if the user generated at least one story that day. No
  separate streak table/column. Don't add one; recompute from `stories` instead, to avoid two
  sources of truth that can drift.
- "Day" boundaries use local server time (`new Date()`, `getFullYear/Month/Date`), matching how
  `MAX_STORIES_PER_DAY` rate limiting already defines "today" — keep both conventions in sync
  if either changes.
- Server Components that need the streak call `getStudyStreak(supabase, user.id)` directly
  (see `Navbar.tsx`, `vocabulary/page.tsx`). Pages needing both server-fetched data (streak)
  and client interactivity (a form) split into `page.tsx` (Server Component, fetches data) +
  a `"use client"` component for the interactive part (see `VocabularyForm.tsx`) — don't make
  the whole page a Client Component just because part of it needs `useState`.

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
- `vocabulary_entries` (and its migration/RLS) still exists and is still written to on every
  `generate-story` call, but as of this design nothing reads it anymore. Don't delete it
  without discussing first — treat it as dormant, not required, not necessarily permanent.
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
- If a card's meaning is wrong (typically a mistyped meaning from bulk-adding words on
  `/vocabulary`), `EditableMeaning` lets the user fix it inline wherever the meaning is shown
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
  language-aware form (`VocabularyForm`, `ChatSession`, `WritingForm`) reads it via
  `useLanguage()` and sends it in its POST body — don't reintroduce a local per-form language
  picker; that was the first version of this feature and was replaced because switching
  languages separately on every page was repetitive and confusing about which one was "active".
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
- **Dark "Navy Blue" theme, no toggle.** Body is the exact gradient
  `bg-[linear-gradient(180deg,#0B1220_0%,#111827_100%)] text-white` (set in `layout.tsx`;
  `globals.css`'s `--background` is `#0b1220`, just a same-tone fallback — no
  `prefers-color-scheme` branching, this is a firm switch, not a system-preference-based
  theme). These two hex stops and the card color below (`#1E293B` = Tailwind's `slate-800`)
  came directly from a user-supplied palette spec — don't "simplify" them back to a generic
  `slate-950`/`bg-black`; the exact hex on the body gradient is intentional. Everything else
  uses Tailwind's **slate** scale, not `gray`. Amber stays the single accent color, unchanged
  from the light theme, since it reads well on both.
  - **Layered depth — each step is one shade lighter than the last:** body gradient (darkest,
    custom hex) → inputs/recessed fields `bg-slate-900` → card/surface `bg-slate-800` (the
    `#1E293B` from the spec) → hover highlight inside a card `bg-slate-700`. A card's border is
    always one step lighter than its own background (`bg-slate-800` card → `border-slate-700`;
    `bg-slate-900` input → `border-slate-700` also reads fine since inputs sit inside a
    lighter card). When adding a new element, place it in this scale by what it visually sits
    on top of — don't default every surface to the same gray/slate step, that's what produced
    the flat, low-contrast draft this was corrected from.
  - Primary text: `text-white`; secondary text: `text-slate-400`; muted/icon text: `text-slate-500`
  - Amber tinted surfaces (chips, highlighted cards): `bg-amber-500/10` (or `/5`, `/15` for
    layering) with `border-amber-500/20` and `text-amber-300`/`text-amber-400` (not
    `amber-700`/`amber-800` — those are light-mode shades, too dark to read here)
  - Success/error tints: `bg-green-500/10 text-green-400`, `bg-red-500/10 text-red-400`
  - Primary amber buttons (`bg-amber-400 ... text-slate-900`) are unchanged — dark text on a
    bright amber button stays correct regardless of what's behind it.
  Don't introduce other brand colors casually.
- No complex loading skeletons/animations — use simple status text (e.g. "Đang tạo câu
  chuyện...") in line with the "simple, clean UI" requirement.
- Routes that require auth (`/vocabulary`, `/history`) are protected in `src/proxy.ts` via
  `PROTECTED_PATHS` in `src/lib/supabase/middleware.ts`. When a new route needs auth, add it
  to that array instead of checking `user` ad hoc in multiple places.
- Story rendering (bold vocabulary, translation block, per-word IPA, voice buttons) is
  centralized in `src/components/StoryCard.tsx` + `src/components/BoldText.tsx`, used by both
  `/vocabulary` (just-generated result) and `/history` (past stories). Extend that component
  rather than duplicating story markup in a page.

## Before reporting a task "done"

1. `npm run lint` — must be clean, no new warnings.
2. `npm run build` — must build with no TypeScript errors (see the `Database` type section
   above if the error involves `.insert()` / `.update()`).
3. If the UI changed: run `npm run dev` and manually verify (or `curl`) at least the main
   affected route before reporting completion.
