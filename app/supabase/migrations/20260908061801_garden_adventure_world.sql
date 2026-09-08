-- CANDIDATE: additive Garden adventure persistence. Apply only after local validation
-- and explicit approval for the production database. No existing data is deleted.
create schema if not exists garden_private;
revoke all on schema garden_private from public, anon;
grant usage on schema garden_private to authenticated;

create table if not exists public.garden_adventure_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  action text not null check (action ~ '^(plant:[0-2]|water:[0-2]|harvest:[0-2]|forage:[0-5]|discover:(pond|orchard|lookout)|butterfly|deliver)$'),
  created_at timestamptz not null default now(),
  primary key (user_id, day, action)
);
alter table public.garden_adventure_events enable row level security;
revoke all on public.garden_adventure_events from public, anon, authenticated;
grant select on public.garden_adventure_events to authenticated;
create policy garden_adventure_events_owner on public.garden_adventure_events for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.garden_adventure_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  decoration text not null default 'none' check (decoration in ('none','lantern','bench','flower-cart')),
  reminders_enabled boolean not null default false,
  quiet_start integer not null default 22 check (quiet_start between 0 and 23),
  quiet_end integer not null default 8 check (quiet_end between 0 and 23),
  last_invited_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.garden_adventure_settings enable row level security;
revoke all on public.garden_adventure_settings from public, anon, authenticated;
grant select on public.garden_adventure_settings to authenticated;
create policy garden_adventure_settings_owner on public.garden_adventure_settings for select to authenticated using ((select auth.uid()) = user_id);

-- This project has a future-dated Buddy migration; make the existing identity fields
-- available now so the same companion can follow the account between devices.
alter table public.profiles
  add column if not exists os_buddy_pet_id text default 'xiaoba',
  add column if not exists os_buddy_name text default 'Xiaoba',
  add column if not exists os_buddy_enabled boolean default true,
  add column if not exists os_buddy_position jsonb default '{"x":null,"y":null,"anchor":"bottom-right"}'::jsonb,
  add column if not exists os_buddy_onboarding_completed boolean default false,
  add column if not exists os_buddy_interaction_stats jsonb default '{}'::jsonb,
  add column if not exists os_buddy_unlocked_pets jsonb default '["xiaoba","doge"]'::jsonb;

