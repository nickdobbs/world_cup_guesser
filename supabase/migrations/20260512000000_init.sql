-- =============================================================================
-- EXAMPLE SCHEMA — REPLACE WITH YOUR OWN
-- =============================================================================
-- This migration demonstrates the patterns every Supabase app needs:
--   • Linking a public table to auth.users
--   • Auto-creating linked rows on signup via a trigger
--   • Row Level Security policies tied to auth.uid()
--
-- To use this template for a real app:
--   1. Delete the contents of this file (keep the file or rename it)
--   2. Write your own schema using the same patterns
--   3. Update src/app/dashboard/page.tsx to match
--   4. Run `npm run types:generate` to regenerate types
--
-- =============================================================================

-- =============================================================================
-- Initial schema for the template
--
-- Demonstrates the patterns every Supabase app needs:
--   1. Linking a public table to auth.users
--   2. Auto-creating linked rows on signup via a trigger
--   3. Row Level Security with policies tied to auth.uid()
--   4. Per-user row ownership via foreign key + RLS
--   5. updated_at maintained automatically via trigger
--
-- Adapt or delete these tables to fit your app. Keep the patterns.
-- =============================================================================

-- ---- Reusable: updated_at trigger function ----------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- profiles ---------------------------------------------------------------
-- One row per user, auto-created when a user signs up. Holds public info
-- you want to associate with users (display name, avatar URL, etc.).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create a profile row when a user signs up.
-- Uses security definer so it can write to public.profiles regardless of
-- the caller's permissions. search_path is locked down for safety.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS — required for the policies below to take effect.
alter table public.profiles enable row level security;

-- Policy: anyone (including unauthenticated visitors) can read profiles.
-- If you want profiles to be visible only to signed-in users, change
-- `to anon, authenticated` to `to authenticated`.
create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- Policy: a user can insert their own profile (defensive — the trigger
-- normally handles this, but this allows direct inserts too).
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Policy: a user can update only their own profile.
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---- notes ------------------------------------------------------------------
-- User-owned content. Demonstrates per-user ownership via foreign key + RLS.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Index on user_id since every query will filter by it.
create index notes_user_id_idx on public.notes(user_id);

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.handle_updated_at();

alter table public.notes enable row level security;

-- Policy: users can only see their own notes.
create policy "Users can view their own notes"
  on public.notes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Policy: users can insert notes for themselves.
create policy "Users can insert their own notes"
  on public.notes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Policy: users can update their own notes.
create policy "Users can update their own notes"
  on public.notes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Policy: users can delete their own notes.
create policy "Users can delete their own notes"
  on public.notes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);