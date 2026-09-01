drop policy if exists "Users can insert own categories" on public.categories;
drop policy if exists "Users can update own categories" on public.categories;

create policy "Users can insert own categories"
on public.categories for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own categories"
on public.categories for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
