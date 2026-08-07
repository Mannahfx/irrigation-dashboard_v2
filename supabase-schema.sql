-- ============================================
-- REVOSMART Irrigation Dashboard — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. PROFILES TABLE (extends Supabase Auth users)
-- Drop and recreate to add employee_id column
drop table if exists activities;
drop table if exists profiles;

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  employee_id text,
  device_id text not null default 'manna',
  created_at timestamptz default now(),
  last_login timestamptz
);

-- Auto-create profile on signup (reads role and employee_id from user metadata)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role, employee_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'employee_id'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. ACTIVITIES TABLE (user action log)
create table activities (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete set null,
  user_email text not null,
  action text not null,
  details text,
  device_id text default 'manna',
  created_at timestamptz default now()
);

-- Indexes for admin queries
create index idx_activities_created on activities(created_at desc);
create index idx_activities_user on activities(user_id);


-- 3. ROW LEVEL SECURITY

-- Profiles RLS
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can upsert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Activities RLS
alter table activities enable row level security;

create policy "Users can insert own activities"
  on activities for insert with check (auth.uid() = user_id);

create policy "Users can read own activities"
  on activities for select using (auth.uid() = user_id);

create policy "Admins can read all activities"
  on activities for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- 4. ENABLE REALTIME (for admin live feed)
alter publication supabase_realtime add table activities;