-- All identity is taken from auth.uid(); callers never choose a user_id.
-- Unique earned facts merge naturally between devices. Row locking serializes each
-- user's dependency checks, reward grant and preferences/invitation claims.
create or replace function garden_private.adventure_action(p_day date, p_action text, p_value jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  settings public.garden_adventure_settings%rowtype;
  stamps integer;
  required integer;
  target text;
  facts jsonb;
  invited boolean := false;
  tz text;
  local_hour integer;
  preference boolean;
begin
  if actor is null then raise exception 'Sign in to save your garden' using errcode = '42501'; end if;
  -- Keep valid offline work saveable after a long absence. Rewards are private,
  -- cosmetic and unique per day; this is deduplication, not competitive anti-cheat.
  if p_day is null or p_day > today or p_day < date '2026-09-08' then raise exception 'Invalid garden day'; end if;
  if p_action is null or length(p_action) > 40 or p_value is null or jsonb_typeof(p_value) <> 'object' or octet_length(p_value::text) > 1024 then raise exception 'Invalid garden action'; end if;
  -- This is an identity assertion, never a write target: it also rejects a session
  -- switch between the client's getUser check and the subsequent RPC request.
  if p_value->>'account' is distinct from actor::text then raise exception 'Garden account changed' using errcode = '42501'; end if;
  insert into public.garden_adventure_settings(user_id) values(actor) on conflict do nothing;
  select * into settings from public.garden_adventure_settings where user_id = actor for update;
  select count(*) into stamps from public.garden_adventure_events where user_id = actor and action = 'deliver';

  if p_action = 'settings' then
    target := coalesce(p_value->>'decoration', settings.decoration);
    required := case target when 'none' then 0 when 'lantern' then 1 when 'bench' then 3 when 'flower-cart' then 7 else -1 end;
    if required < 0 or stamps < required then raise exception 'Decoration not yet unlocked'; end if;
    if p_value ? 'reminders_enabled' and jsonb_typeof(p_value->'reminders_enabled') <> 'boolean' then raise exception 'Invalid reminder preference'; end if;
    update public.garden_adventure_settings set
      decoration = target,
      reminders_enabled = coalesce((p_value->>'reminders_enabled')::boolean, reminders_enabled),
      quiet_start = coalesce((p_value->>'quiet_start')::integer, quiet_start),
      quiet_end = coalesce((p_value->>'quiet_end')::integer, quiet_end),
      updated_at = now()
    where user_id = actor;
  elsif p_action = 'invite' then
    select coalesce(timezone, 'auto'), coalesce(os_buddy_enabled, true) into tz, preference from public.profiles where id = actor;
    -- "auto" means the current device's IANA zone. An explicitly configured valid
    -- account zone always wins; the caller cannot bypass it with another zone.
    if not exists(select 1 from pg_timezone_names where name = tz) then tz := p_value->>'timezone'; end if;
    if tz is null or not exists(select 1 from pg_timezone_names where name = tz) then tz := 'UTC'; end if;
    local_hour := extract(hour from now() at time zone tz)::integer;
    -- Default-deny when notification preferences are unavailable; no surprise invites.
    preference := coalesce(preference, false) and coalesce((select daily_summary from public.notification_preferences where user_id = actor limit 1), false);
    if p_day = today and settings.reminders_enabled and preference
       and (settings.last_invited_at is null or settings.last_invited_at < now() - interval '24 hours')
       and not exists(select 1 from public.garden_adventure_events where user_id = actor and day = today)
       and not (case when settings.quiet_start = settings.quiet_end then true
         when settings.quiet_start < settings.quiet_end then local_hour >= settings.quiet_start and local_hour < settings.quiet_end
         else local_hour >= settings.quiet_start or local_hour < settings.quiet_end end)
    then
      update public.garden_adventure_settings set last_invited_at = now(), updated_at = now() where user_id = actor;
      invited := true;
    end if;
  elsif p_action ~ '^(plant:[0-2]|water:[0-2]|harvest:[0-2]|forage:[0-5]|discover:(pond|orchard|lookout)|butterfly|deliver)$' then
    -- An uncertain response can always be retried, including on another device.
    if not exists(select 1 from public.garden_adventure_events where user_id = actor and day = p_day and action = p_action) then
      if p_action like 'water:%' and not exists(select 1 from public.garden_adventure_events where user_id=actor and day=p_day and action='plant:' || split_part(p_action, ':', 2)) then
        raise exception 'Plant this bed first';
      end if;
      if p_action like 'harvest:%' and not exists(select 1 from public.garden_adventure_events where user_id=actor and day=p_day and action='water:' || split_part(p_action, ':', 2)) then
        raise exception 'Water this bed first';
      end if;
      if p_action = 'deliver' and (
        (select count(*) from public.garden_adventure_events where user_id=actor and day=p_day and action like 'harvest:%') < 3 or
        (select count(*) from public.garden_adventure_events where user_id=actor and day=p_day and action like 'forage:%') < 3
      ) then raise exception 'Harvest three beds and gather three finds first'; end if;
      insert into public.garden_adventure_events(user_id, day, action) values(actor, p_day, p_action) on conflict do nothing;
    end if;
  else raise exception 'Unknown garden action';
  end if;
  select * into settings from public.garden_adventure_settings where user_id=actor;
  select coalesce(jsonb_agg(action order by created_at, action), '[]'::jsonb) into facts from public.garden_adventure_events where user_id=actor and day=p_day;
  select count(*) into stamps from public.garden_adventure_events where user_id=actor and action='deliver';
  return jsonb_build_object('day',p_day,'actions',facts,'stamps',stamps,'settings',to_jsonb(settings),'invited',invited,
    'watered_at',(select coalesce(jsonb_object_agg(action, created_at),'{}'::jsonb) from public.garden_adventure_events where user_id=actor and day=p_day and action like 'water:%'));
end;
$$;
revoke all on function garden_private.adventure_action(date,text,jsonb) from public, anon;
grant execute on function garden_private.adventure_action(date,text,jsonb) to authenticated;

-- Exposed wrapper runs as the caller; privileged work stays in the unexposed schema.
create or replace function public.garden_adventure_action(p_day date, p_action text, p_value jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select garden_private.adventure_action(p_day, p_action, p_value);
$$;
revoke all on function public.garden_adventure_action(date,text,jsonb) from public, anon;
grant execute on function public.garden_adventure_action(date,text,jsonb) to authenticated;
