-- CANDIDATE. Local validation only until production migration is approved.
create table if not exists public.garden_personal_pets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  status text not null default 'uploading' check (status in ('uploading','submitting','generating','processing','ready','failed','needs_review')),
  progress integer not null default 0 check (progress between 0 and 100),
  photo_path text, model_path text, task_id text, message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'ready' or model_path is not null)
);
create index if not exists garden_personal_pets_owner on public.garden_personal_pets(user_id,created_at desc);
alter table public.garden_personal_pets enable row level security;
revoke all on public.garden_personal_pets from public,anon,authenticated;
grant select on public.garden_personal_pets to authenticated;
grant all on public.garden_personal_pets to service_role;
create policy garden_personal_pets_owner_read on public.garden_personal_pets for select to authenticated using ((select auth.uid())=user_id);

-- Only the authenticated server may reserve a job. This serializes limits and
-- request IDs before a paid provider request; ambiguous submissions never retry.
create or replace function public.reserve_garden_pet(p_actor uuid,p_id uuid,p_name text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text,918));
  if exists(select 1 from public.garden_personal_pets where id=p_id and user_id=p_actor) then return false; end if;
  if (select count(*) from public.garden_personal_pets where user_id=p_actor)>=12 then raise exception 'Pet library is full'; end if;
  if (select count(*) from public.garden_personal_pets where user_id=p_actor and created_at>now()-interval '24 hours')>=3 then raise exception 'Please try another pet tomorrow'; end if;
  insert into public.garden_personal_pets(id,user_id,name) values(p_id,p_actor,p_name);
  return true;
end $$;
revoke all on function public.reserve_garden_pet(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_garden_pet(uuid,uuid,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('garden-pets','garden-pets',false,20971520,array['image/jpeg','model/gltf-binary']) on conflict(id) do nothing;
create policy garden_pet_asset_owner_read on storage.objects for select to authenticated
using(bucket_id='garden-pets' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Browser clients cannot upload or overwrite models. The server validates assets.
