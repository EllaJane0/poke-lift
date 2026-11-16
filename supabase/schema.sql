-- PokéLift database. Run once in Supabase: SQL Editor → New query → paste → Run.
-- Every row belongs to one signed-in user, and row-level security makes sure
-- people can only ever read or change their own rows.

create table if not exists public.pokelift_state (
  user_id    uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  core       jsonb,          -- settings, exercises, templates, calendar, Pokémon, eggs, badges
  active     jsonb,          -- the workout in progress, if any
  updated_at timestamptz not null default now()
);

create table if not exists public.pokelift_sessions (
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id         text not null,
  data       jsonb not null, -- one finished workout
  ended_at   timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists pokelift_sessions_user_ended on public.pokelift_sessions (user_id, ended_at);

alter table public.pokelift_state    enable row level security;
alter table public.pokelift_sessions enable row level security;

drop policy if exists "own state" on public.pokelift_state;
create policy "own state" on public.pokelift_state
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own sessions" on public.pokelift_sessions;
create policy "own sessions" on public.pokelift_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.pokelift_state, public.pokelift_sessions to authenticated;
