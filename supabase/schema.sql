-- one row per user; the whole AppData blob lives in `data`.
create table if not exists public.app_data (
  owner uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

create policy "owner can read own row"   on public.app_data for select using (auth.uid() = owner);
create policy "owner can insert own row" on public.app_data for insert with check (auth.uid() = owner);
create policy "owner can update own row" on public.app_data for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "owner can delete own row" on public.app_data for delete using (auth.uid() = owner);
