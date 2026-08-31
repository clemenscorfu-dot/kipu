create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_no_self_parent check (parent_id is null or parent_id <> id)
);

create unique index if not exists categories_user_parent_name_unique
  on public.categories (user_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create index if not exists categories_user_parent_idx
  on public.categories (user_id, parent_id, sort_order, name);

create table if not exists public.idea_categories (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, category_id)
);

create index if not exists idea_categories_category_idx
  on public.idea_categories (category_id, idea_id);

alter table public.categories enable row level security;
alter table public.idea_categories enable row level security;

create policy "Users can read own categories"
on public.categories for select
using (auth.uid() = user_id);

create policy "Users can insert own categories"
on public.categories for insert
with check (
  auth.uid() = user_id
  and (
    parent_id is null
    or exists (
      select 1 from public.categories p
      where p.id = parent_id and p.user_id = auth.uid()
    )
  )
);

create policy "Users can update own categories"
on public.categories for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    parent_id is null
    or exists (
      select 1 from public.categories p
      where p.id = parent_id and p.user_id = auth.uid()
    )
  )
);

create policy "Users can delete own categories"
on public.categories for delete
using (auth.uid() = user_id);

create policy "Users can read own idea category assignments"
on public.idea_categories for select
using (
  exists (
    select 1 from public.ideas i
    where i.id = idea_id and i.user_id = auth.uid()
  )
  and exists (
    select 1 from public.categories c
    where c.id = category_id and c.user_id = auth.uid()
  )
);

create policy "Users can insert own idea category assignments"
on public.idea_categories for insert
with check (
  exists (
    select 1 from public.ideas i
    where i.id = idea_id and i.user_id = auth.uid()
  )
  and exists (
    select 1 from public.categories c
    where c.id = category_id and c.user_id = auth.uid()
  )
);

create policy "Users can delete own idea category assignments"
on public.idea_categories for delete
using (
  exists (
    select 1 from public.ideas i
    where i.id = idea_id and i.user_id = auth.uid()
  )
  and exists (
    select 1 from public.categories c
    where c.id = category_id and c.user_id = auth.uid()
  )
);

create or replace function public.set_categories_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_categories_updated_at();

create or replace function public.enforce_category_depth()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  parent_parent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent_id into parent_parent_id
  from public.categories
  where id = new.parent_id and user_id = new.user_id;

  if not found then
    raise exception 'Parent category does not belong to user';
  end if;

  if parent_parent_id is not null then
    raise exception 'Kipu categories may have at most two levels';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_enforce_depth on public.categories;
create trigger categories_enforce_depth
before insert or update of parent_id, user_id on public.categories
for each row execute function public.enforce_category_depth();
