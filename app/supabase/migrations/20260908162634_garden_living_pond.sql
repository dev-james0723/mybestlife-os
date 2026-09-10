-- Living pond: additive, account-owned facts. Candidate; validate before production application.
-- Life content is never copied by receipt triggers. No existing garden balances are converted.
create schema if not exists private;

-- Receipt keys still identify individual rows. Reward identities follow only
-- explicit Task lineage, so undoing a sibling never edits another receipt.
create function private.garden_pond_action_key(p_user uuid,p_key text) returns text
language sql stable security definer set search_path='' as $$
 select case when p_key ~ '^task:[0-9a-fA-F-]{36}$' then coalesce(
  (select 'task:'||outcome_id::text from public.task_lineage where user_id=p_user and task_id=substring(p_key from 6)::uuid),p_key)
 else p_key end
$$;
revoke all on function private.garden_pond_action_key(uuid,text) from public,anon,authenticated;
create function private.garden_action_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin new.action_key:=private.garden_pond_action_key(new.user_id,new.canonical_key); return new; end $$;
revoke all on function private.garden_action_identity() from public,anon,authenticated;

create table public.garden_worlds (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  schema_version integer not null default 3 check (schema_version = 3),
  state jsonb not null default '{"objects":[{"id":"starter-reed-1","kind":"reed","slot":0,"rotation":0,"grant_id":null},{"id":"starter-reed-2","kind":"reed","slot":null,"rotation":0,"grant_id":null},{"id":"starter-stone","kind":"stone","slot":5,"rotation":0,"grant_id":null},{"id":"starter-leaf","kind":"leaf","slot":null,"rotation":0,"grant_id":null}],"discoveries":[],"observed_layouts":[],"fish_ready_at":null,"fish_adult":false}'::jsonb,
  connected_modules text[] not null default '{}',
  timezone text not null default 'UTC',
  pending_timezone text,
  invitations_enabled boolean not null default false,
  buddy_pause_until timestamptz,
  consecutive_dismissals integer not null default 0 check(consecutive_dismissals between 0 and 2),
  window_ends_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.garden_life_intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('task','habit','gratitude','rest')),
  source_id uuid,
  occurrence date,
  title text not null check (length(title) between 1 and 180),
  status text not null default 'active' check (status in ('active','paused','skipped','granted','acknowledged_without_grant')),
  version integer not null default 1 check(version>0),
  scope text not null default 'completion' check(scope in ('completion','chosen_step')),
  planned_for date,
  paused_at timestamptz,
  zone_at_selection text not null,
  selected_at timestamptz not null default now(),
  settled_at timestamptz,
  unique(user_id,id)
);
create index garden_intentions_active on public.garden_life_intentions(user_id,status);
-- Explicitly chosen records for the same action. Keys survive settled source deletion for deduplication.
create table public.garden_evidence_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intention_id uuid not null,
  source_kind text not null check(source_kind in ('task','habit','gratitude','rest')),
  source_id uuid,
  occurrence date,
  canonical_key text not null,
  action_key text not null,
  is_primary boolean not null default false,
  linked_at timestamptz not null default now(),
  zone_at_link text not null,
  unique(user_id,canonical_key),
  unique(user_id,action_key),
  foreign key(user_id,intention_id) references public.garden_life_intentions(user_id,id)
);
create index garden_evidence_intention on public.garden_evidence_links(user_id,intention_id);
create index garden_evidence_source on public.garden_evidence_links(user_id,source_kind,source_id);
create trigger garden_evidence_identity before insert or update on public.garden_evidence_links
 for each row execute function private.garden_action_identity();
create table public.garden_source_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null,
  source_id uuid,
  canonical_key text not null,
  occurrence date,
  first_observed_at timestamptz not null default now(),
  corrected boolean not null default false,
  source_deleted boolean not null default false,
  evidence_kind text not null default 'saved_record' check(evidence_kind in ('saved_record','self_report')),
  settled_at timestamptz,
  primary key(user_id,canonical_key)
);
create index garden_receipt_source on public.garden_source_receipts(user_id,source_kind,source_id);
create index garden_receipt_unclaimed_age on public.garden_source_receipts(user_id,first_observed_at) where settled_at is null;
create table public.garden_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intention_id uuid not null,
  canonical_key text not null,
  action_key text not null,
  source_kind text not null,
  issued_at timestamptz not null default now(),
  consumed_by text,
  rule_version integer not null default 1,
  evidence_kind text not null default 'saved_record' check(evidence_kind in ('saved_record','self_report')),
  unique(user_id,intention_id), unique(user_id,canonical_key), unique(user_id,consumed_by),
  unique(user_id,action_key),
  foreign key(user_id,intention_id) references public.garden_life_intentions(user_id,id)
);
create index garden_grants_budget on public.garden_grants(user_id,issued_at);
create trigger garden_grant_identity before insert or update on public.garden_grants
 for each row execute function private.garden_action_identity();
create table public.garden_pond_commands (
  user_id uuid not null references auth.users(id) on delete cascade,
  command_id uuid not null,
  request jsonb not null,
  request_hash bytea not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id,command_id)
);
create table public.garden_world_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  fact_key text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  unique(user_id,kind,fact_key)
);

-- Revoke default API grants as well as enabling RLS. All mutations use authenticated commands.
do $$ declare t text; begin
  foreach t in array array['garden_worlds','garden_life_intentions','garden_evidence_links','garden_source_receipts','garden_grants','garden_pond_commands','garden_world_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
  end loop;
end $$;

create function private.garden_pond_snapshot(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'world', w.state || jsonb_build_object('revision',w.revision,'schema_version',w.schema_version),
  'invitations',jsonb_build_object('enabled',w.invitations_enabled,'pause_until',w.buddy_pause_until),
  'connections',to_jsonb(w.connected_modules),'timezone',w.timezone,'pending_timezone',w.pending_timezone,
  'intentions',coalesce((select jsonb_agg(to_jsonb(i) order by i.selected_at) from public.garden_life_intentions i where i.user_id=p_user and (i.status in ('active','paused') or i.settled_at>now()-interval '7 days' or exists(select 1 from public.garden_grants g where g.user_id=p_user and g.intention_id=i.id))),'[]'::jsonb),
  'evidence_links',coalesce((select jsonb_agg(to_jsonb(l) order by l.linked_at,l.id) from public.garden_evidence_links l join public.garden_life_intentions i on i.user_id=l.user_id and i.id=l.intention_id where l.user_id=p_user and (i.status in ('active','paused') or i.settled_at>now()-interval '7 days' or exists(select 1 from public.garden_grants g where g.user_id=p_user and g.intention_id=i.id))),'[]'::jsonb),
  'grants',coalesce((select jsonb_agg(to_jsonb(g) order by g.issued_at) from public.garden_grants g where g.user_id=p_user),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.garden_world_events e where e.user_id=p_user and e.seen_at is null),'[]'::jsonb)
 ) from public.garden_worlds w where w.user_id=p_user
