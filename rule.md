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

- Every new table **must** have `enable row level security` and a policy
  `using (auth.uid() = user_id)` for select/insert (and delete if needed). Never disable RLS
  "just to make debugging easier".
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
- Always rate-limit before calling Gemini with the **shared** server key (currently: count
  `stories` created today, compare against `MAX_STORIES_PER_DAY`) — skip the rate limit only
  when the user has their own key (see the "Per-user Gemini API key" section below). If a new
  AI-calling feature is added, apply the same daily-count mechanism — don't skip rate limiting
  "just for testing".
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

## Per-user Gemini API key (`/settings`)

- A user can add their own Gemini key on `/settings` (`GeminiKeyForm`) instead of using the
  app's shared server key. Purpose: the shared `GEMINI_API_KEY` is one fixed credential for
  every user of the app — it does **not** automatically use each user's own Google/Gmail
  account. Without a personal key, everyone shares the same free-tier quota, which is why
  `MAX_STORIES_PER_DAY` exists. A personal key gets its own quota and skips that limit.
- The key is **encrypted before it ever reaches the database**
  (`src/lib/crypto.ts`, AES-256-GCM, keyed off the server-only `ENCRYPTION_KEY` env var) and
  stored in `user_settings.gemini_api_key`. It's only decrypted server-side, at the moment
  `generate-story` needs it to build a per-request `GoogleGenAI` client — never sent back to
  the client in plaintext. `/settings` only ever displays a masked preview
  (`maskKey`, last 4 characters).
- `generate-story`'s route checks `user_settings` first: if a (decryptable) personal key
  exists, it builds a one-off `GoogleGenAI` client from it and **skips** the
  `MAX_STORIES_PER_DAY` check entirely; otherwise it falls back to the shared `gemini` client
  from `@/lib/gemini/client` and the normal rate limit applies. Don't add a separate code path
  for this — it's the same generation logic either way, just a different client instance.
- `user_settings` has its own migration + RLS (`user_settings_select_own` etc.) — same
  one-row-per-user, `auth.uid() = user_id` pattern as every other table. If a new per-user
  setting is needed later, add a column to this table rather than creating a new one.

## Conversation practice (`/chat`)

- `src/app/api/chat/route.ts` is **stateless**: the client (`ChatSession.tsx`) resends the
  full message history (capped to the last `MAX_HISTORY_TURNS = 20`) on every turn, and the
  route just forwards it as Gemini's `contents` array (`{role: "user"|"model", parts:[{text}]}`).
  There's no server-side chat session object and no persisted transcript — don't add one just
  to "simplify" the client; a serverless route can't hold state between requests anyway, so
  resending history is the only correct approach here, not a shortcut.
- `chat_logs` exists **only** for rate-limiting the shared key (mirrors the `stories`/
  `MAX_STORIES_PER_DAY` pattern, `MAX_CHAT_MESSAGES_PER_DAY` env var, skipped when the user has
  their own Gemini key from `/settings`). It stores no message content — just `user_id` +
  `created_at` — because the conversation itself is never persisted. Don't add columns to
  store chat text there; if real conversation history/logging is wanted later, that's a
  different, deliberate feature — not something to bolt onto the rate-limit table.
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

- The review pool is read from `vocabulary_entries` (word + meaning), deduped by
  lowercased word, keeping the first entry (most recent, since queried `created_at desc`)
  that has a non-null `meaning`. Words that never got a meaning saved are excluded — both
  quiz directions need one to grade against. Don't add a separate "review deck" table; derive
  from `vocabulary_entries` like the streak derives from `stories`.
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
  when adding another way to start a session.
- If a card's meaning is wrong (typically a mistyped meaning from bulk-adding words on
  `/vocabulary`), `EditableMeaning` lets the user fix it inline wherever the meaning is shown
  (the vi-en prompt, or the revealed en-vi answer) — saves via `PATCH /api/vocabulary-entries`,
  which updates every `vocabulary_entries` row for that word (case-insensitive) for that user.
  This needs the `vocabulary_entries_update_own` RLS policy (migration
  `20260721141856_add_vocabulary_update_policy.sql`) — the table originally only had
  select/insert/delete policies, so an UPDATE silently touched 0 rows without it.
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
