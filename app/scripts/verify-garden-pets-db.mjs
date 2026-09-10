import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
const {PGlite}=await import(process.env.GARDEN_VERIFY_PGLITE);
const db=new PGlite(),a="00000000-0000-4000-8000-000000000071",b="00000000-0000-4000-8000-000000000072",id="10000000-0000-4000-8000-000000000001";
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,name text,bucket_id text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema auth,public,storage to authenticated,service_role;grant select on storage.objects to authenticated;`);
 await db.query("insert into auth.users values($1),($2)",[a,b]);
 await db.exec(await readFile("supabase/migrations/20260908161500_garden_personal_pets.sql","utf8"));
 await db.exec("set role service_role");
 const reserve=async(petId,who=a)=>(await db.query("select public.reserve_garden_pet($1,$2,'Reference pet') as reserved",[who,petId])).rows[0].reserved;
 assert.equal(await reserve(id),true);assert.equal(await reserve(id),false);
 await reserve("10000000-0000-4000-8000-000000000002");await reserve("10000000-0000-4000-8000-000000000003");
 await assert.rejects(()=>reserve("10000000-0000-4000-8000-000000000004"));
 await assert.rejects(()=>db.query("update public.garden_personal_pets set status='ready' where id=$1",[id]));
 await db.exec("reset role");await db.query("insert into storage.objects values($1,$2,'garden-pets')",[id,`${a}/${id}/model.glb`]);
 await db.exec("set role authenticated");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
 assert.equal((await db.query("select * from public.garden_personal_pets")).rows.length,0);assert.equal((await db.query("select * from storage.objects")).rows.length,0);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
 assert.equal((await db.query("select * from public.garden_personal_pets")).rows.length,3);assert.equal((await db.query("select * from storage.objects")).rows.length,1);
 await assert.rejects(()=>reserve("10000000-0000-4000-8000-000000000005"));
 await assert.rejects(()=>db.query("update public.garden_personal_pets set status='ready',model_path='fake' where id=$1",[id]));
 const result={execution:"isolated PGlite PostgreSQL with actual candidate migration; no live database",checks:["owner-only pet and private asset reads","client cannot write or reserve provider jobs","duplicate request ID is idempotent","three-per-day limit","ready requires a model path"],passed:true};
 await writeFile("../artifacts/sky-garden/pet-db-results.json",JSON.stringify(result,null,2));console.log(result);
} finally {await db.close();}