$$;
revoke all on function private.garden_pond_snapshot(uuid) from public,anon,authenticated;

-- Pure habitat validation; same 3x4 non-wrapping adjacency as the client preview.
create function private.garden_pond_neighbours(p_slot integer) returns integer[]
language sql immutable set search_path='' as $$
 select coalesce(array_agg(n order by ord),'{}'::integer[]) from unnest(array[p_slot-4,case when p_slot%4<3 then p_slot+1 end,p_slot+4,case when p_slot%4>0 then p_slot-1 end]) with ordinality a(n,ord)
 where p_slot between 0 and 11 and n between 0 and 11
$$;
create function private.garden_pond_habitat(p_state jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare cells text[]:=array_fill('water'::text,array[12]); o jsonb; i int; j int; n int; q int[]; seen int[]:='{}'; count_open int:=0; largest int:=0; count_component int; reeds boolean:=false;
begin
 for o in select value from jsonb_array_elements(p_state->'objects') loop
  if o->>'slot' is not null then cells[(o->>'slot')::int+1]:=o->>'kind'; end if;
 end loop;
 for i in 0..11 loop
  if cells[i+1]='reed' then
   if exists(select 1 from unnest(private.garden_pond_neighbours(i)) neighbour where cells[neighbour+1]='reed') and
      exists(select 1 from unnest(private.garden_pond_neighbours(i)) neighbour where cells[neighbour+1]='water') then reeds:=true; end if;
  end if;
  if cells[i+1]<>'water' then continue; end if;
  count_open:=count_open+1;
  if i=any(seen) then continue; end if;
  q:=array[i]; seen:=array_append(seen,i); count_component:=0;
  while cardinality(q)>0 loop
   j:=q[1]; q:=q[2:]; count_component:=count_component+1;
   foreach n in array private.garden_pond_neighbours(j) loop
    if cells[n+1]='water' and not n=any(seen) then seen:=array_append(seen,n); q:=array_append(q,n); end if;
   end loop;
  end loop;
  largest:=greatest(largest,count_component);
 end loop;
 return jsonb_build_object('largestOpenWater',largest,'openWater',count_open,'dawnfish',largest>=3,'leafsnail',reeds,
  'dragonfly',(p_state->'discoveries') ?& array['dawnfish','leafsnail'] and 'perch'=any(cells) and 'leaf'=any(cells) and count_open>=2);
end $$;
revoke all on function private.garden_pond_neighbours(integer),private.garden_pond_habitat(jsonb) from public,anon,authenticated;

-- Match Habits' existing calendar-frequency rules; extra repetitions do not multiply rewards.
create function private.garden_habit_required(p_frequency jsonb,p_day date,p_start date) returns boolean
language plpgsql immutable set search_path='' as $$
declare interval_days int;
begin
 if p_day is null or p_start is null or p_day<p_start then return false; end if;
 case p_frequency->>'kind'
  when 'daily' then return true;
  when 'weekly_count' then return true;
  when 'weekdays' then return coalesce((p_frequency->'days') @> jsonb_build_array(extract(dow from p_day)::int),false);
  when 'every_n_days' then
   if coalesce(p_frequency->>'n','') !~ '^[0-9]{1,6}$' then return false; end if;
   interval_days:=greatest(1,(p_frequency->>'n')::int); return (p_day-p_start)%interval_days=0;
  else return false;
 end case;
end $$;
revoke all on function private.garden_habit_required(jsonb,date,date) from public,anon,authenticated;

-- Content deletion is independent of connector consent. Retain only opaque settled keys.
create function private.garden_pond_forget_source(p_user uuid,p_kind text,p_source uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.garden_source_receipts set source_deleted=true,corrected=true,source_id=null
  where user_id=p_user and source_kind=p_kind and (source_id=p_source or (p_kind='habit' and canonical_key like 'habit:'||p_source::text||':%'));
 update public.garden_pond_commands c set
  request=case when c.request->>'source_id'=p_source::text then (c.request-'source_id')||jsonb_build_object('title','A step you chose') else c.request end,
  result=jsonb_set(c.result,'{save,intentions}',coalesce((select jsonb_agg(case when item->>'source_id'=p_source::text then item||jsonb_build_object('title','A step you chose','source_id',null) else item end) from jsonb_array_elements(c.result#>'{save,intentions}') item),'[]'::jsonb))
  where c.user_id=p_user;
 -- An alias changing on another device invalidates confirmations of the old group too.
 update public.garden_life_intentions i set version=version+1
  where i.user_id=p_user and not (i.source_kind=p_kind and i.source_id is not distinct from p_source)
   and exists(select 1 from public.garden_evidence_links l where l.user_id=p_user and l.intention_id=i.id and l.source_kind=p_kind and l.source_id=p_source and not l.is_primary);
 update public.garden_life_intentions set source_id=null,title='A step you chose',version=version+1,settled_at=case when status in ('active','paused') and exists(select 1 from public.garden_evidence_links l where l.user_id=p_user and l.intention_id=garden_life_intentions.id and not l.is_primary and l.source_id is not null and not (l.source_kind=p_kind and l.source_id=p_source)) then settled_at else coalesce(settled_at,now()) end,status=case when status in ('active','paused') and not exists(select 1 from public.garden_evidence_links l where l.user_id=p_user and l.intention_id=garden_life_intentions.id and not l.is_primary and l.source_id is not null and not (l.source_kind=p_kind and l.source_id=p_source)) then 'skipped' else status end
  where user_id=p_user and source_kind=p_kind and source_id=p_source;
 update public.garden_evidence_links set source_id=null where user_id=p_user and source_kind=p_kind and source_id=p_source;
 delete from public.garden_evidence_links l using public.garden_life_intentions i
  where l.user_id=p_user and i.user_id=p_user and i.id=l.intention_id
   and (i.status='skipped' or (i.status in ('active','paused') and l.source_id is null and not l.is_primary));
end $$;
revoke all on function private.garden_pond_forget_source(uuid,text,uuid) from public,anon,authenticated;
create function private.garden_pond_habit_deleted() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform private.garden_pond_forget_source(old.user_id,'habit',old.id); return old; end $$;
revoke all on function private.garden_pond_habit_deleted() from public,anon,authenticated;
create trigger garden_pond_habit_deleted after delete on public.habits for each row execute function private.garden_pond_habit_deleted();

-- Atomic, minimal transitions from the original OS tables. A trigger cannot award game items.
create function private.garden_life_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
declare r jsonb; prior jsonb; u uuid; source uuid; canonical text; occurrence_day date; kind text:=tg_argv[0]; completed boolean; was_completed boolean;
begin
 r:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 prior:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 u:=(r->>'user_id')::uuid; source:=(r->>'id')::uuid;
 -- Deletion/correction remains effective after a connector is switched off.
 if tg_op='DELETE' then
  if kind='habit' then
   -- Removing one check-in does not delete the habit itself or its chosen occurrence.
   update public.garden_source_receipts set source_deleted=true,corrected=true,source_id=null where user_id=u and source_kind=kind and source_id=source;
  else perform private.garden_pond_forget_source(u,kind,source); end if;
  return old;
 end if;
 if tg_op='UPDATE' and (prior->>'user_id' is distinct from r->>'user_id' or prior->>'id' is distinct from r->>'id') then
  raise exception 'Life source identity cannot change';
 end if;
 completed:=case when kind in ('task','habit') then r->>'status'='done' else true end;
 was_completed:=case when kind in ('task','habit') then coalesce(prior->>'status'='done',false) else tg_op<>'INSERT' end;
 if tg_op='UPDATE' and kind='habit' and (prior->>'habit_id' is distinct from r->>'habit_id' or prior->>'completion_date' is distinct from r->>'completion_date') then
  update public.garden_source_receipts set corrected=true where user_id=u and source_kind=kind and source_id=source;
  return new; -- A rewritten occurrence is not a new completion event.
 end if;
 if not completed then
  update public.garden_source_receipts set corrected=true where user_id=u and source_kind=kind and source_id=source;
  return new;
 end if;
 if was_completed then return new; end if;
 if not exists(select 1 from public.garden_worlds where user_id=u and kind=any(connected_modules)) then return new; end if;
 if kind='habit' then
  if not exists(select 1 from public.habits where id=(r->>'habit_id')::uuid and user_id=u and archived_at is null and is_active) then return new; end if;
  occurrence_day:=(r->>'completion_date')::date;
  -- This is a saved source fact, not an award. Frequency is checked when the
  -- occurrence is deliberately selected/linked, in the Habits device calendar.
  -- Guessing its timezone from the world here can drop a valid source write.
  canonical:='habit:'||(r->>'habit_id')||':'||occurrence_day::text;
 else canonical:=kind||':'||source::text; end if;
 insert into public.garden_source_receipts(user_id,source_kind,source_id,canonical_key,occurrence) values(u,kind,source,canonical,occurrence_day)
 on conflict(user_id,canonical_key) do update set corrected=false,source_deleted=false,source_id=excluded.source_id;
 return new;
end $$;
revoke all on function private.garden_life_receipt() from public,anon,authenticated;
create trigger garden_task_receipt after insert or update or delete on public.tasks for each row execute function private.garden_life_receipt('task');
create trigger garden_habit_receipt after insert or update or delete on public.habit_completions for each row execute function private.garden_life_receipt('habit');
create trigger garden_gratitude_receipt after insert or update or delete on public.grateful_things for each row execute function private.garden_life_receipt('gratitude');

create function private.garden_pond_source_key(p_kind text,p_source uuid,p_occurrence date,p_intention uuid) returns text
language sql immutable set search_path='' as $$
 select case when p_kind='rest' then 'rest:'||p_intention::text when p_kind='habit' then 'habit:'||p_source::text||':'||p_occurrence::text else p_kind||':'||p_source::text end
$$;
revoke all on function private.garden_pond_source_key(text,uuid,date,uuid) from public,anon,authenticated;
create function private.garden_pond_lock_source(p_user uuid,p_kind text,p_source uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_kind='task' then perform 1 from public.tasks where user_id=p_user and id=p_source for key share;
 elsif p_kind='habit' then perform 1 from public.habits where user_id=p_user and id=p_source and archived_at is null for key share;
 elsif p_kind='gratitude' then perform 1 from public.grateful_things where user_id=p_user and id=p_source for key share;
 else raise exception 'Choose a saved life record'; end if;
 if not found then raise exception 'Linked life record is unavailable'; end if;
end $$;
revoke all on function private.garden_pond_lock_source(uuid,text,uuid) from public,anon,authenticated;

-- New clients capture the Habits calendar before persisting an outbox command.
-- Legacy pending commands retain their previous world-calendar interpretation.
create function private.garden_habit_calendar(p_calendar jsonb,p_legacy_zone text,p_now timestamptz default now())
returns table(occurrence date,timezone text)
language plpgsql stable set search_path='' as $$
begin
 if p_calendar is null then
  timezone:=p_legacy_zone;
 else
  if jsonb_typeof(p_calendar) is distinct from 'object' then raise exception 'Choose a valid habit calendar'; end if;
  if jsonb_typeof(p_calendar->'timezone') is distinct from 'string' or jsonb_typeof(p_calendar->'date') is distinct from 'string'
   or exists(select 1 from jsonb_object_keys(p_calendar) field where field not in ('date','timezone')) then raise exception 'Choose a valid habit calendar'; end if;
  timezone:=p_calendar->>'timezone';
 end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=timezone) then raise exception 'Unknown habit timezone'; end if;
 occurrence:=(p_now at time zone timezone)::date;
 if p_calendar is not null and p_calendar->>'date' is distinct from occurrence::text then
  raise exception 'The habit day changed. Clear this proposed change and choose the habit again for today';
 end if;
 return next;
end $$;
revoke all on function private.garden_habit_calendar(jsonb,text,timestamptz) from public,anon,authenticated;

-- Every write for one user takes the same row lock. Retries are checked before revision checks.
create function private.garden_pond_command(p_command_id uuid,p_revision bigint,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); w public.garden_worlds%rowtype; i public.garden_life_intentions%rowtype;
 r public.garden_source_receipts%rowtype; g public.garden_grants%rowtype; saved public.garden_pond_commands%rowtype;
 evidence public.garden_life_intentions%rowtype; linked public.garden_evidence_links%rowtype; bound_intention uuid; primary_key text;
 k text:=p_command->>'kind'; s jsonb; result jsonb; objects jsonb; o jsonb; habitat jsonb; v_object_id text; slot int; rotation int; recipe text;
 v_source_kind text; v_source_id uuid; canonical text; life_date date; zone text; source_zone text; selected_id uuid;
 action text; next_scope text; next_plan date; source_changed boolean;
 count_day int; count_week int; species text; layout_key text; changed boolean:=true;
begin
 if u is null then raise exception 'Sign in to enter your pond'; end if;
 if p_command is null or jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>4096 then raise exception 'Invalid pond command'; end if;
 if p_command->>'account' is distinct from u::text then raise exception 'Garden account changed'; end if;
 if p_command_id is null then raise exception 'Command identity is required'; end if;
 -- Initial account timezone follows the OS; auto uses a validated device zone once.
 select p.timezone into zone from public.profiles p where p.id=u;
 if zone is null or zone='auto' then zone:=p_command->>'device_timezone'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then zone:='UTC'; end if;
 insert into public.garden_worlds(user_id,timezone) values(u,zone) on conflict do nothing;
 select * into w from public.garden_worlds where user_id=u for update;
 if w.window_ends_at<=now() then
  zone:=coalesce(w.pending_timezone,w.timezone);
  life_date:=((now() at time zone zone)-interval '4 hours')::date;
  update public.garden_worlds set timezone=zone,pending_timezone=null,window_ends_at=((life_date+1)::timestamp+interval '4 hours') at time zone zone where user_id=u returning * into w;
 end if;
 if k='read' then
  -- Lazy retention on the user's next visit. Active intentions and all settled evidence stay replayable.
  delete from public.garden_source_receipts receipt where receipt.user_id=u and receipt.settled_at is null
   and receipt.first_observed_at<now()-interval '14 days'
   and not exists(select 1 from public.garden_grants grant_row where grant_row.user_id=u and grant_row.canonical_key=receipt.canonical_key)
   and not exists(select 1 from public.garden_evidence_links l where l.user_id=u and l.action_key=private.garden_pond_action_key(u,receipt.canonical_key))
   and not exists(select 1 from public.garden_life_intentions intent where intent.user_id=u and intent.status in ('active','paused') and (
    receipt.canonical_key=case when intent.source_kind='habit' then 'habit:'||intent.source_id::text||':'||intent.occurrence::text else intent.source_kind||':'||intent.source_id::text end
    or (intent.source_kind='gratitude' and intent.source_id is null and receipt.source_kind='gratitude' and receipt.first_observed_at>=intent.selected_at)
   ));
  return jsonb_build_object('status','ok','save',private.garden_pond_snapshot(u));
 end if;
 select * into saved from public.garden_pond_commands where user_id=u and command_id=p_command_id;
 if found then
  if saved.request_hash<>sha256(convert_to(p_command::text,'UTF8')) then raise exception 'Command identity was already used for another action'; end if;
  -- The same command never executes twice. Return current state so an old response cannot rewind another device.
  return jsonb_build_object('status','ok','save',private.garden_pond_snapshot(u));
 end if;
 if p_revision is distinct from w.revision then return jsonb_build_object('status','conflict','save',private.garden_pond_snapshot(u)); end if;
 s:=w.state;
 source_zone:=w.timezone;
 life_date:=((now() at time zone w.timezone)-interval '4 hours')::date;
 if k in ('intention','claim','skip','evidence') then
  select * into i from public.garden_life_intentions where user_id=u and id=(p_command->>'intention_id')::uuid;
  if not found then raise exception 'Step is unavailable'; end if;
  -- Preserve pending v1 commands. Once a step changes, callers must acknowledge its current version.
  if p_command ? 'intention_version' then
   if jsonb_typeof(p_command->'intention_version') is distinct from 'number' or p_command->>'intention_version' !~ '^[1-9][0-9]{0,8}$' then raise exception 'Invalid step version'; end if;
   if (p_command->>'intention_version')::int<>i.version then raise exception 'This step changed. Review its current details before continuing'; end if;
  elsif i.version<>1 or k in ('intention','evidence') then raise exception 'This step changed. Review its current details before continuing'; end if;
 end if;
 if k='connections' then
  if jsonb_typeof(p_command->'modules') is distinct from 'array' or jsonb_array_length(p_command->'modules')>4 or exists(select 1 from jsonb_array_elements_text(p_command->'modules') m where m not in ('task','habit','gratitude','rest')) then raise exception 'Invalid life connections'; end if;
  update public.garden_worlds set connected_modules=array(select distinct jsonb_array_elements_text(p_command->'modules')) where user_id=u;
 elsif k='buddy-settings' then
  perform private.garden_pond_invitation('settings',p_command);
 elsif k='timezone' then
  zone:=p_command->>'timezone';
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Unknown timezone'; end if;
  update public.garden_worlds set pending_timezone=zone where user_id=u;
 elsif k='select' or (k='intention' and p_command->>'action'='revise') then
  if k='intention' and i.status not in ('active','paused') then raise exception 'An acknowledged step keeps its history; choose a new step'; end if;
  v_source_kind:=p_command->>'source_kind'; v_source_id:=nullif(p_command->>'source_id','')::uuid;
  next_scope:=coalesce(p_command->>'scope','completion');
  if next_scope not in ('completion','chosen_step') or (next_scope='chosen_step' and v_source_kind is distinct from 'task') then raise exception 'A chosen part must be linked to your own task'; end if;
  if p_command->>'planned_for' is not null and p_command->>'planned_for' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Choose a valid planned date'; end if;
  next_plan:=(p_command->>'planned_for')::date;
  if v_source_kind is null or v_source_kind not in ('task','habit','gratitude','rest') then raise exception 'Choose an available life source'; end if;
  -- A revision of the same habit keeps its occurrence and zone, including while travelling.
  if v_source_kind='habit' then
   if k='intention' and i.source_kind='habit' and i.source_id=v_source_id then
    life_date:=i.occurrence; source_zone:=i.zone_at_selection;
   else
    select c.occurrence,c.timezone into life_date,source_zone from private.garden_habit_calendar(p_command->'source_calendar',w.timezone) c;
   end if;
  elsif p_command ? 'source_calendar' then raise exception 'A habit calendar belongs to a habit step'; end if;
  if not v_source_kind=any(w.connected_modules) then raise exception 'Connect this life module first'; end if;
  if length(btrim(coalesce(p_command->>'title',''))) not between 1 and 180 then raise exception 'Choose a short name for your step'; end if;
  if k='select' and (select count(*) from public.garden_life_intentions where user_id=u and status='active')>=2 then raise exception 'Finish, skip or pause one of your two selected steps'; end if;
  -- Keep a source from being deleted between ownership validation and linking the intention.
  -- Source rows precede intention updates in the lock order, matching deletion triggers.
  if v_source_kind='task' then
   perform 1 from public.tasks where id=v_source_id and user_id=u for key share;
   if not found then raise exception 'Task is unavailable'; end if;
  elsif v_source_kind='habit' then
   perform 1 from public.habits where id=v_source_id and user_id=u and archived_at is null for key share;
   if not found then raise exception 'Habit is unavailable'; end if;
  elsif v_source_kind='gratitude' and v_source_id is not null then
   perform 1 from public.grateful_things where id=v_source_id and user_id=u for key share;
   if not found then raise exception 'Gratitude record is unavailable'; end if;
  end if;
  if v_source_kind='habit' and not (k='intention' and i.source_kind='habit' and i.source_id=v_source_id) and not exists(select 1 from public.habits h where h.id=v_source_id and h.user_id=u and h.is_active and private.garden_habit_required(h.frequency,life_date,(h.created_at at time zone source_zone)::date)) then raise exception 'This habit is not scheduled for this occurrence; choose another step'; end if;
  if v_source_id is not null and exists(select 1 from public.garden_life_intentions where user_id=u and source_kind=v_source_kind and source_id=v_source_id and status in ('active','paused') and (k='select' or id<>i.id)) then raise exception 'This step is already selected or paused'; end if;
  if v_source_kind='rest' and v_source_id is not null then raise exception 'Rest is a self-confirmed step'; end if;
  if k='select' then
   insert into public.garden_life_intentions(user_id,source_kind,source_id,occurrence,title,zone_at_selection,scope,planned_for)
    values(u,v_source_kind,v_source_id,case when v_source_kind='habit' then life_date end,btrim(p_command->>'title'),source_zone,next_scope,next_plan) returning id into selected_id;
  else
   source_changed:=i.source_kind is distinct from v_source_kind or i.source_id is distinct from v_source_id or i.scope<>next_scope;
   if (i.source_kind is distinct from v_source_kind or i.source_id is distinct from v_source_id) and exists(select 1 from public.garden_evidence_links where user_id=u and intention_id=i.id and not is_primary) then raise exception 'Remove linked records before changing the source of this shared step'; end if;
   update public.garden_life_intentions set source_kind=v_source_kind,source_id=v_source_id,occurrence=case when v_source_kind='habit' then life_date end,
    title=btrim(p_command->>'title'),scope=next_scope,planned_for=next_plan,version=version+1,
    selected_at=case when source_changed then now() else selected_at end,zone_at_selection=case when source_changed then source_zone else zone_at_selection end
    where user_id=u and id=i.id and version=i.version;
   if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
   if i.source_kind is distinct from v_source_kind or i.source_id is distinct from v_source_id then delete from public.garden_evidence_links where user_id=u and intention_id=i.id; end if;
  end if;
 elsif k='intention' then
  action:=p_command->>'action';
  if action='pause' then
   if i.status<>'active' then raise exception 'Only an active step can pause'; end if;
   if (select count(*) from public.garden_life_intentions where user_id=u and status='paused')>=20 then raise exception 'Keep up to twenty paused steps; skip one you no longer want'; end if;
   update public.garden_life_intentions set status='paused',paused_at=now(),version=version+1 where user_id=u and id=i.id and version=i.version;
   if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
  elsif action='resume' then
   if i.status<>'paused' then raise exception 'This step is not paused'; end if;
   if not i.source_kind=any(w.connected_modules) and not exists(select 1 from public.garden_evidence_links where user_id=u and intention_id=i.id and source_id is not null and source_kind=any(w.connected_modules)) then raise exception 'Reconnect this life module before resuming'; end if;
   if (select count(*) from public.garden_life_intentions where user_id=u and status='active')>=2 then raise exception 'Pause or skip a selected step before resuming this one'; end if;
   update public.garden_life_intentions set status='active',paused_at=null,version=version+1 where user_id=u and id=i.id and version=i.version;
   if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
  else raise exception 'Unknown step adjustment'; end if;
 elsif k='evidence' then
  action:=p_command->>'action';
  if action='link' then
   if i.status='skipped' then raise exception 'Choose an active or acknowledged step to link'; end if;
   v_source_kind:=p_command->>'source_kind'; v_source_id:=(p_command->>'source_id')::uuid;
   if v_source_kind is null or v_source_kind not in ('task','habit','gratitude') or v_source_id is null then raise exception 'Choose a saved life record'; end if;
   if not v_source_kind=any(w.connected_modules) then raise exception 'Connect this life module before linking it'; end if;
   if (select count(*) from public.garden_evidence_links where user_id=u and intention_id=i.id and not is_primary)>=4 then raise exception 'Keep up to four related records for one step'; end if;
   -- An earned action remains history even if its original habit was later archived.
   -- The intention CAS below still prevents a concurrent deletion from restoring private data.
   if i.status in ('active','paused') and i.source_kind<>'rest' and i.source_id is not null then perform private.garden_pond_lock_source(u,i.source_kind,i.source_id); end if;
   perform private.garden_pond_lock_source(u,v_source_kind,v_source_id);
   if v_source_kind='habit' then
    select c.occurrence,c.timezone into life_date,source_zone from private.garden_habit_calendar(p_command->'source_calendar',w.timezone) c;
    if not exists(select 1 from public.habits h where h.user_id=u and h.id=v_source_id and h.is_active and private.garden_habit_required(h.frequency,life_date,(h.created_at at time zone source_zone)::date)) then raise exception 'This habit is not scheduled for this occurrence'; end if;
   elsif p_command ? 'source_calendar' then raise exception 'A habit calendar belongs to a habit step'; end if;
   canonical:=private.garden_pond_source_key(v_source_kind,v_source_id,case when v_source_kind='habit' then life_date end,i.id);
   select coalesce((select canonical_key from public.garden_evidence_links where user_id=u and intention_id=i.id and is_primary limit 1),private.garden_pond_source_key(i.source_kind,i.source_id,i.occurrence,i.id),(select canonical_key from public.garden_grants where user_id=u and intention_id=i.id)) into primary_key;
   if private.garden_pond_action_key(u,canonical)=private.garden_pond_action_key(u,primary_key) then raise exception 'This record is already the source of this step'; end if;
   if exists(select 1 from public.garden_evidence_links where user_id=u and action_key=private.garden_pond_action_key(u,canonical)) then raise exception 'This record already belongs to a linked step'; end if;
   if exists(select 1 from public.garden_source_receipts where user_id=u and canonical_key=canonical and settled_at is not null) or exists(select 1 from public.garden_grants where user_id=u and action_key=private.garden_pond_action_key(u,canonical)) then raise exception 'This record was already acknowledged separately; its earned progress stays unchanged'; end if;
   if primary_key is not null then
    select intention_id into bound_intention from public.garden_evidence_links where user_id=u and action_key=private.garden_pond_action_key(u,primary_key);
    if bound_intention is not null and bound_intention<>i.id then raise exception 'Use the original shared step for this record'; end if;
    if i.status in ('active','paused') and (exists(select 1 from public.garden_source_receipts where user_id=u and canonical_key=primary_key and settled_at is not null) or exists(select 1 from public.garden_grants where user_id=u and action_key=private.garden_pond_action_key(u,primary_key))) then raise exception 'This action was already acknowledged; link records to its original step'; end if;
   end if;
   -- Match source-deletion ordering: source -> intention -> evidence rows. CAS rejects stale privacy state.
   update public.garden_life_intentions set version=version+1 where user_id=u and id=i.id and version=i.version;
   if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
   if primary_key is not null then
    insert into public.garden_evidence_links(user_id,intention_id,source_kind,source_id,occurrence,canonical_key,is_primary,linked_at,zone_at_link)
     values(u,i.id,i.source_kind,case when i.source_kind='rest' then i.id else i.source_id end,i.occurrence,primary_key,true,i.selected_at,i.zone_at_selection) on conflict do nothing;
   end if;
   insert into public.garden_evidence_links(user_id,intention_id,source_kind,source_id,occurrence,canonical_key,zone_at_link)
    values(u,i.id,v_source_kind,v_source_id,case when v_source_kind='habit' then life_date end,canonical,source_zone);
  elsif action='unlink' then
   if i.status not in ('active','paused') then raise exception 'Acknowledged records stay linked so the same action cannot reward twice'; end if;
   select * into linked from public.garden_evidence_links where user_id=u and intention_id=i.id and id=(p_command->>'link_id')::uuid and not is_primary;
   if not found then raise exception 'Linked record is unavailable'; end if;
   update public.garden_life_intentions set version=version+1 where user_id=u and id=i.id and version=i.version;
   if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
   delete from public.garden_evidence_links where user_id=u and id=linked.id;
   if not exists(select 1 from public.garden_evidence_links where user_id=u and intention_id=i.id and not is_primary) then delete from public.garden_evidence_links where user_id=u and intention_id=i.id; end if;
  else raise exception 'Unknown record-link action'; end if;
 elsif k='skip' then
  update public.garden_life_intentions set status='skipped',settled_at=now(),version=version+1 where user_id=u and id=i.id and version=i.version and status in ('active','paused');
  if not found then raise exception 'This step is no longer active'; end if;
  delete from public.garden_evidence_links where user_id=u and intention_id=i.id;
 elsif k='claim' then
  if i.status='paused' then raise exception 'Resume this step when you are ready to confirm it'; end if;
  if i.status<>'active' then changed:=false;
  else
   evidence:=i;
   if p_command->>'link_id' is not null then
    select * into linked from public.garden_evidence_links where user_id=u and intention_id=i.id and id=(p_command->>'link_id')::uuid and not is_primary and source_id is not null;
    if not found then raise exception 'Linked record is unavailable'; end if;
    evidence.source_kind:=linked.source_kind; evidence.source_id:=linked.source_id; evidence.occurrence:=linked.occurrence; evidence.selected_at:=linked.linked_at; evidence.zone_at_selection:=linked.zone_at_link; evidence.scope:='completion';
   end if;
   if not evidence.source_kind=any(w.connected_modules) then raise exception 'This life connection is paused'; end if;
   if evidence.source_kind='task' and evidence.scope='chosen_step' then
    if p_command->'confirmed' is distinct from 'true'::jsonb then raise exception 'Confirm the part of this task you chose'; end if;
    perform 1 from public.tasks where user_id=u and id=evidence.source_id for update;
    if not found then raise exception 'Task is unavailable'; end if;
    canonical:='task:'||evidence.source_id::text;
    -- Explicit self-report, without marking the source task done. It consumes this task's one opportunity.
    insert into public.garden_source_receipts(user_id,source_kind,source_id,canonical_key,evidence_kind) values(u,'task',evidence.source_id,canonical,'self_report')
    on conflict(user_id,canonical_key) do update set corrected=false,source_deleted=false,source_id=excluded.source_id,evidence_kind=case when garden_source_receipts.settled_at is null then 'self_report' else garden_source_receipts.evidence_kind end,
     first_observed_at=case when garden_source_receipts.settled_at is null then now() else garden_source_receipts.first_observed_at end;
   elsif evidence.source_kind='rest' then
    if p_command->'confirmed' is distinct from 'true'::jsonb then raise exception 'Confirm your chosen rest action'; end if;
    canonical:='rest:'||i.id::text;
    insert into public.garden_source_receipts(user_id,source_kind,source_id,canonical_key,evidence_kind) values(u,'rest',i.id,canonical,'self_report') on conflict do nothing;
   elsif evidence.source_kind='task' then canonical:='task:'||evidence.source_id::text;
   elsif evidence.source_kind='habit' then canonical:='habit:'||evidence.source_id::text||':'||evidence.occurrence::text;
   elsif evidence.source_kind='gratitude' then
    if evidence.source_id is null then
     v_source_id:=(p_command->>'source_id')::uuid;
     perform 1 from public.grateful_things where id=v_source_id and user_id=u for key share;
     if not found then raise exception 'Gratitude record is unavailable'; end if;
     update public.garden_life_intentions set source_id=v_source_id where user_id=u and id=i.id and version=i.version;
     if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
     evidence.source_id:=v_source_id;
    end if;
    canonical:='gratitude:'||evidence.source_id::text;
   end if;
   select * into r from public.garden_source_receipts where user_id=u and canonical_key=canonical and not corrected and not source_deleted for update;
   if not found then raise exception 'Save this action in its life module first'; end if;
   if r.first_observed_at<evidence.selected_at and ((r.first_observed_at at time zone evidence.zone_at_selection)-case when evidence.source_kind='habit' then interval '0 hours' else interval '4 hours' end)::date<>((evidence.selected_at at time zone evidence.zone_at_selection)-case when evidence.source_kind='habit' then interval '0 hours' else interval '4 hours' end)::date then raise exception 'Choose a new step instead of an old record'; end if;
   select intention_id into bound_intention from public.garden_evidence_links where user_id=u and action_key=private.garden_pond_action_key(u,canonical);
   if bound_intention is not null and bound_intention<>i.id and exists(select 1 from public.garden_life_intentions where user_id=u and id=bound_intention and status in ('active','paused')) then raise exception 'Confirm this record through its existing shared step'; end if;
   if r.settled_at is not null or exists(select 1 from public.garden_grants where user_id=u and action_key=private.garden_pond_action_key(u,canonical))
    or (bound_intention is not null and bound_intention<>i.id and exists(select 1 from public.garden_life_intentions where user_id=u and id=bound_intention and status in ('granted','acknowledged_without_grant'))) then
    update public.garden_life_intentions set status='acknowledged_without_grant',settled_at=now() where user_id=u and id=i.id and version=i.version;
    if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
   else
    select count(*) filter(where issued_at>now()-interval '24 hours'),count(*) into count_day,count_week from public.garden_grants where user_id=u and issued_at>now()-interval '168 hours';
    if count_day>=2 or count_week>=6 then
     update public.garden_life_intentions set status='acknowledged_without_grant',settled_at=now() where user_id=u and id=i.id and version=i.version;
    if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
    else
     insert into public.garden_grants(user_id,intention_id,canonical_key,source_kind,evidence_kind) values(u,i.id,canonical,evidence.source_kind,r.evidence_kind) returning * into g;
     update public.garden_life_intentions set status='granted',settled_at=now() where user_id=u and id=i.id and version=i.version;
    if not found then raise exception 'This step changed. Review its current details before continuing'; end if;
     insert into public.garden_world_events(user_id,kind,fact_key) values(u,'opportunity',g.id::text) on conflict do nothing;
    end if;
   end if;
   update public.garden_source_receipts set settled_at=coalesce(settled_at,now()) where user_id=u and canonical_key=canonical;
   insert into public.garden_evidence_links(user_id,intention_id,source_kind,source_id,occurrence,canonical_key,is_primary,linked_at,zone_at_link)
    values(u,i.id,evidence.source_kind,case when evidence.source_kind='rest' then i.id else evidence.source_id end,evidence.occurrence,canonical,p_command->>'link_id' is null,evidence.selected_at,evidence.zone_at_selection) on conflict do nothing;
  end if;
 elsif k in ('move','build') then
  if jsonb_typeof(p_command->'rotation') is distinct from 'number' or p_command->>'rotation' !~ '^[0-3]$' then raise exception 'Invalid rotation'; end if;
  rotation:=(p_command->>'rotation')::int;
  if p_command->>'slot' is not null and (jsonb_typeof(p_command->'slot')<>'number' or p_command->>'slot' !~ '^([0-9]|1[01])$') then raise exception 'Invalid pond position'; end if;
  slot:=(p_command->>'slot')::int;
  v_object_id:=p_command->>'object_id';
  if k='build' then
   recipe:=p_command->>'recipe';
   if recipe is null or recipe not in ('reed','leaf','stone','perch') or slot is null then raise exception 'Choose a pond recipe and position'; end if;
   select * into g from public.garden_grants where user_id=u and id=(p_command->>'grant_id')::uuid;
   if not found then raise exception 'Construction opportunity is unavailable'; end if;
   if g.consumed_by is not null then raise exception 'This opportunity already built an object'; end if;
   if jsonb_array_length(s->'objects')>=2000 then raise exception 'Keep this opportunity for a later world expansion'; end if;
   v_object_id:=gen_random_uuid()::text;
  elsif not exists(select 1 from jsonb_array_elements(s->'objects') x where x->>'id'=v_object_id) then raise exception 'Object is not owned'; end if;
  if slot is not null and exists(select 1 from jsonb_array_elements(s->'objects') x where (x->>'slot')::int=slot and x->>'id'<>v_object_id) then raise exception 'This position is occupied'; end if;
  if k='build' then
   objects:=(s->'objects')||jsonb_build_array(jsonb_build_object('id',v_object_id,'kind',recipe,'slot',slot,'rotation',rotation,'grant_id',g.id));
   update public.garden_grants set consumed_by=v_object_id where user_id=u and garden_grants.id=g.id;
  else
   select jsonb_agg(case when x->>'id'=v_object_id then x||jsonb_build_object('slot',slot,'rotation',rotation) else x end order by ord) into objects from jsonb_array_elements(s->'objects') with ordinality a(x,ord);
  end if;
  s:=jsonb_set(s,'{objects}',objects);
 elsif k='observe' then
  species:=p_command->>'species'; habitat:=private.garden_pond_habitat(s);
  if species is null or species not in ('dawnfish','leafsnail','dragonfly') or not coalesce((habitat->>species)::boolean,false) then raise exception 'This habitat does not yet support that observation'; end if;
  -- Routing is verified by the server helper added below, never by a client success flag.
  if species='dawnfish' and not private.garden_pond_route_valid(s,p_command->'anchors') then raise exception 'Guide three ripples through a connected route with a bend'; end if;
  if not (s->'discoveries') ? species then
   s:=jsonb_set(s,'{discoveries}',(s->'discoveries')||to_jsonb(species));
   insert into public.garden_world_events(user_id,kind,fact_key) values(u,'discovery',species) on conflict do nothing;
  end if;
  select string_agg(coalesce(x->>'kind','water')||case when x->>'kind'='stone' then ':'||(x->>'rotation') when x->>'kind' is not null then ':0' else '' end,'|' order by position) into layout_key
   from generate_series(0,11) position left join lateral (select value x from jsonb_array_elements(s->'objects') where (value->>'slot')::int=position) obj on true;
  if not (s->'observed_layouts') ? layout_key and jsonb_array_length(s->'observed_layouts')<64 then s:=jsonb_set(s,'{observed_layouts}',(s->'observed_layouts')||to_jsonb(layout_key)); end if;
  if species='dawnfish' and s->>'fish_ready_at' is null then s:=jsonb_set(s,'{fish_ready_at}',to_jsonb(now()+interval '8 hours')); end if;
 elsif k='grow' then
  if s->>'fish_ready_at' is null or (s->>'fish_ready_at')::timestamptz>now() then raise exception 'Your fish are still growing'; end if;
  s:=jsonb_set(s,'{fish_adult}','true'::jsonb);
  insert into public.garden_world_events(user_id,kind,fact_key) values(u,'growth','starter-fish') on conflict do nothing;
 elsif k='seen' then
  update public.garden_world_events set seen_at=coalesce(seen_at,now()) where user_id=u and id=(p_command->>'event_id')::uuid;
 else raise exception 'Unknown pond command'; end if;
 if changed then update public.garden_worlds set state=s,revision=revision+1 where user_id=u; end if;
 result:=jsonb_build_object('status','ok','save',private.garden_pond_snapshot(u));
 insert into public.garden_pond_commands(user_id,command_id,request,request_hash,result) values(u,p_command_id,p_command,sha256(convert_to(p_command::text,'UTF8')),jsonb_build_object('status','ok','applied_revision',(result#>>'{save,world,revision}')::bigint));
 return result;
end $$;

-- Exact shortest paths across free water. Disconnected anchors or straight/repeated clicks do not qualify.
create function private.garden_pond_route(p_state jsonb,p_anchors jsonb) returns integer[]
language plpgsql immutable set search_path='' as $$
declare blocked int[]; anchors int[]; leg int; start_at int; target int; at int; n int; q int[]; visited int[]; previous int[]; route int[]:='{}'; segment int[]; direction int; preferred int; ordered_neighbours int[];
begin
 if p_anchors is null or jsonb_typeof(p_anchors)<>'array' or jsonb_array_length(p_anchors)<>3 then return null; end if;
 if exists(select 1 from jsonb_array_elements(p_anchors) a where jsonb_typeof(a)<>'number' or a::text !~ '^([0-9]|1[01])$') then return null; end if;
 select array_agg(a::int order by ord) into anchors from jsonb_array_elements_text(p_anchors) with ordinality x(a,ord);
 if (select count(distinct a) from unnest(anchors) a)<>3 then return null; end if;
 select coalesce(array_agg((o->>'slot')::int),'{}'::int[]) into blocked from jsonb_array_elements(p_state->'objects') o where o->>'slot' is not null;
 if anchors && blocked then return null; end if;
 for leg in 1..2 loop
  start_at:=anchors[leg];target:=anchors[leg+1];q:=array[start_at];visited:=array[start_at];previous:=array_fill(-1,array[12]);
  while cardinality(q)>0 loop
   at:=q[1];q:=q[2:];exit when at=target;
   select (o->>'rotation')::int into direction from jsonb_array_elements(p_state->'objects') with ordinality item(o,ord)
    where o->>'kind'='stone' and (o->>'slot')::int=any(private.garden_pond_neighbours(at)) order by ord limit 1;
   preferred:=case direction when 0 then at-4 when 1 then at+1 when 2 then at+4 when 3 then at-1 else -1 end;
   select array_agg(v order by (v=preferred) desc,ord) into ordered_neighbours from unnest(private.garden_pond_neighbours(at)) with ordinality item(v,ord);
   foreach n in array ordered_neighbours loop
    if not n=any(blocked) and not n=any(visited) then visited:=array_append(visited,n);previous[n+1]:=at;q:=array_append(q,n);end if;
   end loop;
  end loop;
  if not target=any(visited) then return null; end if;
  segment:=array[target];at:=target;
  while at<>start_at loop at:=previous[at+1];segment:=array_prepend(at,segment);end loop;
  route:=route||case when leg=1 then segment else segment[2:] end;
 end loop;
 return route;
end $$;
create function private.garden_pond_route_valid(p_state jsonb,p_anchors jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare route int[]:=private.garden_pond_route(p_state,p_anchors); j int;
begin
 if route is null then return false; end if;
 for j in 3..cardinality(route) loop
  if route[j]-route[j-1]<>route[j-1]-route[j-2] and route[j]<>route[j-2] then return true; end if;
 end loop;
 return false;
end $$;
revoke all on function private.garden_pond_route(jsonb,jsonb), private.garden_pond_route_valid(jsonb,jsonb) from public,anon,authenticated;
revoke all on function private.garden_pond_command(uuid,bigint,jsonb) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.garden_pond_command(uuid,bigint,jsonb) to authenticated;
create function public.garden_pond_command(p_command_id uuid,p_revision bigint,p_command jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.garden_pond_command(p_command_id,p_revision,p_command) $$;
revoke all on function public.garden_pond_command(uuid,bigint,jsonb) from public,anon;
grant execute on function public.garden_pond_command(uuid,bigint,jsonb) to authenticated;

-- A completion saved before choosing a step is eligible only in the same Garden day.
-- This read cannot backfill events, trust client dates, or expose an unconnected module.
create function private.garden_pond_task_choices(p_account uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); w public.garden_worlds%rowtype; zone text; day_start timestamptz; result jsonb;
begin
 if u is null then raise exception 'Sign in to choose a life step'; end if;
 if p_account is distinct from u then raise exception 'Garden account changed'; end if;
 select * into w from public.garden_worlds where user_id=u;
 if not found or not 'task'=any(w.connected_modules) then return '[]'::jsonb; end if;
 zone:=case when w.window_ends_at<=now() then coalesce(w.pending_timezone,w.timezone) else w.timezone end;
 day_start:=((((now() at time zone zone)-interval '4 hours')::date)::timestamp+interval '4 hours') at time zone zone;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'status',t.status,'project_id',t.project_id,'recorded_today',t.recorded_today)
   order by t.recorded_today desc,t.order_at desc,t.id),'[]'::jsonb) into result
 from (
  select task.id,task.title,task.status,task.project_id,task.status='done' as recorded_today,
   case when task.status='done' then receipt.first_observed_at else task.created_at end as order_at
  from public.tasks task
  left join public.garden_source_receipts receipt on receipt.user_id=u and receipt.canonical_key='task:'||task.id::text
   and receipt.source_kind='task' and receipt.source_id=task.id
  where task.user_id=u and (
   task.status in ('todo','in-progress') or (task.status='done' and
    receipt.evidence_kind='saved_record' and not receipt.corrected and not receipt.source_deleted
    and receipt.settled_at is null and receipt.first_observed_at>=day_start and receipt.first_observed_at<=now()
    and not exists(select 1 from public.garden_grants g where g.user_id=u and g.action_key=private.garden_pond_action_key(u,receipt.canonical_key))
    and not exists(select 1 from public.garden_evidence_links l join public.garden_life_intentions i on i.user_id=l.user_id and i.id=l.intention_id where l.user_id=u and l.action_key=private.garden_pond_action_key(u,receipt.canonical_key) and i.status in ('granted','acknowledged_without_grant'))
   )
  )
  order by recorded_today desc,order_at desc,task.id limit 25
 ) t;
 return result;
end $$;
revoke all on function private.garden_pond_task_choices(uuid) from public,anon;
grant execute on function private.garden_pond_task_choices(uuid) to authenticated;
create function public.garden_pond_task_choices(p_account uuid) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.garden_pond_task_choices(p_account) $$;
revoke all on function public.garden_pond_task_choices(uuid) from public,anon;
grant execute on function public.garden_pond_task_choices(uuid) to authenticated;
