-- Repair category RLS for anonymous-authenticated Kipu sessions.
-- auth.uid() is derived from the bearer JWT; TO authenticated makes the intent explicit.

drop policy if exists "Users can read own categories" on public.categories;
drop policy if exists "Users can insert own categories" on public.categories;
drop policy if exists "Users can update own categories" on public.categories;
drop policy if exists "Users can delete own categories" on public.categories;

create policy "Users can read own categories"
on public.categories for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can insert own categories"
on public.categories for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    parent_id is null
    or exists (
      select 1 from public.categories p
      where p.id = parent_id and p.user_id = (select auth.uid())
    )
  )
);

create policy "Users can update own categories"
on public.categories for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    parent_id is null
    or exists (
      select 1 from public.categories p
      where p.id = parent_id and p.user_id = (select auth.uid())
    )
  )
);

create policy "Users can delete own categories"
on public.categories for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can read own idea category assignments" on public.idea_categories;
drop policy if exists "Users can insert own idea category assignments" on public.idea_categories;
drop policy if exists "Users can delete own idea category assignments" on public.idea_categories;

create policy "Users can read own idea category assignments"
on public.idea_categories for select
to authenticated
using (
  exists (select 1 from public.ideas i where i.id = idea_id and i.user_id = (select auth.uid()))
  and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
);

create policy "Users can insert own idea category assignments"
on public.idea_categories for insert
to authenticated
with check (
  exists (select 1 from public.ideas i where i.id = idea_id and i.user_id = (select auth.uid()))
  and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
);

create policy "Users can delete own idea category assignments"
on public.idea_categories for delete
to authenticated
using (
  exists (select 1 from public.ideas i where i.id = idea_id and i.user_id = (select auth.uid()))
  and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
);
