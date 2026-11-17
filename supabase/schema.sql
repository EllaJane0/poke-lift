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

-- ---------------------------------------------------------------
-- Steps (added for walking encounters and iPhone Shortcut sync)
-- ---------------------------------------------------------------
create table if not exists public.pokelift_steps (
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  day        date not null,
  steps      integer not null check (steps >= 0 and steps <= 200000),
  source     text not null default 'app',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.pokelift_steps enable row level security;
drop policy if exists "own steps" on public.pokelift_steps;
create policy "own steps" on public.pokelift_steps for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.pokelift_steps to authenticated;
revoke all on public.pokelift_steps from anon;

-- Private per-user code the Shortcut sends instead of signing in
create table if not exists public.pokelift_step_tokens (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now()
);
alter table public.pokelift_step_tokens enable row level security;
revoke all on public.pokelift_step_tokens from anon, authenticated;
grant select, insert, update on public.pokelift_step_tokens to authenticated;
drop policy if exists "own token" on public.pokelift_step_tokens;
create policy "own token" on public.pokelift_step_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.pokelift_step_token(regenerate boolean default false)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  t text;
begin
  if uid is null then raise exception 'Sign in first' using errcode = '28000'; end if;
  if not regenerate then
    select st.token into t from public.pokelift_step_tokens st where st.user_id = uid;
    if t is not null then return t; end if;
  end if;
  t := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into public.pokelift_step_tokens (user_id, token) values (uid, t)
    on conflict (user_id) do update set token = excluded.token, created_at = now();
  return t;
end $$;

-- Called by the iPhone Shortcut (anonymous, checked by token). Never lowers a day's total.
create or replace function public.pokelift_report_steps(token text, day date, steps numeric)
returns json language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  uid uuid;
  n integer := round($3);
  d date := $2;
begin
  select st.user_id into uid from public.pokelift_step_tokens st where st.token = $1;
  if uid is null then raise exception 'Unknown PokéLift step token' using errcode = '28000'; end if;
  if n < 0 or n > 200000 then raise exception 'Step count out of range' using errcode = '22003'; end if;
  if d < current_date - 7 or d > current_date + 1 then raise exception 'Date out of range' using errcode = '22008'; end if;
  insert into public.pokelift_steps as ps (user_id, day, steps, source, updated_at)
    values (uid, d, n, 'shortcut', now())
    on conflict on constraint pokelift_steps_pkey do update
      set steps = greatest(ps.steps, excluded.steps), source = 'shortcut', updated_at = now();
  return json_build_object('ok', true, 'day', d, 'steps', n);
end $$;
revoke all on function public.pokelift_report_steps(text, date, numeric) from public, authenticated;
grant execute on function public.pokelift_report_steps(text, date, numeric) to anon;
