-- =============================================================================
-- Mock fixtures + user predictions
--
-- Two tables for the World Cup Guesser app:
--   • mock_fixtures: reference data, publicly readable, seeded below
--   • predictions:   user-owned, RLS-protected
-- =============================================================================

-- ---- mock_fixtures ----------------------------------------------------------
-- Reference data: a small set of match fixtures. Publicly readable; only
-- service_role can write (rows are seeded via this migration).

create table public.mock_fixtures (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  home_score int,
  away_score int,
  status text not null default 'pending' check (status in ('pending', 'finished'))
);

alter table public.mock_fixtures enable row level security;

create policy "Mock fixtures are viewable by everyone"
  on public.mock_fixtures
  for select
  to anon, authenticated
  using (true);

-- ---- predictions ------------------------------------------------------------
-- User-owned content: each row is one user's predicted score for one fixture.

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id uuid not null references public.mock_fixtures(id) on delete cascade,
  predicted_home_score int not null,
  predicted_away_score int not null
);

create index predictions_user_id_idx on public.predictions(user_id);
create index predictions_fixture_id_idx on public.predictions(fixture_id);

alter table public.predictions enable row level security;

create policy "Users can view their own predictions"
  on public.predictions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own predictions"
  on public.predictions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own predictions"
  on public.predictions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own predictions"
  on public.predictions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---- Seed: 10 upcoming mock fixtures ----------------------------------------

insert into public.mock_fixtures (home_team, away_team, status) values
  ('Argentina', 'Brazil', 'pending'),
  ('France', 'Germany', 'pending'),
  ('England', 'Spain', 'pending'),
  ('Portugal', 'Netherlands', 'pending'),
  ('Italy', 'Belgium', 'pending'),
  ('Croatia', 'Uruguay', 'pending'),
  ('Mexico', 'USA', 'pending'),
  ('Japan', 'South Korea', 'pending'),
  ('Morocco', 'Senegal', 'pending'),
  ('Australia', 'Canada', 'pending');
