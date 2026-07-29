-- Adds multi-language support (English + Chinese) to the vocabulary/story/writing features.
-- Each row now records which language it's for; existing rows default to 'en' since every
-- story/writing/vocabulary entry created before this migration was English-only.

alter table public.stories
  add column if not exists language text not null default 'en';
alter table public.stories
  add constraint stories_language_check check (language in ('en', 'zh'));

alter table public.writings
  add column if not exists language text not null default 'en';
alter table public.writings
  add constraint writings_language_check check (language in ('en', 'zh'));

alter table public.vocabulary_entries
  add column if not exists language text not null default 'en';
alter table public.vocabulary_entries
  add constraint vocabulary_entries_language_check check (language in ('en', 'zh'));
