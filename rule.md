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
- Deploy: Vercel — was free tier, upgraded to **Pro (2026-09-04)** specifically so Serverless
  Functions can be pinned to a region (see `vercel.json` below); everything else about the
  stack still deliberately targets free tiers
- Styling: plain Tailwind CSS, no component library (shadcn, MUI...) unless explicitly asked
- Package manager: npm (don't add `yarn.lock` / `pnpm-lock.yaml`)
- **Pure helper modules live in `src/lib/utils/`** (added 2026-08-09 — `crypto.ts`, `image.ts`,
  `pronunciation.ts`, `speech.ts`, `streak.ts`, `language.ts`, later `rate-limit.ts`, `shuffle.ts`), not loose directly under
  `src/lib/`. This is for generic, mostly-stateless helper *functions* only — it does **not**
  include data modules (`grammar-data.ts`, `grammar-questions.ts`, `palace-data.ts`), shared constants (`constants.ts`),
  React context (`language-context.tsx`), or service clients (`gemini/`, `supabase/` — these
  follow their own documented, path-significant conventions below and must **not** be moved
  into `utils/`). When adding a new stateless helper function, put it in `src/lib/utils/`; when
  in doubt about whether something is a "util" vs one of the excluded categories, leave it
  where files of that same kind already live rather than guessing.
- **Shared cross-cutting domain types live in `src/lib/types.ts`** (added 2026-08-09 —
  currently just `Language`). This is distinct from `src/lib/supabase/types.ts` (the generated
  Supabase `Database` schema type — don't confuse the two or merge them). The bar for landing
  in `src/lib/types.ts` is "used across many unrelated files as a standalone type," the way
  `Language` is imported by ~20 files spanning routes/components/lib. A type that only
  describes the shape of data defined right next to it in the same file (e.g. `Room` in
  `palace-data.ts`, `Tense` in `grammar-data.ts`, `GrammarQuestion` in `grammar-questions.ts`, `StudyStreak` in
  `utils/streak.ts`) should **stay co-located with that data**, not move here — splitting a
  type away from the one constant/function it describes fragments a single cohesive concept
  for no benefit. `constants.ts` still owns the actual *values* tied to `Language`
  (`DEFAULT_LANGUAGE`, `LANGUAGES`, `SPEECH_LANG`) and imports the type from `types.ts` like
  everyone else — it does not re-export it.

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

## Auth: username + password

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
- **The login form asks for a username, not an email (2026-08-22)** — Supabase Auth's user
  model is email-based with no native username identity type, so `src/lib/utils/username.ts`
  derives a synthetic email (`<username>@voca-user.internal`) from the typed username and that
  fake address is what's actually passed to `signUp`/`signInWithPassword` under the hood. This
  is only safe because "Confirm email" is off (see below) — no email is ever sent to that
  address, and no code anywhere reads `user.email` for display, so the fake domain is never
  user-visible. `isValidUsername` restricts usernames to `[a-z0-9_]{3,20}` (normalized
  lowercase via `normalizeUsername`) both to keep the derived address a valid email format and
  to keep usernames simple; Supabase's own "email already registered" constraint is what
  enforces username uniqueness for free, so no separate uniqueness check is needed.
  `translateAuthError()` in the login page maps Supabase's email-flavored error strings back to
  Vietnamese username-flavored ones (e.g. "already registered" → "Tên đăng nhập đã được sử
  dụng") so the fake-email plumbing never leaks into user-facing text. If a real email address
  is ever needed again (e.g. for password reset), that's a bigger pivot back to email auth, not
  a tweak to this scheme.
- This requires **"Confirm email" turned OFF** in the Supabase dashboard (Authentication →
  Providers → Email), otherwise `signUp` won't return a session (`data.session` is null) and
  the user is stuck waiting on a confirmation email that can never arrive (the address isn't
  real). The login page still handles that case defensively (shows an info message instead of
  failing silently) but the whole username-based flow only works with confirmation off.
- If magic link or OTP is revisited later (e.g. once custom SMTP is set up), don't delete
  `/auth/callback` — it's dormant, not dead, and is what a link-based flow would need again.
  Note that reviving either would also mean reverting back to real email addresses, since both
  depend on actually delivering something to the user's inbox.

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
- Always rate-limit before calling Gemini (count rows in the feature's own per-call table —
  `vocab_scans` / `meaning_fills` / `palace_generations` / `grammar_checks` — created
  today, compare against the matching `MAX_*_PER_DAY`). Always enforced per user, regardless of
  which pooled key ends up serving the request (see "Gemini API key pool" below). If a new
  AI-calling feature is added, apply the same daily-count mechanism — don't skip rate limiting
  "just for testing".
- Call Gemini via `generateWithKeyPool()` (`src/lib/gemini/pool.ts`), never by constructing a
  `GoogleGenAI` client directly in a route — the pool helper is what makes rotation/fallback
  work. The only file allowed to instantiate `GoogleGenAI` directly is `pool.ts` itself (plus
  `src/lib/gemini/client.ts` for the last-resort fallback instance).
- Wrap the Gemini call in its own `try/catch`, return a user-friendly Vietnamese error message,
  and `console.error` the original error for debugging — never leak a raw error to the
  response.
- Never expose `GEMINI_API_KEY` or any secret on the client — only use it inside a Route
  Handler (server-side).
- The batch word cap (`MAX_WORDS_PER_BATCH` in `src/lib/constants.ts`) is shared by
  `scan-vocabulary`, `fill-meaning`, and `palace/generate` — they all cap how many words go
  into one Gemini call. The model id lives in `GEMINI_MODEL` (`src/lib/gemini/client.ts`) and
  the per-language pronunciation wording in `PRONUNCIATION_HINT` (`constants.ts`). (These
  were `MAX_WORDS_PER_STORY` / `STORY_MODEL` until the 2026-10-12 cleanup.)
- **Rate limiting goes through `src/lib/utils/rate-limit.ts`** — `countUsageToday(supabase,
  table, userId)` (returns `null` when the count itself fails; refuse the request in that
  case) and `logUsage(...)` (best-effort insert after a successful AI call). Don't re-inline
  the count query or a local `startOfTodayISO()` in a route; a new AI feature adds its table
  name to the `UsageTable` union there.
- Prefer `responseMimeType: "application/json"` + `responseSchema` over parsing free-form text
  whenever an AI call needs more than one field back (see `PALACE_RESPONSE_SCHEMA` /
  `SCAN_RESPONSE_SCHEMA`).
- Per-word `meaning`: a user-entered meaning always wins; an AI-generated one only fills the
  gap when the word had no meaning yet (`entry.meaning || ai?.meaning`), and that AI-filled
  value is best-effort written back onto the topic's word row so it doesn't stay blank next
  time. Don't overwrite a user's own input with the AI's.

## Gemini API key pool (replaces per-user keys)

- The app rotates through a server-managed pool of Gemini API keys
  (`gemini_api_key_pool` table) instead of asking each user to bring their own key. This
  **replaces** the earlier "user enters their own Gemini API key" feature entirely — there is
  no `/settings` page, no `GeminiKeyForm`, no `/api/user-settings/gemini-key` route anymore.
  Purpose: multiply the effective free-tier daily quota across all users without requiring any
  action from them.
- Every AI-calling route (`scan-vocabulary`, `fill-meaning`,
  `palace/generate`, `grammar/check`) calls `generateWithKeyPool()` (`src/lib/gemini/pool.ts`)
  instead of a route-local `GoogleGenAI` client, and always enforces its `MAX_*_PER_DAY` rate
  limit — there's no "skip the limit" path anymore since there's no concept of a user's own key.
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
  (`src/lib/utils/crypto.ts`, AES-256-GCM, keyed off the server-only `ENCRYPTION_KEY` env var) and
  only decrypted server-side, inside `generateWithKeyPool()`, right before use.
- `gemini_api_key_pool` is read/written exclusively via `createAdminClient()`
  (`src/lib/supabase/admin.ts`), a Supabase client built with `SUPABASE_SERVICE_ROLE_KEY` that
  bypasses RLS entirely. The table has RLS **enabled with zero policies** — there's no
  `auth.uid()` owner for shared infrastructure like this, so don't add an anon/authenticated
  policy to it; the service-role client is the only intended access path. Never import
  `createAdminClient` from anything that runs in the browser.
- Add a key to the pool with `node scripts/add-gemini-key.mjs <api-key> [label]` — it
  reimplements the same AES-256-GCM encryption inline (a plain `.mjs` script can't import
  `src/lib/utils/crypto.ts`'s TypeScript) and auto-assigns the next `sort_order`. Don't insert keys
  by hand through the SQL editor — the encryption has to match `decrypt()`'s exact format
  (`iv:authTag:ciphertext`, each base64) or the pool will silently fail to decrypt that row.
- `user_settings.gemini_api_key` and its migration/RLS are left in place but **dormant** — not
  read or written by any current code path. Don't delete this table without discussing first.
  (`src/lib/utils/crypto.ts`'s `maskKey` — originally for that dormant feature's settings UI —
  was removed 2026-08-09 as unused dead code; `scripts/add-gemini-key.mjs` has always had its
  own local copy for its confirmation output, since a plain `.mjs` script can't import
  TypeScript, so nothing else depended on the exported one.)

## Vocabulary topics (`/vocabulary`, `/vocabulary/[topicId]`)

- `/vocabulary` is a topic list (`TopicList.tsx`): create a "chủ đề" (icon + name + optional
  description, language fixed at creation time from the active `useLanguage()` toggle), then
  open it (`/vocabulary/[topicId]`, `TopicDetail.tsx`) to accumulate words into it over time —
  via the manual add form or the photo scanner. From a topic you then review its words
  (in-topic quiz) or build a Memory Palace from them.
- **`TopicDetail.tsx` is a container split across 3 files** (`TopicStoryView.tsx` was deleted
  with the Storytelling feature, 2026-09-10): `TopicDetail.tsx` owns `words`/`mode` state and
  the top-level list/review switch; `TopicWordCapture.tsx` owns the entire "get more words in"
  flow (scan button + modal, pending-review list, manual add form, and the empty-state CTA —
  they share one `scanModalOpen`/`showAddForm` trigger); `TopicWordList.tsx` owns the
  saved-word cards (inline edit/speak/delete). `Word`/`PendingWord`/`Topic` types are defined
  once in `TopicDetail.tsx` and imported as types into the other two — don't redefine them
  locally or move them to a separate types file just for this (they're this container's
  view-model, not cross-cutting domain types — see `src/lib/types.ts`'s bar).
- **Manual add is a modal (`AddWordModal.tsx`, added 2026-08-17), not the inline expanding row
  it used to be** — the inline `<form>` packed word/meaning/loại-từ/submit into one flex row,
  which wrapped awkwardly on mobile. `AddWordModal` is a fully controlled component (no state
  of its own — `newWord`/`newMeaning`/`newWordType`/`adding`/`wordError` and `handleAddWord`
  all still live in `TopicWordCapture.tsx`, same as before the extraction) so opening/closing
  it doesn't disturb the scan-modal coordination note above. Follows the same modal shell
  (overlay + `max-w-md` panel + icon-badge header + Hủy/submit footer) as `ScanPhotoModal.tsx`
  and `TopicList.tsx`'s create-topic modal — reuse that shell for any future "add a thing"
  form instead of an inline row, which is what caused this in the first place.
- Topic creation is a **modal**, not an inline expanding form — picked emoji icon
  (`TOPIC_ICONS` in `TopicList.tsx`, stored in the `vocabulary_topics.icon` column, default
  `📚`) shown as a live preview badge next to the modal title, uppercase field labels
  (`TÊN CHỦ ĐỀ *` / `MÔ TẢ`), Hủy/submit footer. The icon is purely decorative (shown on the
  topic card and the topic detail header) — don't read anything into it server-side.
- `vocabulary_entries` gained a `topic_id` column (migration
  `20260808101216_add_vocabulary_topics.sql`) and is the live word bank a topic's words are
  read from. Old rows from before this migration keep `topic_id = null` and are simply
  invisible to every new query (all filter on `topic_id`); intentionally not backfilled or
  deleted.
- Adding words to a topic happens two ways, both inserting directly into `vocabulary_entries`
  from the client (RLS-protected, no API route needed):
  - **Manual add** (`TopicDetail`'s "+ Thêm từ" form): word + optional meaning + optional word
    type (`<select>` over `WORD_TYPES`) at a time, inserted immediately on submit.
  - **Photo scan**: reuses `/api/scan-vocabulary` (now also returning an inferred `type` per
    word — see "Scan vocabulary from a photo" below), routed through `ScanPhotoModal.tsx`
    rather than a direct file-input click — see that section for the modal/sample-set details.
  Both paths de-duplicate case-insensitively against words already in the topic
  (`isDuplicate()` in `TopicDetail.tsx`) before inserting, so re-scanning a page you already
  added doesn't create duplicate word cards.
- **The saved word list renders as vertical cards, not wrapping pill chips** (redesigned
  2026-08-09, matching a reference screenshot) — each card: word + a small circular badge
  showing `word_type` (only rendered if set), the meaning underneath (or "Chưa có nghĩa"), and
  three icon buttons — ✏️ edit, 🔊 listen, 🗑️ delete. The pill-chip layout couldn't fit a
  part-of-speech badge or per-word actions cleanly, which is why this replaced it outright
  rather than bolting the new fields onto the old chip.
  - ✏️ **edit** (`handleStartEdit`/`handleSaveEdit`) opens an inline meaning input + word-type
    `<select>` in place of the meaning line — a direct `.update({ meaning, word_type })` call,
    same low-stakes-CRUD-from-the-client pattern as everything else on this page. Only meaning
    and type are editable this way; the word text itself is not (renaming the word is not a
    supported action — delete and re-add instead, consistent with how words work everywhere
    else in the app).
  - 🔊 **listen** calls the shared `speak()` helper with `SPEECH_LANG[topic.language]` — never
    hardcode a language code here, same rule as every other TTS call site in the app.
  - 🗑️ **delete** is the pre-existing `handleDeleteWord`, unchanged — still no `ConfirmDialog`
    (see below), just relocated into the card's icon row instead of being the chip's "✕".
- Removing a single word from a topic (`handleDeleteWord`) does **not** go through
  `ConfirmDialog`, unlike every other delete in the app — deliberately: a single word is
  trivial to re-add (unlike losing a whole topic), so a confirmation prompt would
  just be friction. Deleting an entire **topic** (`TopicList`) *does* use `ConfirmDialog`,
  since that cascades (`on delete cascade` on `vocabulary_entries.topic_id`) and destroys every
  word in it at once — a much higher-stakes action.
- A topic word's `meaning` and pronunciation (`ipa`) get **backfilled by Memory Palace
  generation** when they were null — Gemini already computes both per word, so writing them
  back onto the topic's row is free (no extra call). Meaning and `ipa` gap-fill
  **independently** via two separate `.is(column, null)`-guarded updates, since a word can be
  missing one but not the other — don't collapse them into a single update call.
- **The word list cards show IPA/Pinyin pronunciation** next to the word-type badge (styled
  `/ipa/`) when `vocabulary_entries.ipa` is set. Unlike `word_type`, there is **no manual
  input for `ipa`** in the add-word form or the inline edit (✏️) — it's populated only by AI
  (scan, fill-meaning, or Memory Palace generation), read-only in the topic view.
- **"📝 Ôn tập từ vựng" and "🏰 Cung điện trí nhớ" live right under the topic header**, above
  the scan/add-word controls and the word list — the two highest-value actions on the page.
  Don't move them back below the word list; if new topic-level actions are added, keep the
  "do something with this topic" buttons above the "manage this topic's raw word list"
  controls.

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

## Memory Palace (`/vocabulary/[topicId]/palace`, `/api/palace/generate`)

- **Memory Palace is now the app's single core technique** — the homepage copy is built
  entirely around it since the AI "Storytelling" feature was removed (2026-09-10). It shipped
  as a **simple first version** (2026-08-08) and was then extended with customizable rooms and
  a visual floor-plan map. Still no per-user multiple palaces (one room list per user, shared
  across every topic) and no true hand-drawn architectural layout (the "floor plan" is a CSS
  grid of room tiles, not literal room geometry) — those remain out of scope unless asked for.
- **Rooms are per-user and customizable (added 2026-08-09)** — `palace_rooms` table (migration
  `20260809122118_add_palace_rooms.sql`, composite PK `(user_id, id)`, RLS `auth.uid() =
  user_id` on all 4 operations). This replaced the original fixed shared 8-room list. Each
  user's row set is **lazily seeded**, not backfilled by migration:
  `ensureUserRooms(supabase, userId)` in `src/lib/palace-data.ts` checks if the user has any
  `palace_rooms` rows and, if not, inserts the current `DEFAULT_ROOMS` using their **exact
  original id strings** (`"living-room"`, `"kitchen"`, ...) rather than random ids — this is
  what keeps `vocabulary_entries.palace_room` values written before this feature existed still
  resolving correctly once a user's rows get seeded, with zero data migration needed.
  `ensureUserRooms` is called both from `/api/palace/generate` (before assigning rooms) and
  from the palace page itself (`page.tsx`, so a fresh user opening the room manager sees their
  seeded starter set immediately, not an empty list).
  - **`DEFAULT_ROOMS` isn't limited to whole rooms — it deliberately mixes rooms with specific
    objects inside them** (fridge, wardrobe, TV, dining table, desk, bookshelf, mirror; added
    2026-08-20, 8 → 16 stops). Real Method of Loci journeys use every distinct piece of
    furniture along a walk as its own stop, not just the room as a whole — this also roughly
    doubles how many words fit in one pass of the round-robin assignment (see below) before it
    cycles back through the same stops. The original 8 whole-room ids are **never renamed or
    removed** for the backward-compatibility reason above; new stops only ever get inserted
    alongside them. This only changes the seed for **brand-new** users — it does **not**
    retroactively add the new stops to a user who already has `palace_rooms` rows (their
    customizations are theirs; don't silently mutate them). An existing user gets the new
    stops the same way they'd add any custom room: "⚙️ Tuỳ chỉnh phòng" → "+ Thêm phòng mới" —
    `ROOM_ICONS` was extended alongside `DEFAULT_ROOMS` (🧊/👔/📺/🍽️/🪞) so those icons are
    available in the picker for exactly this.
  - **`DEFAULT_ROOMS` is ordered "outside in" (2026-08-24)** — `garden` was moved ahead of
    `front-door` (previously last, after `balcony`) so a brand-new user's default walk starts
    in the yard and moves into the house, per an explicit request for the journey to go
    "from the yard into the house". Same backward-compatibility rule as above: this only
    changes the seed order for **new** users; an existing user's own `palace_rooms` rows and
    their `sort_order` are untouched — they can drag-reorder in "⚙️ Tuỳ chỉnh phòng" to match
    if they want the same flow.
  - **`ROOM_SUGGESTIONS` (2026-08-24)** — a curated, category-grouped list (Phòng khách, Nhà
    bếp, Phòng ngủ, Phòng tắm, Phòng làm việc, Ngoài trời) of specific furniture-level stops
    (Ghế sofa, Bàn trà, Bồn rửa bát, Giường ngủ...), shown as one-tap quick-add chips in
    `PalaceRoomsModal.tsx` above the manual "+ Thêm phòng mới" form. This is purely a UI
    shortcut over the existing add-room flow — a chip click calls the same `insertRoom(name,
    icon)` a hand-typed submission would, no new capability or schema. Solves the same problem
    "🛋️ Phòng khách" being one broad catch-all stop was flagged for: a learner can now split it
    into distinct furniture pieces (sofa, coffee table, TV stand...) without typing each one
    and picking an icon by hand. A chip already present in the user's room list (case-
    insensitive name match) shows disabled with a ✓, so re-opening the modal doesn't offer
    already-added suggestions again.
- **"📖 Xem hành trình trí nhớ" (2026-08-24, `PalaceJourney.tsx`)** stitches every room's
  *already-generated* `palace_room_stories` entry into one continuous scroll, in the user's
  room order — rooms with no story yet (no words assigned, or never generated) are simply
  skipped, not shown as empty steps. Deliberately **not** a new Gemini call: the per-room
  stories already exist for this exact purpose (see `palace_room_stories` above), so this view
  is just a different way of reading content that's already in the DB, at zero extra quota
  cost. Reachable from the map view via a button next to "🔀 Ôn tất cả các phòng", disabled
  with a tooltip when no room has a story yet. If a smoother, AI-authored single narrative
  (with real transition sentences between rooms) is wanted later, that's a deliberate bigger
  step up — an explicit choice made when this shipped, not an oversight to silently upgrade.
  - **"🧭 Sơ đồ hành trình" chain map (2026-09-05)** — a second, much lighter section added
    above the per-room stories: one box per room that has at least one assigned word (icon +
    name + `word (meaning)` list), connected by a plain "→" text arrow, wrapping across lines
    as needed. No illustration, no AI call — pure client-side render off `words`/`rooms`
    already in memory, same reasoning as the prose stitching above. Requested explicitly as
    "much simpler than a reference image with drawn icons per stop" — don't add illustrated
    per-word artwork here; that's the AI-image-generation idea that was already declined
    earlier for cost reasons (see "Env vars"/Gemini pricing discussion in project history).
    Gated on words actually being placed (`palaceRoom` set), independent of whether that
    room's prose story happened to generate — so "🗺️ Xem hành trình trí nhớ" only stays
    disabled when a topic has no assigned words *and* no room stories at all.
  - **Per-word "📅 dd/mm" study date (2026-09-11)** — `vocabulary_entries.palace_added_at`
    (migration `20260911100847_add_palace_added_at.sql`) is set once by
    `/api/palace/generate/route.ts` in the same update that assigns `palace_room`, so it's
    exactly "the day this word was placed in the palace" (Method-of-Loci "learned" date), not
    the day the word was typed into the topic (`created_at`) — those can differ by however
    long a word sat pending before its first generate call. Shown next to each word in the
    chain map (`formatShortDate()` in `PalaceJourney.tsx`). Never updated again after that
    first set (a word only transitions pending → assigned once), so no `.is(column, null)`
    guard is needed on the write.
- Room **CRUD is a client-side, RLS-protected modal** (`PalaceRoomsModal.tsx`, opened via the
  "⚙️ Tuỳ chỉnh phòng" button on the palace page) — add (name + icon from `ROOM_ICONS`),
  inline rename, inline icon change, delete, and drag-to-reorder (native HTML5 drag/drop, no
  external DnD library — consistent with "plain Tailwind, no component library"). No API
  route needed, same low-stakes-CRUD-from-the-client pattern as topic words. Reordering
  persists by rewriting every room's `sort_order` to its new array index
  (`persistOrder`, a `Promise.all` batch update — small N, same shape as the palace-generate
  route's per-word batch update). **Deleting a room requires `ConfirmDialog`** (unlike single
  topic-word deletion) because it can silently orphan every word currently assigned to that
  room across *all* topics, not just one: `handleConfirmDelete` first nulls out
  `palace_room` on any `vocabulary_entries` row pointing at that room id (so those words
  become "pending" again and get reassigned on the topic's next generate call), *then*
  deletes the room row. The delete button is disabled when only 1 room remains — a palace
  needs at least one room to assign anything into.
- Room **assignment is still round-robin, not manual** — `api/palace/generate/route.ts` calls
  `ensureUserRooms()` to get the user's ordered room list, then assigns each pending word
  (`vocabulary_entries` rows with `palace_room is null`, for one topic) to
  `rooms[(startOffset + index) % rooms.length]`, where `startOffset` is how many words in
  that topic already have a room. This makes repeat calls (as a topic keeps accumulating
  words) continue the same room sequence instead of restarting at room 0 and clashing with
  earlier assignments in the same room too soon. Unaffected by which rooms exist — it's just
  cycling through whatever the user's current room list is at generation time.
- **The mnemonic imagery is AI-generated, once, and stored** — `palace_imagery` on
  `vocabulary_entries` (alongside `palace_room`) is written once per word and never
  regenerated, unlike stories which are meant to vary each time. This is deliberate: Method of
  Loci depends on a *consistent* image reinforcing the same mental location every time you
  revisit it — a different image each visit would defeat the technique, not add variety.
  `generateWithKeyPool()` is asked for "one vivid, exaggerated, slightly bizarre" Vietnamese
  sentence per word specifically because stranger/more visual imagery is what makes the
  technique work — don't tone this down to a plain, literal description.
- Rate-limited via its own table, `palace_generations` (mirrors `vocab_scans`/
  `grammar_checks` — just `user_id` + `created_at`), compared against
  `MAX_PALACE_GENERATIONS_PER_DAY`. One call processes up to `MAX_WORDS_PER_BATCH` pending
  words at once (batched into a single Gemini request), not one call per word.
- **`PalaceWalkthrough.tsx` is a container split across 3 files** (split 2026-08-12, it had
  grown to ~480 lines): `PalaceWalkthrough.tsx` owns all state (words/rooms/deck/view/etc.) and
  every handler, and renders the shared header/story-banner/progress-bar chrome plus whichever
  view is active; `PalaceMap.tsx` is a pure view of `roomStats` (props only, no state of its
  own — mastery tinting logic reuses `masteryLabel`/`MASTERED_THRESHOLD` from
  `palace-data.ts`, don't reimplement it here); `PalaceSession.tsx` renders both the active
  flashcard *and* the results screen (kept as one file since they're really one state machine
  reacting to `index >= deck.length`, not two independent views). `masteryLabel`,
  `MASTERED_THRESHOLD`, and `MAX_MASTERY` moved from this file into `palace-data.ts` since both
  `PalaceMap` and `PalaceSession` need them — don't duplicate them locally in either child. The
  `Word` view-model type is still defined once in `PalaceWalkthrough.tsx` and imported as a
  type into the two children, same pattern as `TopicDetail.tsx`'s split above.
- **`PalaceWalkthrough.tsx` has two views, `"map"` and `"session"`** (added 2026-08-09, the
  floor-plan feature). `"map"` is the landing view: a CSS grid of room tiles (`roomStats`,
  one per `rooms` entry) — **not** literal SVG/hand-drawn room geometry, a deliberate
  simplification since rooms are now dynamic in count/identity per user (see above), so there's
  no fixed architectural layout to draw. Each tile shows the room icon/name, its word count,
  and a mastery-based tint (`avgMastery` of that room's words: emerald if ≥ `MASTERED_THRESHOLD`,
  amber if partially learned, white if untouched, dashed/disabled gray if empty) — this reads
  from each word's *persisted* `palace_mastery`, unlike the session progress bar below which is
  session-only, because the map is a durable overview you glance at across visits, not a
  live in-session counter. Clicking a tile (`startRoomSession`) starts a `"session"` scoped to
  just that room's words; a separate "🔀 Ôn tất cả các phòng" button (`startFullSession`) starts
  the original whole-topic deck. `"session"` is the pre-existing sequential card flow — one word
  at a time like `ReviewSession`/`GrammarQuiz`'s card flow — room icon/name header, the imagery
  sentence, a "👁️ Từ này là gì?" reveal, then the word + meaning plus a "✅ Nhớ rồi" /
  "❌ Chưa nhớ" self-report (no AI grading, since judging free recall against a vivid image has
  no single correct-answer shape to grade against) — unchanged by the map, just no longer the
  only entry point. A "🗺️ Về sơ đồ nhà" button (`exitToMap`) returns to the map from mid-session
  or from the results screen. Don't turn the map into a second, independent quiz implementation
  — it only decides *which* words populate the same `deck`/`beginDeck` session machinery that
  already existed; reuse that rather than duplicating card-flow logic per view. Generating more
  imagery (`handleGeneratePalace`) and any room-manager change that can orphan word-room
  assignments (`onWordsAffected`, see room deletion above) both funnel through the same
  `handleWordsRefresh` → `exitToMap`, landing back on the map with fresh data rather than
  silently resuming whatever session was active — the underlying room/word set just changed,
  so continuing a stale deck could reference a room or word that no longer exists.
- **Mastery tracking (added 2026-08-09)**: `vocabulary_entries.palace_mastery` is a Leitner-
  style level (smallint, 0-5, migration `20260809093233_add_palace_mastery.sql`) nudged up on
  "Nhớ rồi" and down on "Chưa nhớ" (`handleAnswer` in `PalaceWalkthrough.tsx`, a plain
  client-side `.update()` — no API route needed, same low-stakes-CRUD pattern as deleting a
  topic word). This is deliberately a lightweight in-place counter, **not** an event-log table
  of every past review — the app doesn't need a history of individual attempts, only "how well
  is this word known right now," so there's no `palace_reviews` table and no date-based due-for-
  review scheduling. Don't add one unless a feature actually needs per-attempt history.
  - **The walkthrough deck is sorted weakest-mastery-first** (`sortByMastery`) and snapshotted
    into `deck` state **once** per session (on load, and again after generating more words) —
    it is deliberately *not* re-sorted after every single answer, since a card jumping back to
    "next" the instant you get it wrong would be a confusing moving target. This is the
    lightweight stand-in for real spaced repetition: no due-dates, just "review the words you
    know least, in a stable order, every time you open the palace."
  - Wrong answers accumulate in `wrongIds` (session-only, reset every `beginDeck`) and unlock a
    "🔁 Ôn lại N từ chưa nhớ" button on the results screen that starts a new deck scoped to
    just those words — same `beginDeck`-funnels-every-entry-point shape as
    `ReviewSession`'s `startSession`/`retryWrongCards`, reuse that pattern rather than
    duplicating deck-building logic if a similar flow is needed elsewhere.
  - The palace page header shows a progress bar + "M/N từ đã nhớ (X%)", where M is
    **`index - wrongIds.size`** — a live tally of correct answers *in the current session*
    only, out of `deck.length`. It deliberately does **not** read from persisted
    `palace_mastery` (tried first, reverted): a word already at mastery ≥ 1 from a previous
    session would make the header start at a nonzero/100% count before the user answered
    anything in the new session, which read as broken/stuck. A plain session tally — 0 at the
    start of every `beginDeck`, +1 per "✅ Nhớ rồi" — matches what a user actually watches
    while working through the deck. This is independent from the per-card "Đang học"/
    "Đã thuộc"/"Thành thạo" label, which *does* read the word's persisted, cross-session
    `palace_mastery` — so a word can show "Đang học" on its card (from an earlier session)
    while not yet counted in this session's "đã nhớ" tally (because you haven't answered it
    yet this time around). Resets automatically every `beginDeck` call (new session, restart,
    retry-wrong) since `index` and `wrongIds` both reset there.
- `TopicDetail.tsx`'s "🏰 Cung điện trí nhớ" link only shows once the topic has at least one
  word, and always routes to the palace page, which
  itself prompts "🏰 Tạo Cung điện trí nhớ cho N từ" if any words haven't been assigned a room
  yet — don't require going back to the topic page to trigger generation.
- **Richer per-word AI content + a per-room connecting story (added 2026-08-09)** — the user
  asked for a full AI-tutor-style workflow (word analysis, house-tour room path, multi-type
  quizzes, calendar-based spaced repetition with a 10-minute/1-day/3-day/.../30-day schedule).
  Explicitly scoped down via `AskUserQuestion` to 3 choices, all "keep it simple": **(1)** stay
  on the existing card-based review UI, no separate chat mode; **(2)** keep the existing 0-5
  `palace_mastery` counter, no calendar/date-due scheduling table; **(3)** keep the existing
  binary "✅ Nhớ rồi / ❌ Chưa nhớ" self-report, no multi-type quiz engine (position-recall,
  image-recall, sentence-writing, etc.). Don't build those heavier pieces unless explicitly
  asked again — this section documents what *did* ship from that request:
  - `vocabulary_entries` gained `ipa`, `usage_note`, `example_sentence` (migration
    `20260809141055_add_palace_word_detail.sql`), generated by `/api/palace/generate` in the
    same Gemini call that already produces `palace_imagery` — one extra structured-output call
    is not made per field, all fields come back in one `PALACE_RESPONSE_SCHEMA` response. Word
    type reuses the existing `word_type` column from the topic-detail feature (`entry.word_type
    || ai?.wordType`, same merge-don't-overwrite pattern as meaning elsewhere in the app) rather
    than adding a parallel field.
  - **`palace_room_stories`** (new table, PK `(topic_id, room_id)`) holds one connecting
    Vietnamese narrative per **(topic, room)** pair — deliberately *not* per room alone, even
    though `palace_rooms` is a shared per-user house: a physical room can hold words from
    several unrelated topics (each topic independently round-robins its own words into the
    shared room list — see round-robin note above), and the palace page only ever shows one
    topic's slice of a room at a time. A single global per-room story would show narrative
    content referencing another topic's words when viewed from here. It's regenerated
    (upserted, overwriting the old value) on every generate call that adds a word to that room,
    from the room's *entire* current roster for that topic (not just the newly-added words) —
    so the story always covers every word currently visible in that room tile, not just the
    latest batch.
  - This requires a **second Gemini call per `/api/palace/generate` request** (one for
    per-word content, one covering all rooms touched in that batch, via `ROOM_STORY_SCHEMA`) —
    batched into a single call across all affected rooms rather than one call per room, to
    avoid multiplying key-pool quota usage by the number of rooms touched. The room-story call
    is wrapped in its own `try/catch` that only `console.error`s on failure and does **not**
    fail the whole request — it's a bonus on top of content that's already been saved to
    `vocabulary_entries` by that point, matching the "a bonus AI call must never block saving"
    resilience pattern used elsewhere in the app.
  - `PalaceWalkthrough.tsx`'s revealed-card state now shows the word-type badge, `/ipa/`,
    `📝 usage_note`, and `💬 example_sentence` alongside the word/meaning. A room's connecting
    story is shown as a standing amber banner for the whole room-scoped session (not just once)
    — reads from `roomStories` state, refetched via `refetchRoomStories()` alongside
    `refetchWords()` inside `handleWordsRefresh` any time content changes (new generation, or a
    room-manager change that can affect room contents).

## Scan vocabulary from a photo (`/api/scan-vocabulary`)

- Lets a learner photograph or upload an image (notebook page, textbook, flashcards) instead
  of typing words by hand. Clicking "Scan ảnh AI" (top of `TopicDetail`) or "📸 Scan ảnh trang
  sách" (empty-state card) opens **`ScanPhotoModal.tsx`** (added 2026-08-09) rather than
  triggering a file picker directly — the modal offers three explicit entry points: drag-and-
  drop a file onto the dashed zone, "📷 Mở Camera", or "Chọn file". This needs **two separate
  hidden `<input type="file">`s** in `TopicDetail.tsx` — `cameraInputRef` (`accept="image/*"
  capture="environment"`) and `fileInputRef` (`accept="image/*"`, no `capture`) — because the
  `capture` attribute forces a camera prompt on mobile, which is wrong for "Chọn file" (should
  open the gallery/file system, not the camera). The modal itself never touches file inputs
  directly; it calls `onOpenCamera`/`onChooseFile` props that `TopicDetail` wires to
  `cameraInputRef.current?.click()` / `fileInputRef.current?.click()`.
- **Sample word sets (`SAMPLE_SETS` in `ScanPhotoModal.tsx`)** let a learner try the feature
  with zero setup — two clickable thumbnails ("Đồ vật hằng ngày", "Cảm xúc") rendered from
  static SVGs in `public/samples/` (hand-authored notebook-page mockups, not real photos: no
  image-generation tool was available, and there was no real sample photo to bundle). Clicking
  one **skips the Gemini OCR round-trip entirely** — `onUseSample` feeds a small hardcoded
  `{word, meaning, wordType}[]` straight into `TopicDetail`'s `pending` review list, exactly as
  if it had been scanned. This is deliberate, not a shortcut to fix later: a demo path doesn't
  need real OCR (nothing to extract, the words are already known), and skipping the API call
  means trying the sample costs zero `MAX_VOCAB_SCANS_PER_DAY` quota. Keep sample words simple
  (basic nouns/adjectives) — the point is an approachable first impression, not a stress test.
- The photo is downscaled client-side first (`src/lib/utils/image.ts`, `compressImageToBase64` — max
  1600px on the long edge, JPEG quality 0.85) before being base64-encoded and POSTed. This
  keeps the payload well under Vercel's serverless body-size limit and reduces Gemini's image
  token cost; don't send the original full-resolution file.
- The route sends the image as multimodal input (`parts: [{ text }, { inlineData: { mimeType,
  data } }]`) through `generateWithKeyPool()` like every other Gemini call — same key pool,
  same `try/catch` → friendly-Vietnamese-error pattern, same rules apply.
- **Rate-limited by its own table, `vocab_scans`** (just `user_id` + `created_at`, no image or
  extracted-word content stored), compared against `MAX_VOCAB_SCANS_PER_DAY`. Every AI feature
  gets its own per-call table and daily budget rather than sharing one.
- The extraction prompt explicitly forbids inventing a meaning: `meaning` is only filled in if
  it's *also visibly written next to the word in the image itself* (e.g. a bilingual word
  list); otherwise the model must return an empty string. Don't relax this to "guess a
  reasonable meaning" — that would silently produce wrong meanings the learner didn't ask for
  (`/api/fill-meaning`, which only runs on words the learner already confirmed, is the
  deliberate exception — see below).
- **`type` (part of speech) and `pronunciation` (IPA/Pinyin) are fields the model IS asked to
  infer**, unlike `meaning` — `type` added 2026-08-09 alongside `vocabulary_entries.word_type`
  (migration `20260809133316_add_word_type.sql`, nullable free text); `pronunciation` added
  2026-08-11 feeding `vocabulary_entries.ipa`. The distinction: a translation can be flat-out
  wrong and mislead a learner, but "book" being tagged `n`, or given an IPA transcription, even
  though the image never wrote either next to it, is safe general-knowledge inference, not a
  guess that could embarrass the app. `SCAN_RESPONSE_SCHEMA` asks for a short part-of-speech
  abbreviation (`n`/`v`/`adj`/`adv`/`phrase` — the same fixed set duplicated as `WORD_TYPES` in
  `AddWordModal.tsx` and `TopicWordList.tsx` for the manual-add and inline-edit `<select>`s,
  keep all three lists in sync)
  plus a `PRONUNCIATION_HINT`-driven pronunciation string (IPA for English, Pinyin with tone
  marks for Chinese — same per-language hint pattern as `/api/palace/generate`, don't hardcode
  "IPA" for both languages).
- The route itself just extracts words from an image — it doesn't know about topics. Scanned
  words come back to `TopicDetail` as a **pending review list** (editable word/meaning,
  removable per row) rather than being saved immediately; the learner reviews for OCR mistakes
  and clicks "Lưu N từ vào chủ đề" to bulk-insert them into `vocabulary_entries`. Don't skip
  this review step — the whole point is catching bad OCR before it permanently pollutes a
  topic's word bank.
- Scanning is language-aware like every other content-generating feature: it sends the
  app-wide `language` from `useLanguage()` and asks the model to extract that language's words
  specifically, so scanning a Chinese vocabulary list while in English mode won't happen.
- **`/api/fill-meaning` (added 2026-08-19) is the one place the app deliberately DOES invent a
  meaning** — unlike scan/OCR above, this route only ever runs for a word the learner has
  already confirmed (typed manually, or already reviewed/edited in the scan pending list), so
  there's no OCR-misread risk to guard against; a plausible AI meaning is strictly better than
  leaving the word permanently blank. Takes `{ words: string[], language }`, returns
  `{ items: { word, meaning, type }[] }` in one batched call (reuses the same
  `n`/`v`/`adj`/`adv`/`phrase` set as `word_type` elsewhere — keep in sync, see above).
  Rate-limited via its own table, `meaning_fills` (same minimal shape as `vocab_scans`),
  against `MAX_MEANING_FILLS_PER_DAY`.
  - `TopicWordCapture.tsx`'s `fetchAiMeanings()` calls it from two places, both **best-effort
    and non-blocking** — if the call fails, the word is still saved with `meaning: null`,
    to be gap-filled later by Memory Palace generation instead: (1) `handleAddWord`, when the
    "+ Thêm từ" modal is submitted with the
    nghĩa field left empty — one word; (2) `handleSavePending`, right before bulk-inserting a
    scanned batch, batched across every pending row that still has no meaning after review —
    not called per-row during scanning itself, since the learner may still edit/remove rows
    before saving and per-row calls would waste quota on discarded words.
  - A user-provided `word_type` (typed in the add form, or already set from the scan
    extraction) always wins; the AI type only fills that gap too — same
    `existing || ai` merge pattern used for meaning everywhere else in the app.

## Conversation practice — removed (2026-10-12)

- The AI speaking/chat feature (`/chat`, `/api/chat`, `ChatSession`, `CHAT_AI_NAME`,
  `MAX_CHAT_MESSAGES_PER_DAY`) was deleted together with Writing so the app stays focused on
  vocabulary (plus the grammar reference, which the user chose to keep). Treat it as a fresh
  feature request if it's ever wanted again.
- The `chat_logs` table is left in place but dormant, same rule as `writings`/`stories`.

## Writing practice — removed (2026-10-12)

- The essay-writing feature (`/writing`, `/writing/history`, `/api/writing`, `WritingForm`,
  `WritingHistoryList`, `MAX_WRITINGS_PER_DAY`) was deleted at the user's request so the app
  stays focused on vocabulary. Don't reintroduce it casually — treat it as a fresh feature
  request if it's wanted again.
- The `writings` table is left in place but dormant (same "don't drop a shipped table without
  discussing first" rule as `stories` and `user_settings.gemini_api_key`). No code reads or
  writes it.

## Grammar reference (`/grammar`)

- **Deliberately static, not AI-generated** — `src/lib/grammar-data.ts` hand-curates all 12
  English tenses (structure, usage, signal words, examples, question/short-answer patterns)
  and `src/lib/grammar-questions.ts` holds the practice banks (`GRAMMAR_QUESTIONS`, 12 per
  tense; `TRANSLATION_PROMPTS`, 6 per tense — grown 2026-10-12). Grammar rules are fixed
  and objective, unlike a story's wording — generating them fresh via Gemini each time would
  risk the model hallucinating an incorrect rule or, worse, marking an exercise answer wrong
  when it's actually right. Don't switch this to an AI call "for variety"; add more hand-written
  questions to the bank instead if it needs to feel less repetitive.
- **English-only regardless of the app-wide language toggle** (`useLanguage()` from
  `src/lib/language-context.tsx`) — tenses are an English-specific grammar concept, so this
  page doesn't read or react to the Anh/Trung switcher at all, unlike every other
  content-generating feature. Don't wire it up to `language`; that switch controls what
  language new vocabulary content is *in*, which isn't relevant to a fixed
  grammar reference.
- `/grammar` is behind login (added to `PROTECTED_PATHS` in `src/lib/supabase/middleware.ts`)
  for consistency with the rest of the app's learning tools.
- `GrammarTenseList.tsx` (browse: expandable card per tense) is the shared entry point for
  **two** separate practice modes, each scoped to one tense or `"mixed"` (all 12):
  - **Multiple-choice** (`GrammarQuiz.tsx`, `GRAMMAR_QUESTIONS` in `grammar-questions.ts`) — fully
    static, no AI call. Grading a typed grammar answer reliably needs the same kind of
    loose-matching logic `ReviewSession` already fights with for Vietnamese meanings, and
    grammar answers have far less acceptable variation than a translation does — MCQ sidesteps
    that ambiguity and keeps grading 100% deterministic. Don't switch this to an AI call "for
    variety"; add more hand-written questions to `GRAMMAR_QUESTIONS` instead.
  - **Dịch câu (Việt → Anh)** (`GrammarTranslationPractice.tsx`, prompts from
    `TRANSLATION_PROMPTS` in `grammar-questions.ts`, graded by `POST /api/grammar/check`) — this
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
  - Rate-limited via its own table, `grammar_checks` (mirrors `vocab_scans` —
    just `user_id` + `created_at`, no sentence/feedback content stored), compared against
    `MAX_GRAMMAR_CHECKS_PER_DAY`. Only the translation mode counts against this; MCQ is free
    and unlimited since it costs no AI call.
  - **A sitting is a random draw, not the whole bank** (`SESSION_SIZE` in each component: 10
    multiple-choice, 6 translation — the latter kept short because each answer costs an AI
    grading call against the daily limit). The result screen offers "Làm bộ câu khác" to draw
    again. `GrammarQuiz` also shuffles each question's options at draw time, since the bank
    lists most correct answers in the same slot — keep that when adding questions, and don't
    rely on option order in an explanation ("đáp án B...").
  - When adding questions: every item needs exactly one defensible answer among its four
    options (watch for time expressions that also allow another tense), and the question
    text must be unique in the bank.
  - Both modes reuse `ReviewSession.tsx`'s shuffle-deck/score/retry pattern — reuse that
    structure rather than inventing a third quiz flow if a fourth is ever added.

## Voice (text-to-speech)

- Pronunciation playback uses the browser's built-in Web Speech API
  (`window.speechSynthesis`, wrapped in `src/lib/utils/speech.ts`) — free, no API key, no extra
  dependency. Don't introduce a paid TTS API (Gemini TTS, ElevenLabs, etc.) unless explicitly
  asked, since it would break the free-tier-only constraint.
- Buttons that call `speak()` render unconditionally (no `typeof window` check at render time)
  to avoid SSR/hydration mismatches — `speak()` itself no-ops safely if the browser doesn't
  support `speechSynthesis`.
- The Server-Component-fetches / Client-Component-mutates split (a page's `page.tsx` fetches,
  a `"use client"` child owns list state so a delete/edit updates the UI without a refetch) is
  the pattern to follow — see `TopicList.tsx` / `TopicDetail.tsx`.
- Destructive confirmations use `src/components/ConfirmDialog.tsx`, not the browser's native
  `window.confirm()` — the native dialog can't be styled and looks jarringly out of place
  against the app's custom theme. Reuse `ConfirmDialog` for any future destructive action
  instead of reaching for `window.confirm`/`window.alert` again. Not every deletion needs it,
  though — see "Vocabulary topics" below for the one deliberate exception.

## Study streak

- The daily streak (`src/lib/utils/streak.ts`, `getStudyStreak`) is **derived**, no separate
  streak table/column — a day counts if the user did anything meaningful that day: added a
  `vocabulary_entries` row, or ran a Memory Palace generation (`palace_generations`). It
  unions those two tables' `created_at`. (Before 2026-09-10 it counted story-generation days
  from the now-removed `stories` table.) Don't add a dedicated streak table; recompute from
  activity to avoid two sources of truth that can drift.
- "Day" boundaries use local server time (`new Date()`, `getFullYear/Month/Date`), matching how
  the rate-limit tables define "today" — keep both conventions in sync if either changes.
- Server Components get the signed-in user from **`getCurrentUser()`**
  (`src/lib/supabase/server.ts`, returns `{ id } | null`) and the streak from
  `getStudyStreak(user.id)` — both wrapped in React `cache()`, so the navbar (root layout) and
  the page share one lookup per request. The streak queries are ordered newest-first and
  capped at 1000 rows each — PostgREST caps responses at 1000 rows anyway, and an unordered
  query past that size returned an arbitrary slice.
- **Page loads verify the session locally, with no Auth request (2026-10-12).** Both
  `getCurrentUser()` and `src/proxy.ts`'s `updateSession` call `supabase.auth.getClaims()`,
  which checks the access token's signature against the project's public signing keys (the
  project signs with ES256; the JWKS is cached in memory) instead of `getUser()`'s network
  call to the Auth server — previously 2-3 Auth requests per page load, and one per
  prefetched link. `getClaims()` silently falls back to a network call if the project is ever
  switched back to a symmetric (HS256) secret, so it stays correct either way. **Route
  Handlers still use `getUser()`** — they mutate data / spend AI quota, so they keep the
  server-verified answer (which also catches a session revoked before its token expires).
- Counts come from the database, not from downloading rows: the topic list reads
  `vocabulary_entries(count)` embedded on `vocabulary_topics` (this is why
  `vocabulary_entries` declares its `topic_id` relationship in `types.ts`).
- `generateWithKeyPool()` only writes to `gemini_api_key_pool` when a key's state changes
  (exhausted, or recovered) — a normal successful call does no write, so `last_used_at` now
  means "last recovered", not "last used".
- Independent Supabase queries on a page go in one `Promise.all` (topic + its words, etc.),
  not one `await` after another — each sequential query is a full network round-trip.
- Client components that insert a row read the user from `supabase.auth.getSession()` (local,
  no network) rather than `getUser()` — RLS is what actually enforces ownership.
- Pages needing both server-fetched data (streak,
  topic list) and client interactivity (forms, buttons) split into `page.tsx` (Server
  Component, fetches data) + a `"use client"` component for the interactive part (see
  `TopicList.tsx`, `TopicDetail.tsx`) — don't make the whole page a Client Component just
  because part of it needs `useState`.

## Spaced-repetition review reminders — removed (added 2026-08-22, removed 2026-09-01)

- A dialog nudging the learner to review a topic on a `[1, 3, 7, 14, 30]`-day schedule since
  creation was built, then explicitly removed at the user's request shortly after —
  `TopicDetail.tsx`'s reminder dialog, `src/lib/utils/spaced-review.ts`, the homepage badge,
  and every `last_reviewed_at`-writing call site were all deleted. Don't reintroduce it
  casually; if wanted again, treat it as a fresh feature request rather than restoring old
  code.
- **`vocabulary_topics.last_reviewed_at`** (migration `20260822225457_add_topic_last_reviewed.sql`)
  is left in place but dormant — same "don't delete a shipped column without discussing first"
  reasoning as `user_settings.gemini_api_key` elsewhere in this doc. No code reads or writes it
  anymore.

## Vocabulary review (in-topic quiz)

- The **only** review flow is the in-topic quiz: `TopicDetail.tsx`'s "📝 Ôn tập từ vựng"
  button (`mode === "review"`) renders `ReviewSession` scoped to the topic's *live current*
  word list. The old per-story `/review` page (frozen `stories.vocabulary_used` decks,
  `ReviewStoryList`, `EditableMeaning`, `PATCH /api/stories/[id]/vocabulary`) was deleted with
  the Storytelling feature (2026-09-10). `ReviewSession.tsx` itself stays — it never depended
  on stories, `storyId`/`EditableMeaning` were an optional per-story branch that's now gone.
- Within a deck, words are deduped by lowercased word and filtered to ones with a non-empty
  `meaning` (both quiz directions need one to grade against).
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
  when adding another way to start a session. `ReviewSession` takes an `onExit` prop (wired to
  "Quay lại" back to the topic word list).
- If the user pronounces a word correctly (`PronunciationCheck`'s `onResult`) after already
  submitting a wrong text answer for that card, `ReviewSession.handlePronunciationResult`
  flips that card's verdict to correct instead of leaving a confusing "🎤 correct" next to a
  "❌ Chưa đúng" on screen. Guarded by `pronunciationOverridden` so it only fires once per
  card and never double-counts the score.
- Pronunciation check (`src/components/PronunciationCheck.tsx`) uses the browser's
  `SpeechRecognition` / `webkitSpeechRecognition` API — free, no key, no dependency, same
  "free-tier only" reasoning as the `speak()` TTS helper. It has no official TypeScript types
  in `lib.dom`, so `src/lib/utils/pronunciation.ts` declares a minimal local interface instead of
  pulling in an extra `@types` package. Not all browsers support it (notably Safari/Firefox
  are inconsistent) — the component must degrade to an "unsupported" state, never throw.

## Multi-language support (English + Chinese)

- `src/lib/constants.ts` exports `Language = "en" | "zh"`, `LANGUAGES` (id/label/flag, used to
  render the language picker), `SPEECH_LANG` (BCP-47 codes for TTS/speech recognition), and
  `isLanguage()` (a type guard for parsing `language` out of an untrusted request body). Any
  new language-aware code should go through these, not a locally re-declared union.
- `vocabulary_entries` (and the dormant `stories` / `writings`) has a `language text not null
  default 'en'` column (migration `20260729223259_add_language_support.sql`) with a check
  constraint limiting it to `'en' | 'zh'`. Existing rows default to `'en'`.
- The per-word `ipa` field is reused for Chinese too — it holds an IPA transcription for
  English words and a Pinyin romanization (with tone marks, e.g. `nǐ hǎo`) for Chinese words.
  Don't rename the field or add a parallel `pinyin` field; treat `ipa` as "however this word's
  pronunciation is written," not literally IPA.
- When an AI response schema needs to vary by language, vary the field *description* / system
  instruction, not the JSON shape (see `PALACE_RESPONSE_SCHEMA`'s per-language pronunciation
  hint) — follow that if a third language is ever added.
- **Reviewing Việt→Trung typed answers grades against Pinyin, not Hán tự** — a learner without
  a Chinese IME can't reliably type characters under quiz time pressure, but anyone can type
  romanized Pinyin. `isCorrectAnswer` in `ReviewSession.tsx` branches on `language`: for `zh`
  in the `vi-en` direction it compares the typed answer against `card.ipa` (the Pinyin) via
  `normalizePinyin()` (`src/lib/utils/pronunciation.ts` — NFD-normalizes and strips combining tone
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
  language-aware form (`TopicList` when creating a topic) reads
  it via `useLanguage()` — don't reintroduce a local per-form language picker; that was the
  first version of this feature and was replaced because switching languages separately on
  every page was repetitive and confusing about which one was "active". Content-generating
  routes that act on a topic (`palace/generate`) read `language` from the topic row itself,
  not the request body — a topic's language is fixed at creation time.
- `useLanguage()` throws if called outside `LanguageProvider` — every client component that
  needs the active language must be a descendant of the root layout's `<LanguageProvider>`
  (true for anything rendered inside `{children}`, so this should never actually happen).
- `speak()` and `SpeechRecognition.lang` must always be set from `SPEECH_LANG[language]` for
  the word/card/message actually being read or listened to — never hardcode `"en-US"` in a
  new call site now that a second language exists.

## Env vars

Add new variables to `.env.local.example` whenever one is introduced. Never commit the real
`.env.local` (already in `.gitignore`). `NEXT_PUBLIC_*` variables are public — never put a
secret there.

## Deployment region (`vercel.json`, added 2026-09-04)

- Every page and API route calls Supabase, so its region relative to where the Vercel
  Serverless Functions run directly affects every request's latency — a mismatch there was
  diagnosed as the main cause of "every click feels slow" (not React/query code).
  Investigated by running `vercel inspect <deployment-url>`, which prints each function's
  region in its build output (`[iad1]`, etc.) — reuse that command first if this regresses,
  rather than guessing.
- `vercel.json`'s `{ "regions": ["sin1"] }` pins functions to Singapore, matching the Supabase
  project's own region (`ap-southeast-1`, Project Settings → General in the Supabase
  dashboard) — check there before assuming `sin1` is still correct if a new Supabase project is
  ever provisioned elsewhere. **Region pinning is a Pro-plan-or-higher feature** — Vercel
  Hobby (free) ignores `regions` and is fixed to `iad1` (US East). This is the specific,
  narrow reason the Vercel plan was upgraded (see "Fixed stack" above); nothing else about the
  stack's free-tier-only stance changed because of it.
- Don't add `functions.regions` per-route or a `preferredRegion` export as an alternative to
  this — the top-level `regions` key already applies project-wide for every function Next.js
  generates (pages, layouts, API routes), so a per-file override would be redundant.

## UI / UX

- **App icon for "Add to Home Screen" (added 2026-08-19)** — `src/app/icon.svg` (existing) only
  covers the browser-tab favicon; it does **not** work as a home-screen icon since iOS Safari
  requires a PNG for that, and Android's manifest icons need specific pixel sizes. Three more
  file-convention files fill that gap: `src/app/apple-icon.tsx` (180×180, read directly by iOS,
  no manifest involved there) and `src/app/manifest.ts` (Android/Chrome "Add to Home Screen"
  branding — name, `display: "standalone"`, theme/background color) referencing
  `src/app/icon-192/route.tsx` and `icon-512/route.tsx`. All four render the same design (solid
  `#6ee7b7` emerald background, bold black "V", **no border or rounded corners** — unlike the
  bordered/rounded `icon.svg` favicon, since iOS/Android apply their own mask over a full-bleed
  square and a pre-rounded image would double up the edge) via `next/og`'s `ImageResponse`
  (Satori-rendered JSX → PNG at request time) rather than committing static PNG binaries — this
  keeps the icon defined in code and trivially restylable without an image editor. The 192/512
  sizes live as plain route handlers (not the `icon.tsx` convention, which only supports one
  size) purely because `manifest.ts` needs multiple sizes to point at. If the brand mark ever
  changes, update the "V" + colors in all four files — they're not derived from one shared
  source.
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
    Highlighted/tinted cards (e.g. the streak banner, the scanned-words pending list) use
    `bg-violet-50` instead of white, same border+shadow. This "neo-brutalism" hard-shadow
    look (flat color, no blur, no gradient on cards, offset shadow instead of soft elevation)
    is the whole point of the redesign — don't soften it back to `shadow-sm`/blurred shadows.
  - **Two accent colors, each with a specific job.** **Violet (lavender pastel) is primary**
    — main/default actions (`bg-violet-300`), tinted surfaces (`bg-violet-50` with
    `border-violet-300`/`text-violet-700`), links (`text-violet-700 hover:text-violet-800
    underline`). **Amber is the secondary accent**, used for: the streak badge
    (`StreakBadge.tsx`, 🔥 reads more naturally in fire-colored amber than purple); the
    standalone "Đăng nhập" nav pill (`Navbar.tsx`/`MobileMenu.tsx` — an entry-point action,
    distinct from primary in-flow actions like form submit buttons, which stay violet); the
    numbered step badges in the Memory-journey chain map; and the topic-detail header's icon
    badge. Don't use amber for primary CTAs/submit buttons, and don't introduce a third brand
    color — pick violet or amber for anything new based on whether it's a primary
    action/surface (violet) or a secondary highlight (amber), not on preference.
    - **Primary was emerald (mint green) until 2026-08-21**, when the whole app was swapped
      from `emerald` to `violet` (literal find/replace of every `*-emerald-*` Tailwind class
      across `src/`, same shade numbers — `emerald-300` → `violet-300`, `emerald-50` →
      `violet-50`, etc. — plus the hardcoded `#6ee7b7` icon color → `#c4b5fd` in
      `apple-icon.tsx`/`icon.svg`/`icon-192`/`icon-512`/`manifest.ts`) purely to look visually
      distinct from a similar-looking reference app the user was comparing against, not for any
      functional reason. If the primary color ever changes again, this is the exact mechanism —
      grep for the current color family name across `src/`, swap it and the icon hex together,
      don't leave the two out of sync.
  - **Buttons are pills with the same hard-shadow treatment**: `rounded-full border-2
    border-black ... shadow-[3px_3px_0_0_#000] transition-all hover:shadow-none
    hover:translate-x-[3px] hover:translate-y-[3px]` — hovering "presses" the button into its
    own shadow instead of just darkening a fill color. Primary = `bg-emerald-300 text-black`,
    secondary/outline = `bg-white text-black`, danger = `bg-red-300 text-black`. Every button
    across the app should follow this exact shadow-press pattern; a plain flat button
    (no border/shadow) reads as visually inconsistent with everything else now.
  - **Every `hover:` press variant needs a matching `active:` press variant with the exact same
    values** (added 2026-08-20 — e.g. `hover:translate-x-[3px] hover:translate-y-[3px]
    hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`).
    `:hover` doesn't fire on tap on touch devices, so without `:active` mirroring it, mobile
    users never see the press feedback desktop users get from mousing over — the button just
    looked inert on tap. Copy whatever px value (or bare Tailwind spacing step, e.g. the
    homepage CTA's `hover:translate-x-1`) the button already uses for `hover:`, don't invent a
    new one. This applies to every bordered/shadowed interactive element (buttons, card-as-
    button rows, icon buttons) — when adding a new one, add both variants together from the
    start rather than only `hover:`.
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
- No complex loading skeletons/animations — use simple status text (e.g. "Đang tải...", the
  `loading.tsx` files) in line with the "simple, clean UI" requirement.
- Routes that require auth (`/vocabulary/[topicId]`, `/grammar`) are
  protected in `src/proxy.ts` via `PROTECTED_PATHS` in `src/lib/supabase/middleware.ts`. When
  a new route needs auth, add it to that array instead of checking `user` ad hoc. Note
  `/vocabulary` itself (the topic list) is deliberately *not* protected — guests can browse it
  before signing up; only a specific topic requires auth.

## Before reporting a task "done"

1. `npm run lint` — must be clean, no new warnings.
2. `npm run build` — must build with no TypeScript errors (see the `Database` type section
   above if the error involves `.insert()` / `.update()`).
3. If the UI changed: run `npm run dev` and manually verify (or `curl`) at least the main
   affected route before reporting completion.
