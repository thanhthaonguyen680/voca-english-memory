-- Part-of-speech tag per word (n/v/adj/adv/phrase), shown as a small badge next to the word
-- in a topic's vocabulary list. Nullable/free text: not every word has (or needs) one, and
-- validating against a fixed enum isn't worth it for a purely cosmetic label.

alter table public.vocabulary_entries
  add column if not exists word_type text;
