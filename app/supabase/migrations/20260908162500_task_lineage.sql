-- Candidate: explicit Task derivation. Opaque identities survive source deletion.
-- This does not infer relationships from titles or copy private content into history.
create schema if not exists private;
create table public.task_lineage (
 task_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 outcome_id uuid not null,
 parent_task_id uuid,
 relation text not null check(relation in ('original','split','copy','recreate','next_step')),
 created_at timestamptz not null default now()
);
create index task_lineage_outcome on public.task_lineage(user_id,outcome_id);
alter table public.task_lineage enable row level security;
revoke all on public.task_lineage from anon,authenticated;
grant select on public.task_lineage to authenticated;
create policy owner_read on public.task_lineage for select to authenticated using((select auth.uid())=user_id);

create table private.task_derivation_commands (
 user_id uuid not null references auth.users(id) on delete cascade,
 command_id uuid not null,
 request_hash bytea not null,
 task_ids uuid[] not null,
 created_at timestamptz not null default now(),
 primary key(user_id,command_id)
);
revoke all on private.task_derivation_commands from public,anon,authenticated;

create function private.task_register_lineage() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.id is distinct from old.id or new.user_id is distinct from old.user_id) then
  raise exception 'Task identity cannot change';
 end if;
 insert into public.task_lineage(task_id,user_id,outcome_id,relation)
  values(new.id,new.user_id,new.id,'original') on conflict(task_id) do nothing;
 if not exists(select 1 from public.task_lineage where task_id=new.id and user_id=new.user_id) then
  raise exception 'Task identity belongs to another account';
 end if;
 return new;
end $$;
revoke all on function private.task_register_lineage() from public,anon,authenticated;
create trigger task_register_lineage before insert or update of id,user_id on public.tasks
 for each row execute function private.task_register_lineage();
insert into public.task_lineage(task_id,user_id,outcome_id,relation)
 select id,user_id,id,'original' from public.tasks;

create function public.task_derive(p_account uuid,p_command_id uuid,p_source_id uuid,p_relation text,p_titles jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); source public.task_lineage%rowtype; previous private.task_derivation_commands%rowtype;
 request_hash bytea; ids uuid[]:='{}'; child_id uuid; label jsonb; project uuid;
begin
 if u is null or p_account is distinct from u then raise exception 'Task account changed'; end if;
 if p_command_id is null or p_source_id is null then raise exception 'Task command identity is required'; end if;
 if p_relation is null or p_relation not in ('split','copy','recreate','next_step') then raise exception 'Choose a task relationship'; end if;
 if jsonb_typeof(p_titles) is distinct from 'array' then raise exception 'Provide task titles'; end if;
 if jsonb_array_length(p_titles) not between 1 and 5 or (p_relation='split' and jsonb_array_length(p_titles)<2)
  or (p_relation<>'split' and jsonb_array_length(p_titles)<>1) then raise exception 'Use two to five parts, or one related task'; end if;
 if exists(select 1 from jsonb_array_elements(p_titles) t where jsonb_typeof(t)<>'string' or length(btrim(t#>>'{}')) not between 1 and 180) then
  raise exception 'Each title must contain 1 to 180 characters';
 end if;
 request_hash:=sha256(convert_to(jsonb_build_object('source',p_source_id,'relation',p_relation,'titles',p_titles)::text,'UTF8'));
 -- Serialize only derivations for this account; never acquire the Garden world lock.
 perform pg_advisory_xact_lock(hashtextextended('task-derive:'||u::text,0));
 select * into previous from private.task_derivation_commands where user_id=u and command_id=p_command_id;
 if found then
  if previous.request_hash<>request_hash then raise exception 'Task command identity was already used'; end if;
  return jsonb_build_object('task_ids',previous.task_ids,'replayed',true);
 end if;
 select * into source from public.task_lineage where task_id=p_source_id and user_id=u;
 if not found then raise exception 'Original task is unavailable'; end if;
 select project_id into project from public.tasks where id=p_source_id and user_id=u for key share;
 if not found and p_relation<>'recreate' then raise exception 'Original task was deleted; choose recreate to preserve its outcome'; end if;
 for label in select value from jsonb_array_elements(p_titles) loop
  child_id:=gen_random_uuid();
  insert into public.task_lineage(task_id,user_id,outcome_id,parent_task_id,relation)
   values(child_id,u,case when p_relation='next_step' then child_id else source.outcome_id end,p_source_id,p_relation);
  insert into public.tasks(id,user_id,title,status,project_id) values(child_id,u,btrim(label#>>'{}'),'todo',project);
  ids:=array_append(ids,child_id);
 end loop;
 insert into private.task_derivation_commands(user_id,command_id,request_hash,task_ids) values(u,p_command_id,request_hash,ids);
 return jsonb_build_object('task_ids',ids,'replayed',false);
end $$;
revoke all on function public.task_derive(uuid,uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.task_derive(uuid,uuid,uuid,text,jsonb) to authenticated;
