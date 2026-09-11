-- Private, durable Council rooms. Apply to a development/preview database first.
create table public.mind_council_rooms (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  advisor_ids text[] not null check (cardinality(advisor_ids) between 2 and 4),
  advisors jsonb not null check (jsonb_typeof(advisors) = 'array' and jsonb_array_length(advisors) between 2 and 4),
  initial_question text not null check (char_length(initial_question) between 1 and 4000),
  scene_template text not null check (scene_template in ('sunset-library','garden-room','city-loft','coastal-retreat')),
  scene_status text not null default 'idle' check (scene_status in ('idle','generating','ready','error')),
  scene_path text,
  scene_version uuid,
  scene_model text,
  scene_error text,
  scene_token uuid,
  scene_started_at timestamptz,
  scene_attempts integer not null default 0 check (scene_attempts between 0 and 3),
  chat_token uuid,
  chat_started_at timestamptz,
  is_saved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, user_id),
  check (scene_path is null or scene_path like user_id::text || '/' || id::text || '/%')
);
create index mind_council_rooms_owner_updated on public.mind_council_rooms(user_id, updated_at desc);

create table public.mind_council_turns (
  id uuid primary key,
  room_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 4000),
  target_ids text[] not null check (cardinality(target_ids) between 1 and 4),
  exchange boolean not null default true,
  status text not null default 'running' check (status in ('running','complete','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, room_id, user_id),
  foreign key(room_id, user_id) references public.mind_council_rooms(id, user_id) on delete cascade
);
create index mind_council_turns_owner_room on public.mind_council_turns(user_id, room_id, created_at);

create table public.mind_council_messages (
  id uuid primary key,
  room_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_id uuid not null,
  kind text not null check (kind in ('user','advisor','summary')),
  advisor_id text,
  display_name text not null,
  content text not null check (char_length(content) between 1 and 16000),
  step integer not null check (step between 0 and 9),
  created_at timestamptz not null default now(),
  unique(turn_id, step),
  foreign key(turn_id, room_id, user_id) references public.mind_council_turns(id, room_id, user_id) on delete cascade,
  foreign key(room_id, user_id) references public.mind_council_rooms(id, user_id) on delete cascade
);
create index mind_council_messages_owner_room on public.mind_council_messages(user_id, room_id, created_at, step);

-- Append-only receipts: a tab refresh cannot bypass provider call limits.
create table public.mind_council_usage (
  token uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null,
  kind text not null check (kind in ('scene','turn')),
  created_at timestamptz not null default now(),
  foreign key(room_id, user_id) references public.mind_council_rooms(id, user_id) on delete cascade
);
create index mind_council_usage_owner_kind_time on public.mind_council_usage(user_id, kind, created_at);

alter table public.mind_council_rooms enable row level security;
alter table public.mind_council_turns enable row level security;
alter table public.mind_council_messages enable row level security;
alter table public.mind_council_usage enable row level security;
create policy council_rooms_owner on public.mind_council_rooms for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy council_turns_owner on public.mind_council_turns for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy council_messages_owner on public.mind_council_messages for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy council_usage_owner_select on public.mind_council_usage for select to authenticated
  using (user_id = (select auth.uid()));
create policy council_usage_owner_insert on public.mind_council_usage for insert to authenticated
  with check (user_id = (select auth.uid()));
revoke all on public.mind_council_rooms, public.mind_council_turns, public.mind_council_messages from anon, authenticated;
grant select, insert, update on public.mind_council_rooms, public.mind_council_turns, public.mind_council_messages to authenticated;
revoke all on public.mind_council_usage from anon, authenticated;
grant select, insert on public.mind_council_usage to authenticated;

-- One lease per room/operation. Transaction-scoped account lock makes quota checks atomic.
create function public.claim_mind_council_operation(p_room_id uuid, p_kind text, p_token uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  r public.mind_council_rooms%rowtype;
  used bigint;
  actor uuid := auth.uid();
begin
  if actor is null or p_kind not in ('scene','turn') then return 'invalid'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 7104));
  select * into r from public.mind_council_rooms where id = p_room_id and user_id = actor for update;
  if not found then return 'missing'; end if;
  if p_kind = 'scene' then
    if r.scene_status = 'ready' then return 'ready'; end if;
    if r.scene_token is not null and r.scene_started_at > now() - interval '6 minutes' then return 'busy'; end if;
    if r.scene_attempts >= 3 then return 'exhausted'; end if;
  elsif r.chat_token is not null and r.chat_started_at > now() - interval '6 minutes' then
    return 'busy';
  end if;
  select count(*) into used from public.mind_council_usage
    where user_id = actor and kind = p_kind and created_at > now() - interval '24 hours';
  if (p_kind = 'scene' and used >= 12) or (p_kind = 'turn' and used >= 100) then return 'limited'; end if;
  insert into public.mind_council_usage(token, user_id, room_id, kind) values(p_token, actor, p_room_id, p_kind);
  if p_kind = 'scene' then
    update public.mind_council_rooms set scene_token = p_token, scene_started_at = now(),
      scene_attempts = scene_attempts + 1, scene_status = 'generating', scene_error = null where id = p_room_id and user_id = actor;
  else
    update public.mind_council_rooms set chat_token = p_token, chat_started_at = now() where id = p_room_id and user_id = actor;
  end if;
  return 'claimed';
end;
$$;
revoke all on function public.claim_mind_council_operation(uuid,text,uuid) from public, anon;
grant execute on function public.claim_mind_council_operation(uuid,text,uuid) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('mind-council-scenes', 'mind-council-scenes', false, 8388608, array['image/webp'])
on conflict (id) do nothing;
create policy council_scene_read on storage.objects for select to authenticated
  using (bucket_id = 'mind-council-scenes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy council_scene_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'mind-council-scenes' and (storage.foldername(name))[1] = (select auth.uid())::text);
