create extension if not exists pgcrypto;

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null check (input_type in ('text','voice','camera','file')),
  original_input text not null,
  title text not null,
  summary text,
  tags text[] not null default '{}',
  people text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  location_label text,
  location_source text check (location_source is null or location_source in ('device','extracted','researched')),
  enrichment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

create policy "Users can read own ideas"
on public.ideas for select
using (auth.uid() = user_id);

create policy "Users can insert own ideas"
on public.ideas for insert
with check (auth.uid() = user_id);

create policy "Users can update own ideas"
on public.ideas for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own ideas"
on public.ideas for delete
using (auth.uid() = user_id);

create index if not exists ideas_user_created_idx on public.ideas (user_id, created_at desc);
create index if not exists ideas_tags_idx on public.ideas using gin (tags);

create or replace function public.set_updated_at()
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

drop trigger if exists ideas_set_updated_at on public.ideas;
create trigger ideas_set_updated_at
before update on public.ideas
for each row execute function public.set_updated_at();
