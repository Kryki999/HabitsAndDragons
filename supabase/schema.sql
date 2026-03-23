create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  player_id text unique,
  player_class text check (player_class in ('warrior', 'hunter', 'mage', 'paladin') or player_class is null),
  sage_focus text check (sage_focus in ('body', 'mind', 'work') or sage_focus is null),
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists player_id text;
alter table public.profiles drop constraint if exists profiles_player_class_check;
alter table public.profiles
  add constraint profiles_player_class_check
  check (player_class in ('warrior', 'hunter', 'mage', 'paladin') or player_class is null);
create unique index if not exists profiles_player_id_key on public.profiles(player_id);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_public_for_social" on public.profiles;

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

-- MVP social: allow searching users by email for adding friends.
create policy "profiles_select_public_for_social"
  on public.profiles
  for select
  using (true);

create table if not exists public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_participant" on public.friendships;
drop policy if exists "friendships_insert_requester" on public.friendships;
drop policy if exists "friendships_update_participant" on public.friendships;

create policy "friendships_select_participant"
  on public.friendships
  for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_insert_requester"
  on public.friendships
  for insert
  with check (auth.uid() = requester_id);

create policy "friendships_update_participant"
  on public.friendships
  for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

