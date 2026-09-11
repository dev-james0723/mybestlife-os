\set ON_ERROR_STOP on
-- Disposable CI PostgreSQL only. Minimal Supabase-compatible auth/storage surfaces.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid() primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
grant usage on schema public, auth, storage to authenticated, anon;
grant select, insert on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to authenticated;
\ir ../supabase/migrations/20260911010000_mind_council_rooms.sql
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into public.mind_council_rooms(id,user_id,name,advisor_ids,advisors,initial_question,scene_template) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Owner one',array['a','b'],'[{"id":"a","name":"A"},{"id":"b","name":"B"}]','Question?','sunset-library'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Owner two',array['a','b'],'[{"id":"a","name":"A"},{"id":"b","name":"B"}]','Question?','garden-room');
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$
declare first_token uuid := gen_random_uuid(); second_token uuid := gen_random_uuid(); before_count bigint;
begin
  assert (select count(*) from public.mind_council_rooms) = 1, 'RLS hides the other account';
  assert public.claim_mind_council_operation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','scene',gen_random_uuid()) = 'missing', 'Cannot claim another account room';
  begin
    insert into public.mind_council_turns(id,room_id,user_id,prompt,target_ids) values(gen_random_uuid(),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','Attempt',array['a']);
    raise exception 'Cross-account foreign key unexpectedly allowed';
  exception when foreign_key_violation then null; end;
  assert public.claim_mind_council_operation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','scene',first_token) = 'claimed';
  assert public.claim_mind_council_operation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','scene',second_token) = 'busy', 'No duplicate billed scene jobs';
  update public.mind_council_rooms set scene_status='ready',scene_path='11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/original.webp',scene_version=first_token,scene_token=null,is_saved=true where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  select count(*) into before_count from public.mind_council_usage;
  assert public.claim_mind_council_operation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','scene',gen_random_uuid()) = 'ready', 'Reopen returns original scene';
  assert (select count(*) from public.mind_council_usage) = before_count, 'Reopening does not spend quota';
  assert (select scene_version from public.mind_council_rooms where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = first_token;
  assert public.claim_mind_council_operation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','turn',gen_random_uuid()) = 'claimed';
  assert public.claim_mind_council_operation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','turn',gen_random_uuid()) = 'busy', 'One conversation writer at a time';
  update public.mind_council_rooms set chat_started_at=now()-interval '7 minutes' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  assert public.claim_mind_council_operation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','turn',second_token) = 'claimed', 'Crashed writer lease can be recovered';
  begin
    delete from public.mind_council_rooms;
    raise exception 'Room deletion could erase quota receipts';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.mind_council_usage;
    raise exception 'Quota receipts unexpectedly deletable';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values('mind-council-scenes','22222222-2222-4222-8222-222222222222/other/image.webp');
    raise exception 'Cross-account storage unexpectedly writable';
  exception when insufficient_privilege then null; end;
  insert into storage.objects(bucket_id,name) values('mind-council-scenes','11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/original.webp');
  begin
    update public.mind_council_rooms set advisor_ids=array['a','b','c','d','e'] where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Five advisors unexpectedly accepted';
  exception when check_violation then null; end;
  raise notice 'PASS: ownership, four-person limit, durable save, leases and private storage';
end $$;
-- Receipt token IDs are globally unique; use a fresh token for every operation.
reset role;
set role authenticated;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$ begin
  assert (select count(*) from storage.objects) = 0, 'Other account image stays private';
  assert (select count(*) from public.mind_council_usage) = 0, 'Usage ledger stays private';
  for i in 1..12 loop
    insert into public.mind_council_usage(token,user_id,room_id,kind) values(gen_random_uuid(),'22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','scene');
  end loop;
  assert public.claim_mind_council_operation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','scene',gen_random_uuid()) = 'limited', 'Daily image budget enforced';
  raise notice 'PASS: cross-account privacy and daily generation quota';
end $$;
reset role;
