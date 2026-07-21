-- vocabulary_entries had select/insert/delete policies but no update policy, so users
-- couldn't correct a mistyped meaning (needed by the /review "edit meaning" feature).

create policy "vocabulary_entries_update_own"
  on public.vocabulary_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
