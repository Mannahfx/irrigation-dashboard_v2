-- ============================================
-- REVOSMART Kits Architecture Update
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the kits table
create table if not exists public.kits (
  id uuid default gen_random_uuid() primary key,
  kit_id text not null unique,
  name text,
  owner_id uuid references public.profiles(id) on delete set null,
  status text default 'offline',
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS) on kits
alter table public.kits enable row level security;

-- Admins can read all kits
create policy "Admins can read all kits"
  on public.kits for select using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'email') = 'paulecapemeetings@gmail.com'
  );

-- Admins can insert/update/delete kits
create policy "Admins can insert kits"
  on public.kits for insert with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'email') = 'paulecapemeetings@gmail.com'
  );

create policy "Admins can update kits"
  on public.kits for update using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'email') = 'paulecapemeetings@gmail.com'
  );

create policy "Admins can delete kits"
  on public.kits for delete using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'email') = 'paulecapemeetings@gmail.com'
  );

-- Clients can only read kits assigned to them
create policy "Clients can read own kits"
  on public.kits for select using (
    auth.uid() = owner_id
  );

-- Clients can update the name of their own kits
create policy "Clients can update own kits"
  on public.kits for update using (
    auth.uid() = owner_id
  );

-- 3. Add realtime subscription for kits (so admin panel updates live)
alter publication supabase_realtime add table kits;
