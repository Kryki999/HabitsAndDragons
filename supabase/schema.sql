create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_class text check (player_class in ('warrior', 'hunter', 'mage') or player_class is null),
  sage_focus text check (sage_focus in ('body', 'mind', 'work') or sage_focus is null),
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = user_id);

