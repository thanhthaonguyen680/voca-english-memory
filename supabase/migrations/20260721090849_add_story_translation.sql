-- Adds a Vietnamese translation field to stories.
-- vocabulary_used entries now also carry an "ipa" field (jsonb, no migration needed).

alter table public.stories
  add column if not exists translation text;
