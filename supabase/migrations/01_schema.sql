-- profiles (maps to auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  status text default 'offline' check (status in ('online', 'offline', 'in_call')),
  created_at timestamptz default now()
);

-- rooms (pre-seeded: 'trio-main' is the only room)
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

-- messages (chat)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- call_history
create table public.call_history (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  started_by uuid references public.profiles(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  participants uuid[] -- array of user IDs in the call
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.call_history enable row level security;

-- Profiles Policies
create policy "read_profiles" on public.profiles 
  for select using (auth.role() = 'authenticated');

create policy "update_own_profile" on public.profiles 
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Rooms Policies
create policy "read_rooms" on public.rooms 
  for select using (auth.role() = 'authenticated');

-- Messages Policies
create policy "read_messages" on public.messages 
  for select using (auth.role() = 'authenticated');

create policy "send_messages" on public.messages 
  for insert with check (sender_id = auth.uid());

-- Call History Policies
create policy "read_call_history" on public.call_history 
  for select using (auth.role() = 'authenticated');

create policy "insert_call_history" on public.call_history 
  for insert with check (started_by = auth.uid());

create policy "update_call_history" on public.call_history 
  for update using (auth.role() = 'authenticated');

-- Trigger to automatically create a profile record when a new user is created in auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'offline'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
