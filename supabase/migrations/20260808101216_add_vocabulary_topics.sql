-- Restructures /vocabulary around persistent "topics" (chủ đề): a user creates a topic, adds
-- words to it over time (typed manually or scanned from photos), then generates a story from
-- however many words the topic has accumulated — replacing the old flow where words were typed
-- fresh and immediately turned into a single one-off story.
--
-- vocabulary_entries — previously written on every story generation but never read back
-- (dormant, see earlier migrations) — becomes the live per-topic word bank via the new
-- topic_id column. Old dormant rows keep topic_id = null and are simply never matched by any
-- query that always filters on topic_id; they're intentionally not backfilled or deleted.

create table if not exists public.vocabulary_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  language text not null default 'en',
  created_at timestamptz not null default now()
);

alter table public.vocabulary_topics
  add constraint vocabulary_topics_language_check check (language in ('en', 'zh'));

create index if not exists vocabulary_topics_user_id_created_at_idx
  on public.vocabulary_topics (user_id, created_at desc);

alter table public.vocabulary_topics enable row level security;

create policy "vocabulary_topics_select_own"
  on public.vocabulary_topics for select
  using (auth.uid() = user_id);

create policy "vocabulary_topics_insert_own"
  on public.vocabulary_topics for insert
  with check (auth.uid() = user_id);

create policy "vocabulary_topics_update_own"
  on public.vocabulary_topics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vocabulary_topics_delete_own"
  on public.vocabulary_topics for delete
  using (auth.uid() = user_id);

alter table public.vocabulary_entries
  add column if not exists topic_id uuid references public.vocabulary_topics (id) on delete cascade;

create index if not exists vocabulary_entries_topic_id_idx
  on public.vocabulary_entries (topic_id);
