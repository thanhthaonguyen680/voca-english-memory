-- stories had select/insert policies but no delete policy, so users couldn't remove a
-- story from their history.

create policy "stories_delete_own"
  on public.stories for delete
  using (auth.uid() = user_id);
