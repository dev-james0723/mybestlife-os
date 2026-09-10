-- Candidate: foreground invitations for real pond facts. No background push infrastructure.
alter table public.garden_worlds
 add column if not exists invitations_enabled boolean not null default false,
 add column if not exists buddy_pause_until timestamptz,
 add column if not exists consecutive_dismissals integer not null default 0 check(consecutive_dismissals between 0 and 2);

-- Existing explicit consent is preserved only when both Garden and OS notifications were enabled.
update public.garden_worlds w set invitations_enabled=true
from public.garden_adventure_settings s, public.notification_preferences n
where s.user_id=w.user_id and n.user_id=w.user_id and s.reminders_enabled and n.daily_summary;

create table public.garden_invitation_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id uuid not null references public.garden_world_events(id) on delete cascade,
 reserved_at timestamptz not null default now(),
 shown_at timestamptz,
 dismissed_at timestamptz,
 accepted_at timestamptz,
 unique(user_id,event_id),
 check(dismissed_at is null or accepted_at is null)
);
create index garden_invitation_budget on public.garden_invitation_deliveries(user_id,reserved_at);
alter table public.garden_invitation_deliveries enable row level security;
revoke all on public.garden_invitation_deliveries from public,anon,authenticated;
grant select on public.garden_invitation_deliveries to authenticated;
create policy invitation_owner on public.garden_invitation_deliveries for select to authenticated using((select auth.uid())=user_id);

create function private.garden_pond_invitation(p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); w public.garden_worlds%rowtype; s public.garden_adventure_settings%rowtype;
 profile jsonb; notifications boolean; fact public.garden_world_events%rowtype; delivery public.garden_invitation_deliveries%rowtype;
 hour integer; zone text; setting boolean; dismissals integer;
