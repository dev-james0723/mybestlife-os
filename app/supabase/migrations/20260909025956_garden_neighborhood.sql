-- Candidate: virtual Garden tokens, permanent land and revocable, authenticated visits.
-- No real-money payment, no direct balance writes, no broad cross-account source policy.
create schema if not exists garden_private;
grant usage on schema garden_private to authenticated;

create table public.garden_neighborhoods (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0,
 balance integer not null default 120 check(balance>=0),
 plots text[] not null default '{}',
 items jsonb not null default '[]',
 residents text[] not null default '{jun}',
 avatar jsonb not null default '{"name":"Gardener","palette":"sage"}',
 created_at timestamptz not null default now(),
 check(cardinality(plots)<=4), check(jsonb_array_length(items)<=96)
);
create table public.garden_neighborhood_ledger (
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_key text not null, amount integer not null, reason text not null,
 created_at timestamptz not null default now(), primary key(user_id,entry_key)
);
create table public.garden_neighborhood_commands (
 user_id uuid not null references auth.users(id) on delete cascade,
 command_id uuid not null, request_hash text not null, result jsonb not null,
 created_at timestamptz not null default now(), primary key(user_id,command_id)
);
create table public.garden_visit_invites (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 code_hash text not null unique, expires_at timestamptz not null,
 max_uses integer not null check(max_uses between 1 and 10), uses integer not null default 0,
 allow_avatar boolean not null default false, shares jsonb not null default '[]',
 revoked boolean not null default false, created_at timestamptz not null default now(),
 check(jsonb_array_length(shares)<=12)
);
create index garden_invites_owner on public.garden_visit_invites(owner_id,created_at);
create table public.garden_visit_sessions (
 id uuid primary key default gen_random_uuid(), invite_id uuid not null references public.garden_visit_invites(id) on delete cascade,
 guest_id uuid not null references auth.users(id) on delete cascade,
 show_avatar boolean not null default false, kicked boolean not null default false,
 last_seen timestamptz not null default now(), wave_at timestamptz,
 unique(invite_id,guest_id)
);
create index garden_visits_guest on public.garden_visit_sessions(guest_id);
create table public.garden_visit_attempts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null default now(), failures integer not null default 0
);
do $$ declare t text; begin
 foreach t in array array['garden_neighborhoods','garden_neighborhood_ledger','garden_neighborhood_commands','garden_visit_invites','garden_visit_sessions','garden_visit_attempts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
grant select on public.garden_neighborhoods,public.garden_neighborhood_ledger to authenticated;
create policy owner_read on public.garden_neighborhoods for select to authenticated using((select auth.uid())=user_id);
create policy owner_read on public.garden_neighborhood_ledger for select to authenticated using((select auth.uid())=user_id);

create function garden_private.neighborhood_estate(u uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'revision',revision,'balance',balance,'plots',to_jsonb(plots),'items',items,'residents',to_jsonb(residents),'avatar',avatar)
 from public.garden_neighborhoods where user_id=u
$$;
create function garden_private.neighborhood_visitors(u uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(v),'[]') from (
  select jsonb_build_object('session_id',s.id,'avatar',n.avatar,'last_seen',s.last_seen,'wave_at',s.wave_at) v
  from public.garden_visit_sessions s join public.garden_visit_invites i on i.id=s.invite_id
   join public.garden_neighborhoods n on n.user_id=s.guest_id
  where i.owner_id=u and i.allow_avatar and s.show_avatar and not i.revoked and not s.kicked
   and i.expires_at>now() and s.last_seen>now()-interval '60 seconds'
  order by s.last_seen desc limit 3
 ) visible
$$;
create function garden_private.neighborhood_snapshot(u uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('estate',garden_private.neighborhood_estate(u),'visitors',garden_private.neighborhood_visitors(u),
 'invites',coalesce((select jsonb_agg(jsonb_build_object('id',id,'expires_at',expires_at,'uses',uses,'max_uses',max_uses,'revoked',revoked,'allow_avatar',allow_avatar,'shared_count',jsonb_array_length(shares)) order by created_at desc)
  from public.garden_visit_invites where owner_id=u and created_at>now()-interval '7 days'),'[]'),
 'ledger',coalesce((select jsonb_agg(v) from (select jsonb_build_object('amount',amount,'reason',reason,'created_at',created_at) v from public.garden_neighborhood_ledger where user_id=u order by created_at desc limit 20) l),'[]'))
$$;
create function garden_private.neighborhood_initialize(u uuid) returns void
language plpgsql security definer set search_path='' as $$
declare credit integer; r record; start_at timestamptz;
begin
 insert into public.garden_neighborhoods(user_id) values(u) on conflict do nothing;
 select created_at into start_at from public.garden_neighborhoods where user_id=u for update;
 insert into public.garden_neighborhood_ledger values(u,'welcome',120,'welcome',now()) on conflict do nothing;
 -- Both sources were validated by the existing server-owned Garden rules. No client events mint tokens.
 if to_regclass('public.garden_grants') is not null then
  for r in execute 'select id::text as key from public.garden_grants where user_id=$1 and issued_at >= $2 - interval ''24 hours''' using u,start_at loop
   insert into public.garden_neighborhood_ledger(user_id,entry_key,amount,reason) values(u,'life:'||r.key,20,'life_step') on conflict do nothing;
   get diagnostics credit=row_count;
   if credit=1 then update public.garden_neighborhoods set balance=balance+20,revision=revision+1 where user_id=u; end if;
  end loop;
 end if;
 for r in select day::text as key from public.garden_adventure_events where user_id=u and action='deliver' and created_at>=start_at-interval '24 hours' loop
  insert into public.garden_neighborhood_ledger(user_id,entry_key,amount,reason) values(u,'expedition:'||r.key,5,'expedition') on conflict do nothing;
  get diagnostics credit=row_count;
  if credit=1 then update public.garden_neighborhoods set balance=balance+5,revision=revision+1 where user_id=u; end if;
 end loop;
end $$;

-- Share only explicit, currently owned records. Source text is not copied into invite/session storage.
create function garden_private.neighborhood_share_cards(u uuid,selections jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb:='[]'; choice jsonb; r jsonb; table_name text; progress integer; source uuid;
begin
 for choice in select value from jsonb_array_elements(selections) loop
  source:=(choice->>'id')::uuid;
  table_name:=case choice->>'kind' when 'goal' then 'goals' when 'project' then 'projects' when 'role_model' then 'role_models' end;
  if table_name is null then continue; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 and user_id=$2',table_name) into r using source,u;
  if r is null then continue; end if;
  progress:=null;
  if choice->>'kind'='project' and coalesce((choice->>'show_progress')::boolean,false) then
   select case when count(*)=0 then null else round(100.0*count(*) filter(where status='done')/count(*))::integer end into progress
    from public.tasks where user_id=u and project_id=source;
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('kind',choice->>'kind','id',source,'title',left(r->>'name',180),
   'status',case when coalesce((choice->>'show_status')::boolean,false) then r->>'status' else null end,'progress',progress));
 end loop;
 return result;
end $$;

create function garden_private.neighborhood_dispatch(p_action text,p_command uuid,p_value jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); n public.garden_neighborhoods; prior public.garden_neighborhood_commands;
 request_hash text; target text; cost integer; required integer; result jsonb:='{}'; item jsonb; v_items jsonb; matched_item boolean:=false;
 invite public.garden_visit_invites; selection jsonb; selections jsonb; code text; new_id uuid;
begin
 if u is null then raise exception 'Sign in to your Garden'; end if;
 if p_value is null or jsonb_typeof(p_value)<>'object' or octet_length(p_value::text)>12000 then raise exception 'Invalid request'; end if;
 perform garden_private.neighborhood_initialize(u);
 if p_action='read' then return garden_private.neighborhood_snapshot(u); end if;
 if p_action='choices' then
  selections:='[]';
  for selection in select jsonb_build_object('kind','goal','id',id,'show_status',true) from public.goals where user_id=u order by updated_at desc limit 80 loop selections:=selections||jsonb_build_array(selection); end loop;
  for selection in select jsonb_build_object('kind','project','id',id,'show_status',true,'show_progress',true) from public.projects where user_id=u order by updated_at desc limit 80 loop selections:=selections||jsonb_build_array(selection); end loop;
  for selection in select jsonb_build_object('kind','role_model','id',id) from public.role_models where user_id=u order by updated_at desc limit 80 loop selections:=selections||jsonb_build_array(selection); end loop;
  return garden_private.neighborhood_share_cards(u,selections);
 end if;
 if p_command is null then raise exception 'A command ID is required'; end if;
 request_hash:=encode(sha256(convert_to(jsonb_build_object('action',p_action,'value',p_value)::text,'UTF8')),'hex');
 select * into prior from public.garden_neighborhood_commands where user_id=u and command_id=p_command;
 if found then
  if prior.request_hash<>request_hash then raise exception 'This command ID was already used'; end if;
  return jsonb_build_object('save',garden_private.neighborhood_snapshot(u),'result',prior.result);
 end if;
 select * into n from public.garden_neighborhoods where user_id=u for update;
 if p_action in ('buy_land','buy_item','place','resident','avatar') and (p_value->>'revision')::bigint is distinct from n.revision then
  raise exception 'Your garden changed. Refresh, then try again.';
 end if;
 target:=p_value->>'target';
 if p_action='buy_land' then
  cost:=case target when 'terrace' then 60 when 'meadow' then 180 when 'orchard' then 420 when 'retreat' then 900 end;
  required:=case target when 'terrace' then 0 when 'meadow' then 1 when 'orchard' then 2 when 'retreat' then 3 end;
  if cost is null or target=any(n.plots) or cardinality(n.plots)<required then raise exception 'This land is not available'; end if;
  if n.balance<cost then raise exception 'Not enough Garden tokens'; end if;
  update public.garden_neighborhoods set plots=array_append(plots,target),balance=balance-cost,revision=revision+1 where user_id=u;
 elsif p_action='buy_item' then
  cost:=case target when 'flowerbed' then 20 when 'lantern' then 25 when 'bench' then 30 when 'birdbath' then 40 when 'tree' then 45 when 'pergola' then 60 end;
  if cost is null then raise exception 'Unknown item'; end if;
  if jsonb_array_length(n.items)>=96 then raise exception 'Your storage is full'; end if;
  if n.balance<cost then raise exception 'Not enough Garden tokens'; end if;
  new_id:=gen_random_uuid(); result:=jsonb_build_object('item_id',new_id);
  update public.garden_neighborhoods set items=items||jsonb_build_array(jsonb_build_object('id',new_id,'kind',target,'plot',null,'slot',null,'rotation',0)),balance=balance-cost,revision=revision+1 where user_id=u;
 elsif p_action='place' then
  if p_value->>'plot' is not null then
   if not (p_value->>'plot'=any(n.plots)) or (p_value->>'slot')::int not between 0 and 15 or (p_value->>'slot') is null then raise exception 'Choose an owned plot and an empty space'; end if;
   if exists(select 1 from jsonb_array_elements(n.items) v where v->>'id'<>target and v->>'plot'=p_value->>'plot' and v->>'slot'=p_value->>'slot') then raise exception 'That space is already occupied'; end if;
  end if;
  if (p_value->>'rotation')::int not between 0 and 3 or p_value->>'rotation' is null then raise exception 'Invalid rotation'; end if;
  v_items:='[]';
  for item in select value from jsonb_array_elements(n.items) loop
   if item->>'id'=target then
    matched_item:=true; item:=item||jsonb_build_object('plot',p_value->>'plot','slot',case when p_value->>'plot' is null then null else (p_value->>'slot')::int end,'rotation',(p_value->>'rotation')::int);
   end if;
   v_items:=v_items||jsonb_build_array(item);
  end loop;
  if not matched_item then raise exception 'Item not found'; end if;
  update public.garden_neighborhoods set items=v_items,revision=revision+1 where user_id=u;
 elsif p_action='resident' then
  cost:=case target when 'jun' then 0 when 'hana' then 80 when 'bo' then 120 end;
  if cost is null or target=any(n.residents) then raise exception 'Resident is already here or unavailable'; end if;
  if n.balance<cost then raise exception 'Not enough Garden tokens'; end if;
  update public.garden_neighborhoods set residents=array_append(residents,target),balance=balance-cost,revision=revision+1 where user_id=u;
 elsif p_action='avatar' then
  if length(btrim(p_value->>'name')) not between 1 and 40 or p_value->>'name' is null or not(p_value->>'palette'=any(array['sage','clay','indigo','rose'])) or p_value->>'palette' is null then raise exception 'Choose a name and colour'; end if;
  update public.garden_neighborhoods set avatar=jsonb_build_object('name',btrim(p_value->>'name'),'palette',p_value->>'palette'),revision=revision+1 where user_id=u;
 elsif p_action='invite' then
  code:=upper(regexp_replace(p_value->>'code','[[:space:]-]','','g'));
  if code is null or code !~ '^[0-9A-F]{20}$' then raise exception 'Invalid invitation code'; end if;
  if not coalesce((p_value->>'hours')::int=any(array[1,6,24]),false) or not coalesce((p_value->>'max_uses')::int=any(array[1,5,10]),false) then raise exception 'Choose invitation limits'; end if;
  if (select count(*) from public.garden_visit_invites where owner_id=u and created_at>now()-interval '24 hours')>=10 then raise exception 'Invitation limit reached. Try tomorrow.'; end if;
  selections:=coalesce(p_value->'shares','[]');
  if jsonb_typeof(selections)<>'array' or jsonb_array_length(selections)>12 then raise exception 'Choose up to twelve records'; end if;
  for selection in select value from jsonb_array_elements(selections) loop
   if selection - array['kind','id','show_status','show_progress'] <> '{}'::jsonb then raise exception 'Unknown shared fields'; end if;
   if not coalesce(selection->>'kind'=any(array['goal','project','role_model']),false) or jsonb_array_length(garden_private.neighborhood_share_cards(u,jsonb_build_array(selection)))<>1 then raise exception 'Shared record is unavailable'; end if;
  end loop;
  insert into public.garden_visit_invites(owner_id,code_hash,expires_at,max_uses,allow_avatar,shares)
   values(u,encode(sha256(convert_to(code,'UTF8')),'hex'),now()+make_interval(hours=>(p_value->>'hours')::int),(p_value->>'max_uses')::int,coalesce((p_value->>'allow_avatar')::boolean,false),selections) returning id into new_id;
  result:=jsonb_build_object('invite_id',new_id);
 elsif p_action='revoke' then
  update public.garden_visit_invites set revoked=true where id=target::uuid and owner_id=u;
  if not found then raise exception 'Invitation not found'; end if;
 elsif p_action='unshare' then
  update public.garden_visit_invites set shares='[]' where id=target::uuid and owner_id=u;
  if not found then raise exception 'Invitation not found'; end if;
 elsif p_action='kick' then
  update public.garden_visit_sessions s set kicked=true where s.id=target::uuid and exists(select 1 from public.garden_visit_invites i where i.id=s.invite_id and i.owner_id=u);
  if not found then raise exception 'Visitor not found'; end if;
 else raise exception 'Unknown Garden command';
 end if;
 if cost is not null then insert into public.garden_neighborhood_ledger(user_id,entry_key,amount,reason) values(u,'purchase:'||p_command::text,-cost,p_action||':'||target); end if;
 insert into public.garden_neighborhood_commands(user_id,command_id,request_hash,result) values(u,p_command,request_hash,result);
 return jsonb_build_object('save',garden_private.neighborhood_snapshot(u),'result',result);
end $$;

create function garden_private.visit_dispatch(p_action text,p_value jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); i public.garden_visit_invites; s public.garden_visit_sessions; a public.garden_visit_attempts; code text; plant jsonb; collection jsonb;
begin
 if u is null then raise exception 'Sign in to visit a Garden'; end if;
 if p_value is null or jsonb_typeof(p_value)<>'object' or octet_length(p_value::text)>1500 then raise exception 'Invalid visit request'; end if;
 if p_action='enter' then
  insert into public.garden_visit_attempts(user_id) values(u) on conflict do nothing;
  select * into a from public.garden_visit_attempts where user_id=u for update;
  if a.window_start<now()-interval '15 minutes' then update public.garden_visit_attempts set window_start=now(),failures=0 where user_id=u; a.failures:=0; end if;
  if a.failures>=5 then return jsonb_build_object('error','Too many attempts. Try again in 15 minutes.'); end if;
  code:=upper(regexp_replace(p_value->>'code','[[:space:]-]','','g'));
  select * into i from public.garden_visit_invites where code_hash=encode(sha256(convert_to(coalesce(code,''),'UTF8')),'hex') for update;
  select * into s from public.garden_visit_sessions where invite_id=i.id and guest_id=u;
  if i.id is null or i.revoked or i.expires_at<=now() or i.owner_id=u or coalesce(s.kicked,false) or (s.id is null and i.uses>=i.max_uses) then
   update public.garden_visit_attempts set failures=failures+1 where user_id=u;
   return jsonb_build_object('error','This invitation is unavailable. Ask the host for a new code.');
  end if;
  perform garden_private.neighborhood_initialize(u);
  if s.id is null then
   insert into public.garden_visit_sessions(invite_id,guest_id,show_avatar) values(i.id,u,i.allow_avatar and coalesce((p_value->>'show_avatar')::boolean,false)) returning * into s;
   update public.garden_visit_invites set uses=uses+1 where id=i.id;
  else
   update public.garden_visit_sessions set show_avatar=i.allow_avatar and coalesce((p_value->>'show_avatar')::boolean,false),last_seen=now() where id=s.id;
  end if;
 elsif p_action in ('read','wave','leave') then
  select * into s from public.garden_visit_sessions where id=(p_value->>'session_id')::uuid and guest_id=u for update;
  select * into i from public.garden_visit_invites where id=s.invite_id;
  if p_action='leave' then
   update public.garden_visit_sessions set show_avatar=false,last_seen='epoch' where id=s.id;
   return jsonb_build_object('left',true);
  end if;
  if s.id is null or i.revoked or s.kicked or i.expires_at<=now() then return jsonb_build_object('error','This visit has ended.'); end if;
  if p_action='wave' and s.show_avatar and (s.wave_at is null or s.wave_at<now()-interval '30 seconds') then update public.garden_visit_sessions set wave_at=now() where id=s.id; end if;
 else raise exception 'Unknown visit command';
 end if;
 update public.garden_visit_sessions set last_seen=now() where id=s.id;
 select jsonb_build_object('plant',plant_type,'stage',growth_stage) into plant from public.user_garden where user_id=i.owner_id limit 1;
 select coalesce(jsonb_agg(plant_type),'[]') into collection from (select plant_type from public.plant_collection where user_id=i.owner_id order by harvested_at desc limit 30) c;
 return jsonb_build_object('session_id',s.id,'expires_at',i.expires_at,'owner_avatar',(garden_private.neighborhood_estate(i.owner_id))->'avatar',
  'estate',garden_private.neighborhood_estate(i.owner_id)-'balance'-'revision','visitors',garden_private.neighborhood_visitors(i.owner_id),
  'cards',garden_private.neighborhood_share_cards(i.owner_id,i.shares),'collection',collection,'plant',coalesce(plant->>'plant','sunflower'),'stage',coalesce((plant->>'stage')::int,1));
end $$;

revoke all on function garden_private.neighborhood_estate(uuid),garden_private.neighborhood_visitors(uuid),garden_private.neighborhood_snapshot(uuid),garden_private.neighborhood_initialize(uuid),garden_private.neighborhood_share_cards(uuid,jsonb),garden_private.neighborhood_dispatch(text,uuid,jsonb),garden_private.visit_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function garden_private.neighborhood_dispatch(text,uuid,jsonb),garden_private.visit_dispatch(text,jsonb) to authenticated;
create function public.garden_neighborhood(p_action text,p_command uuid default null,p_value jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select garden_private.neighborhood_dispatch(p_action,p_command,p_value) $$;
create function public.garden_visit(p_action text,p_value jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select garden_private.visit_dispatch(p_action,p_value) $$;
revoke all on function public.garden_neighborhood(text,uuid,jsonb),public.garden_visit(text,jsonb) from public,anon;
grant execute on function public.garden_neighborhood(text,uuid,jsonb),public.garden_visit(text,jsonb) to authenticated;
