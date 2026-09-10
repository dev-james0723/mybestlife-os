-- Ordered after the repository's current latest migration (20271024090000).
-- Dedicated, owned project relationships: do not overload polymorphic brain edges.
begin;

create table public.project_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_id uuid not null references public.projects(id) on delete cascade,
  target_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('related', 'depends-on', 'blocks', 'parent-child')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint project_connections_no_self check (source_id <> target_id),
  constraint project_connections_unique unique (user_id, source_id, target_id, kind)
);
create index project_connections_target on public.project_connections(user_id, target_id);
create index project_connections_source on public.project_connections(user_id, source_id);
alter table public.project_connections enable row level security;
revoke all on public.project_connections from anon;
grant select, insert, update, delete on public.project_connections to authenticated;
create policy project_connections_select on public.project_connections for select to authenticated using (user_id = auth.uid());
create policy project_connections_insert on public.project_connections for insert to authenticated with check (user_id = auth.uid());
create policy project_connections_update on public.project_connections for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy project_connections_delete on public.project_connections for delete to authenticated using (user_id = auth.uid());

create function public.validate_project_connection() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  swap_id uuid;
  old_id uuid;
  precedence_from uuid;
  precedence_to uuid;
  cycle_found boolean;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'PROJECT_CONNECTION_ACCESS' using errcode = '42501';
  end if;
  -- Serialize this owner's writes, including writes made outside the app UI.
  perform pg_advisory_xact_lock(hashtextextended('project_connections:' || new.user_id::text, 0));
  if tg_op = 'UPDATE' then
    old_id := old.id;
    if new.id is distinct from old.id or new.user_id is distinct from old.user_id then
      raise exception 'PROJECT_CONNECTION_IDENTITY' using errcode = '42501';
    end if;
    new.created_at := old.created_at;
    new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  else
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
  end if;
  if new.source_id = new.target_id then
    raise exception 'PROJECT_CONNECTION_SELF' using errcode = '23514';
  end if;
  if new.kind not in ('related', 'depends-on', 'blocks', 'parent-child') then
    raise exception 'PROJECT_CONNECTION_KIND' using errcode = '23514';
  end if;
  if not exists (select 1 from public.projects where id = new.source_id and user_id = new.user_id)
     or not exists (select 1 from public.projects where id = new.target_id and user_id = new.user_id) then
    raise exception 'PROJECT_CONNECTION_ENDPOINT_ACCESS' using errcode = '42501';
  end if;
  if new.kind = 'related' then
    if new.source_id > new.target_id then
      swap_id := new.source_id; new.source_id := new.target_id; new.target_id := swap_id;
    end if;
    return new;
  end if;
  -- A depends on B means B precedes A; A blocks B means A precedes B.
  precedence_from := case when new.kind = 'depends-on' then new.target_id else new.source_id end;
  precedence_to := case when new.kind = 'depends-on' then new.source_id else new.target_id end;
  with recursive arcs(a, b) as (
    select case when kind = 'depends-on' then target_id else source_id end,
           case when kind = 'depends-on' then source_id else target_id end
    from public.project_connections
    where user_id = new.user_id and id is distinct from old_id
      and (case when new.kind = 'parent-child' then kind = 'parent-child' else kind in ('depends-on', 'blocks') end)
  ), reachable(id) as (
    select precedence_to
    union
    select arcs.b from arcs join reachable on arcs.a = reachable.id
  ) select exists(select 1 from reachable where id = precedence_from) into cycle_found;
  if cycle_found then
    raise exception 'PROJECT_CONNECTION_CYCLE' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_project_connection() from public;
create trigger validate_project_connection before insert or update on public.project_connections
for each row execute function public.validate_project_connection();

comment on table public.project_connections is 'Explicit project relationships. Related links are canonical/symmetric; other links preserve source-to-target meaning. Endpoint deletion cascades only the connections.';
comment on column public.project_connections.kind is 'depends-on: target is prerequisite for source; blocks: source currently prevents target; parent-child: source contains target; related: no required order.';
notify pgrst, 'reload schema';
commit;