begin
 if u is null or p_input->>'account' is distinct from u::text then raise exception 'Garden account changed' using errcode='42501'; end if;
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>1024 then raise exception 'Invalid invitation command'; end if;
 select * into w from public.garden_worlds where user_id=u for update;
 if not found then return jsonb_build_object('managed',false,'invitation',null,'settings',null); end if;
 select * into s from public.garden_adventure_settings where user_id=u for update;
 select to_jsonb(p) into profile from public.profiles p where id=u;
 notifications:=coalesce((select daily_summary from public.notification_preferences where user_id=u limit 1),false);
 zone:=w.timezone;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then zone:='UTC'; end if;
 if p_action='settings' then
  if jsonb_typeof(p_input->'enabled') is distinct from 'boolean' then raise exception 'Choose whether to receive garden invitations'; end if;
  setting:=(p_input->>'enabled')::boolean;
  insert into public.garden_adventure_settings(user_id,reminders_enabled) values(u,setting)
   on conflict(user_id) do update set reminders_enabled=excluded.reminders_enabled;
  update public.garden_worlds set invitations_enabled=setting,
    buddy_pause_until=case when setting then null else buddy_pause_until end,
    consecutive_dismissals=case when setting then 0 else consecutive_dismissals end
    where user_id=u returning * into w;
  select * into s from public.garden_adventure_settings where user_id=u;
 elsif p_action in ('shown','dismissed','accepted') then
  select * into delivery from public.garden_invitation_deliveries where user_id=u and id=(p_input->>'delivery_id')::uuid;
  if not found then raise exception 'Invitation is unavailable'; end if;
  if p_action='shown' then
   update public.garden_invitation_deliveries set shown_at=coalesce(shown_at,now()) where id=delivery.id;
  elsif p_action='dismissed' and delivery.dismissed_at is null and delivery.accepted_at is null then
   update public.garden_invitation_deliveries set shown_at=coalesce(shown_at,now()),dismissed_at=now() where id=delivery.id;
   dismissals:=least(2,w.consecutive_dismissals+1);
   update public.garden_worlds set consecutive_dismissals=dismissals,
    buddy_pause_until=case when dismissals>=2 then now()+interval '168 hours' else now()+interval '24 hours' end
    where user_id=u returning * into w;
  elsif p_action='accepted' and delivery.accepted_at is null and delivery.dismissed_at is null then
   update public.garden_invitation_deliveries set shown_at=coalesce(shown_at,now()),accepted_at=now() where id=delivery.id;
   update public.garden_worlds set consecutive_dismissals=0,buddy_pause_until=null where user_id=u returning * into w;
  end if;
 elsif p_action='reserve' then
  hour:=extract(hour from now() at time zone zone)::integer;
  if not w.invitations_enabled or not coalesce(s.reminders_enabled,false) or not notifications
   or not coalesce((profile->>'os_buddy_enabled')::boolean,false)
   or coalesce((profile->>'focus_mode')::boolean,false)
   or coalesce(w.buddy_pause_until>now(),false)
   or coalesce(s.last_invited_at>now()-interval '24 hours',false)
   or (case when s.quiet_start=s.quiet_end then true when s.quiet_start<s.quiet_end then hour>=s.quiet_start and hour<s.quiet_end else hour>=s.quiet_start or hour<s.quiet_end end)
   or (select count(*) from public.garden_invitation_deliveries where user_id=u and reserved_at>now()-interval '168 hours')>=3
   or exists(select 1 from public.garden_invitation_deliveries where user_id=u and reserved_at>now()-interval '24 hours')
  then return jsonb_build_object('managed',true,'invitation',null,'settings',jsonb_build_object('enabled',w.invitations_enabled,'pause_until',w.buddy_pause_until,'notifications_enabled',notifications)); end if;
  -- A mature milestone is recorded once by server time; absence cannot generate repeated growth.
  if w.state->>'fish_ready_at' is not null and (w.state->>'fish_ready_at')::timestamptz<=now() and not (w.state->>'fish_adult')::boolean then
   insert into public.garden_world_events(user_id,kind,fact_key) values(u,'growth-ready','starter-fish') on conflict do nothing;
  end if;
  select e.* into fact from public.garden_world_events e where e.user_id=u
   and not exists(select 1 from public.garden_invitation_deliveries d where d.user_id=u and d.event_id=e.id)
   and ((e.kind='growth-ready' and not (w.state->>'fish_adult')::boolean)
     or (e.kind='opportunity' and exists(select 1 from public.garden_grants g where g.user_id=u and g.id::text=e.fact_key and g.consumed_by is null)))
   order by case when e.kind='growth-ready' then 0 else 1 end,e.created_at limit 1;
  if found then
   insert into public.garden_invitation_deliveries(user_id,event_id) values(u,fact.id) returning * into delivery;
   update public.garden_adventure_settings set last_invited_at=now() where user_id=u;
   -- Reservation is deliberately not counted as a shown impression; a lost reply never shows the same fact twice.
   return jsonb_build_object('managed',true,'invitation',jsonb_build_object('id',delivery.id,'kind',fact.kind),'settings',jsonb_build_object('enabled',w.invitations_enabled,'pause_until',w.buddy_pause_until,'notifications_enabled',notifications));
  end if;
 elsif p_action<>'read' then raise exception 'Unknown invitation action';
 end if;
 return jsonb_build_object('managed',true,'invitation',null,'settings',jsonb_build_object('enabled',w.invitations_enabled,'pause_until',w.buddy_pause_until,'notifications_enabled',notifications));
end $$;
revoke all on function private.garden_pond_invitation(text,jsonb) from public,anon;
grant execute on function private.garden_pond_invitation(text,jsonb) to authenticated;
create function public.garden_pond_invitation(p_action text,p_input jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.garden_pond_invitation(p_action,p_input) $$;
revoke all on function public.garden_pond_invitation(text,jsonb) from public,anon;
grant execute on function public.garden_pond_invitation(text,jsonb) to authenticated;

-- Cached V2 clients must not bypass the V3 event policy by requesting a generic weather invitation.
-- Keep every original gameplay action intact; the old invoker receives its normal snapshot with invited=false.
create or replace function public.garden_adventure_action(p_day date,p_action text,p_value jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_action='invite' and exists(select 1 from public.garden_worlds where user_id=auth.uid()) then
  return garden_private.adventure_action(p_day,'settings',jsonb_build_object('account',p_value->>'account'));
 end if;
 return garden_private.adventure_action(p_day,p_action,p_value);
end $$;
