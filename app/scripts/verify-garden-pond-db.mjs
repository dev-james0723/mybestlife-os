import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// The actual candidate SQL runs in isolated PostgreSQL/WASM; no cloud credentials accepted.
const { PGlite } = await import(process.env.GARDEN_VERIFY_PGLITE ?? "@electric-sql/pglite");
const db = new PGlite(), checks = [];
// Compile the actual pure TypeScript rules for SQL/client parity, using the installed compiler.
const require = createRequire(new URL("../package.json", import.meta.url));
const ts = require("typescript"), pondModule = { exports: {} };
const pureSource = await readFile(new URL("../src/lib/garden/pond.ts", import.meta.url), "utf8");
new Function("module", "exports", "require", ts.transpileModule(pureSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(pondModule, pondModule.exports, require);
const { createStarterPond, tracePondRoute, assessPond } = pondModule.exports;
const A = "00000000-0000-4000-8000-000000000071", B = "00000000-0000-4000-8000-000000000072";
const taskA = randomUUID(), taskB = randomUUID(), habit = randomUUID();
let user = A, revision = 0;
let firstSelect;
async function actor(id, role = "authenticated") {
  user = id; await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
  await db.exec(`set role ${role}`);
}
async function call(command, { id = randomUUID(), base = revision, account = user } = {}) {
  const value = (await db.query("select public.garden_pond_command($1::uuid,$2::bigint,$3::jsonb) value", [id, base, JSON.stringify({ ...command, account })])).rows[0].value;
  if (value.status === "ok") revision = value.save.world.revision;
  return value;
}
async function test(name, fn) { await fn(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
try {
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;
    create table public.profiles(id uuid primary key references auth.users(id),timezone text default 'UTC',focus_mode boolean default false);
    create table public.notification_preferences(user_id uuid primary key references auth.users(id),daily_summary boolean default false);
    create table public.tasks(id uuid primary key,user_id uuid references auth.users(id),title text,status text,completed_at timestamptz,created_at timestamptz default now(),project_id uuid);
    create table public.habits(id uuid primary key,user_id uuid references auth.users(id),archived_at timestamptz,frequency jsonb default '{"kind":"daily"}',created_at timestamptz default now()-interval '30 days',is_active boolean default true);
    create table public.habit_completions(id uuid primary key,user_id uuid references auth.users(id),habit_id uuid references public.habits(id) on delete cascade,completion_date date,status text);
    create table public.grateful_things(id uuid primary key,user_id uuid references auth.users(id),content text,entry_date date);
    insert into auth.users values('${A}'),('${B}');
    insert into tasks(id,user_id,title,status,completed_at) values('${taskA}','${A}','Private project next step','todo',null),('${taskB}','${B}','Other account','todo',null);
    insert into habits(id,user_id) values('${habit}','${A}');`);
  await db.exec(await readFile(new URL("../supabase/migrations/20260908061801_garden_adventure_world.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20260908162500_task_lineage.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20260908162634_garden_living_pond.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20260908172055_garden_pond_buddy.sql", import.meta.url), "utf8"));
  await test("candidate migration applies in isolated PostgreSQL", async () => assert.equal((await db.query("select count(*)::int n from pg_tables where tablename='garden_worlds'")).rows[0].n, 1));
  await test("600 generated layouts share exact client/server routes and habitat rules", async () => {
    let seed = 1771;
    const next = (max) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
    for (let iteration=0; iteration<600; iteration++) {
      const world=createStarterPond(), occupied=new Set();
      world.objects=Array.from({length:next(9)},(_,i)=>{ let slot=next(12); while(occupied.has(slot)) slot=(slot+1)%12; occupied.add(slot); return {id:`p-${i}`,kind:["reed","leaf","stone","perch"][next(4)],rotation:next(4),slot,grant_id:null}; });
      world.discoveries=next(2) ? ["dawnfish","leafsnail"] : [];
      const anchors=[next(12),next(12),next(12)], expected=tracePondRoute(anchors,world.objects), habitat=assessPond(world.objects,world.discoveries);
      const actual=(await db.query("select private.garden_pond_route($1::jsonb,$2::jsonb) route,private.garden_pond_route_valid($1::jsonb,$2::jsonb) valid,private.garden_pond_habitat($1::jsonb) habitat",[JSON.stringify(world),JSON.stringify(anchors)])).rows[0];
      assert.equal(actual.valid,expected.ok,`route validity ${iteration}`);
      if(actual.route) assert.deepEqual(actual.route,expected.path,`route ${iteration}`);
      for(const key of ["largestOpenWater","openWater","dawnfish","leafsnail","dragonfly"]) assert.equal(actual.habitat[key],habitat[key],`habitat ${iteration} ${key}`);
    }
  });
  await test("habit frequency matches weekdays and calendar intervals", async () => {
    for(const [frequency,day,start,expected] of [
      [{kind:"daily"},"2026-09-08","2026-09-01",true],
      [{kind:"weekdays",days:[1,3]},"2026-09-08","2026-09-01",false],
      [{kind:"weekdays",days:[2]},"2026-09-08","2026-09-01",true],
      [{kind:"every_n_days",n:3},"2026-09-07","2026-09-01",true],
      [{kind:"every_n_days",n:3},"2026-09-08","2026-09-01",false],
      [{kind:"weekly_count",count:2},"2026-09-08","2026-09-01",true],
      [{kind:"daily"},"2026-09-01","2026-09-08",false],
    ]) assert.equal((await db.query("select private.garden_habit_required($1::jsonb,$2::date,$3::date) value",[JSON.stringify(frequency),day,start])).rows[0].value,expected);
  });
  await actor(null, "anon");
  await test("anonymous callers cannot enter or read worlds", async () => {
    await assert.rejects(() => call({ kind: "read" }), /permission denied/);
    await assert.rejects(() => db.query("select * from garden_worlds"), /permission denied/);
  });
  await actor(A); let result;
  await test("entry grants one persistent starter without requiring life records", async () => {
    result = await call({ kind: "read" }); assert.equal(result.save.world.objects.length, 4); assert.equal(result.save.grants.length, 0);
    assert.deepEqual((await call({ kind: "read" })).save.world, result.save.world);
  });
  await test("source receipts are opt-in and contain no private source content", async () => {
    await actor(null, "postgres"); await db.query("update tasks set status='done' where id=$1", [taskA]);
    assert.equal((await db.query("select * from garden_source_receipts")).rows.length, 0);
    await db.query("update tasks set status='todo' where id=$1", [taskA]); await actor(A);
    await call({ kind: "connections", modules: ["task", "habit", "gratitude", "rest"] });
    firstSelect={id:randomUUID(),base:revision,command:{kind:"select",source_kind:"task",source_id:taskA,title:"My selected next step"}};
    await call(firstSelect.command,{id:firstSelect.id,base:firstSelect.base});
    await actor(null, "postgres"); await db.query("update tasks set status='done' where id=$1", [taskA]);
    const rows = (await db.query("select * from garden_source_receipts")).rows;
    assert.equal(rows.length, 1); assert(!JSON.stringify(rows).includes("Private project"));
    await actor(A); await call({ kind: "read" });
  });
  let intention, grant;
  await test("a saved task grants exactly one opportunity", async () => {
    result = await call({ kind: "read" }); intention = result.save.intentions.find(i => i.status === "active").id;
    result = await call({ kind: "claim", intention_id: intention }); grant = result.save.grants[0].id; assert.equal(result.save.grants.length, 1);
    assert.equal((await call({ kind: "claim", intention_id: intention })).save.grants.length, 1);
  });
  await test("unknown response retry returns the original result without double consumption", async () => {
    const id = randomUUID(), base = revision, command = { kind: "build", grant_id: grant, recipe: "perch", slot: 3, rotation: 0 };
    const first = await call(command, { id, base }); assert.deepEqual(await call(command, { id, base }), first);
    assert.equal(first.save.world.objects.length, 5);
    await assert.rejects(() => call({ ...command, slot: 4 }, { id, base }), /already used/);
    await assert.rejects(() => call({ ...command, slot: 4 }), /already built/);
  });
  await test("stale placement conflicts without overwriting the earlier layout", async () => {
    const base = revision; await call({ kind: "move", object_id: "starter-reed-2", slot: 1, rotation: 0 });
    const conflict = await call({ kind: "move", object_id: "starter-reed-1", slot: 2, rotation: 0 }, { base });
    assert.equal(conflict.status, "conflict"); assert.equal(conflict.save.world.objects.find(o => o.id === "starter-reed-1").slot, 0);
  });
  await test("forged objects, occupied cells and bad rotations are rejected", async () => {
    await assert.rejects(() => call({ kind: "move", object_id: "other-user", slot: 2, rotation: 0 }), /not owned/);
    await assert.rejects(() => call({ kind: "move", object_id: "starter-reed-1", slot: 5, rotation: 0 }), /occupied/);
    await assert.rejects(() => call({ kind: "move", object_id: "starter-reed-1", slot: 0 }), /rotation/);
    await assert.rejects(() => call({ kind: "move", object_id: "starter-reed-1", slot: 12, rotation: 0 }), /position/);
  });
  await test("species require habitat and a connected fish route with a bend", async () => {
    await assert.rejects(() => call({ kind: "observe", species: "dragonfly" }), /habitat/);
    await assert.rejects(() => call({ kind: "observe", species: "dawnfish", anchors: [1, 2, 3] }), /Guide/);
    await call({ kind: "observe", species: "dawnfish", anchors: [2, 7, 11] });
    await call({ kind: "observe", species: "leafsnail" });
    await call({ kind: "move", object_id: "starter-leaf", slot: 4, rotation: 0 });
    result = await call({ kind: "observe", species: "dragonfly" });
    assert.deepEqual(result.save.world.discoveries, ["dawnfish", "leafsnail", "dragonfly"]); assert(result.save.world.fish_ready_at);
    await assert.rejects(() => call({ kind: "grow" }), /still growing/);
  });
  await test("rearrangement and undo/recomplete preserve discoveries without a new reward", async () => {
    await call({ kind: "move", object_id: "starter-reed-2", slot: null, rotation: 0 });
    await actor(null, "postgres"); await db.query("update tasks set status='todo' where id=$1", [taskA]); await db.query("update tasks set status='done' where id=$1", [taskA]);
    await actor(A); result = await call({ kind: "read" }); assert.equal(result.save.world.discoveries.length, 3); assert.equal(result.save.world.objects.length, 5);
    result = await call({ kind: "select", source_kind: "task", source_id: taskA, title: "Try same task" });
    result = await call({ kind: "claim", intention_id: result.save.intentions.find(i => i.status === "active").id }); assert.equal(result.save.grants.length, 1);
  });
  await test("rest earns an equal opportunity without duration or content scoring", async () => {
    result = await call({ kind: "select", source_kind: "rest", title: "Take a rest" }); const id = result.save.intentions.find(i => i.status === "active").id;
    await assert.rejects(() => call({ kind: "claim", intention_id: id }), /Confirm/);
    result = await call({ kind: "claim", intention_id: id, confirmed: true }); assert.equal(result.save.grants.length, 2);
  });
  await test("24-hour cap settles once instead of creating a deferred reward", async () => {
    result = await call({ kind: "select", source_kind: "rest", title: "A second rest" }); const id = result.save.intentions.find(i => i.status === "active").id;
    result = await call({ kind: "claim", intention_id: id, confirmed: true }); assert.equal(result.save.grants.length, 2); assert.equal(result.save.intentions.find(i => i.id === id).status, "acknowledged_without_grant");
    await actor(null, "postgres"); await db.exec("update garden_grants set issued_at=now()-interval '2 days'"); await actor(A); await call({ kind: "read" });
    assert.equal((await call({ kind: "claim", intention_id: id, confirmed: true })).save.grants.length, 2);
  });
  await test("direct API writes and switched accounts cannot change the first player's rewards", async () => {
    await assert.rejects(() => db.query("update garden_worlds set revision=0"), /permission denied/);
    await assert.rejects(() => call({ kind: "grow" }, { account: B }), /account changed/);
    await actor(B); result = await call({ kind: "read" }); assert.equal(result.save.world.objects.length, 4); assert.equal(result.save.grants.length, 0);
    assert.equal((await db.query("select * from garden_grants")).rows.length, 0);
    await call({ kind: "connections", modules: ["task"] });
    await assert.rejects(() => call({ kind: "select", source_kind: "task", source_id: taskA, title: "Wrong task" }), /unavailable/);
  });
  await test("maturation advances once after an absence without repeated offline growth", async () => {
    await actor(null, "postgres"); await db.query("update garden_worlds set state=jsonb_set(state,'{fish_ready_at}',to_jsonb(now()-interval '30 days')) where user_id=$1", [A]);
    await actor(A); await call({ kind: "read" }); result = await call({ kind: "grow" }); assert.equal(result.save.world.fish_adult, true);
    result = await call({ kind: "grow" }); assert.equal(result.save.events.filter(e => e.kind === "growth").length, 1);
  });
  await test("deleting a source scrubs source links and cached titles, preserving earned objects", async () => {
    await actor(null, "postgres"); await db.query("delete from tasks where id=$1", [taskA]);
    const rows = (await db.query("select request,result from garden_pond_commands where user_id=$1", [A])).rows;
    assert(!JSON.stringify(rows).includes("My selected next step")); assert(!JSON.stringify(rows).includes("Try same task"));
    await actor(A); result = await call({ kind: "read" }); assert.equal(result.save.world.objects.length, 5); assert.equal(result.save.world.discoveries.length, 3);
    assert(result.save.intentions.filter(i => i.source_kind === "task").every(i => i.source_id === null));
    const replay=await call(firstSelect.command,{id:firstSelect.id,base:firstSelect.base});
    assert(!JSON.stringify(replay).includes("My selected next step"));
    await call({kind:"read"});
  });
  await test("gratitude grants use saved facts and refuse a second claim after deletion", async () => {
    result=await call({kind:"select",source_kind:"gratitude",title:"Notice a kind moment"});
    const intention=result.save.intentions.find(i=>i.status==="active").id, source=randomUUID();
    await actor(null,"postgres"); await db.query("insert into grateful_things(id,user_id,content,entry_date) values($1,$2,'Private gratitude content',current_date)",[source,A]);
    await actor(A); await call({kind:"read"});
    result=await call({kind:"claim",intention_id:intention,source_id:source});
    assert.equal(result.save.intentions.find(i=>i.id===intention).status,"granted");
    assert(!JSON.stringify(result).includes("Private gratitude content"));
    const count=result.save.grants.length;
    await actor(null,"postgres"); await db.query("delete from grateful_things where id=$1",[source]);
    await actor(A); result=await call({kind:"read"});
    await assert.rejects(()=>call({kind:"claim",intention_id:intention}),/This step changed/);
    result=await call({kind:"claim",intention_id:intention,intention_version:result.save.intentions.find(i=>i.id===intention).version});
    assert.equal(result.save.grants.length,count); assert.equal(result.save.intentions.find(i=>i.id===intention).source_id,null);
  });
  await test("habit completion row recreation does not create another occurrence reward", async () => {
    result=await call({kind:"select",source_kind:"habit",source_id:habit,title:"A deliberate walk"});
    const intention=result.save.intentions.find(i=>i.status==="active").id, occurrence=result.save.intentions.find(i=>i.id===intention).occurrence, completion=randomUUID();
    await actor(null,"postgres"); await db.query("insert into habit_completions values($1,$2,$3,$4::date,'done')",[completion,A,habit,occurrence]);
    await actor(A); await call({kind:"read"}); result=await call({kind:"claim",intention_id:intention});
    const count=result.save.grants.length;
    await actor(null,"postgres"); await db.query("delete from habit_completions where id=$1",[completion]);
    await db.query("insert into habit_completions values($1,$2,$3,$4::date,'done')",[randomUUID(),A,habit,occurrence]);
    await actor(A); await call({kind:"read"}); result=await call({kind:"select",source_kind:"habit",source_id:habit,title:"Repeat the same walk"});
    result=await call({kind:"claim",intention_id:result.save.intentions.find(i=>i.status==="active").id});
    assert.equal(result.save.grants.length,count);
    assert.equal(result.save.intentions.find(i=>i.title==="Repeat the same walk").status,"acknowledged_without_grant");
  });
  await test("long-term object attribution survives the recent-intention window", async () => {
    await actor(null,"postgres"); await db.exec("update garden_life_intentions set settled_at=now()-interval '30 days' where status='granted'");
    await actor(A); result=await call({kind:"read"});
    assert(result.save.grants.every(g=>result.save.intentions.some(i=>i.id===g.intention_id)));
  });
  await test("timezone changes wait for the existing window and respect DST boundaries", async () => {
    const old=(await call({kind:"read"})).save.timezone;
    result=await call({kind:"timezone",timezone:"America/New_York"}); assert.equal(result.save.timezone,old); assert.equal(result.save.pending_timezone,"America/New_York");
    await actor(null,"postgres"); await db.query("update garden_worlds set window_ends_at=now()-interval '1 second' where user_id=$1",[A]);
    await actor(A); result=await call({kind:"read"}); assert.equal(result.save.timezone,"America/New_York"); assert.equal(result.save.pending_timezone,null);
    await actor(null,"postgres");
    const dst=(await db.query("select extract(epoch from (timestamp '2026-03-08 04:00' at time zone 'America/New_York')-(timestamp '2026-03-07 04:00' at time zone 'America/New_York'))/3600 spring,extract(epoch from (timestamp '2026-11-01 04:00' at time zone 'America/New_York')-(timestamp '2026-10-31 04:00' at time zone 'America/New_York'))/3600 fall")).rows[0];
    assert.equal(Number(dst.spring),23); assert.equal(Number(dst.fall),25);
  });
  async function invitation(action,input={}) {
    return (await db.query("select public.garden_pond_invitation($1,$2::jsonb) value",[action,JSON.stringify({...input,account:user})])).rows[0].value;
  }
  await test("Buddy invitations require explicit consent and real world facts", async () => {
    await actor(A); assert.equal((await invitation("reserve")).invitation,null);
    await actor(null,"postgres");
    await db.query("insert into profiles(id) values($1),($2) on conflict do nothing",[A,B]);
    await db.query("insert into notification_preferences values($1,true),($2,true) on conflict(user_id) do update set daily_summary=true",[A,B]);
    await actor(A); await invitation("settings",{enabled:true});
    await actor(null,"postgres");
    await db.query("update garden_adventure_settings set quiet_start=(extract(hour from now() at time zone 'America/New_York')::int+2)%24,quiet_end=(extract(hour from now() at time zone 'America/New_York')::int+3)%24 where user_id=$1",[A]);
    await db.query("update garden_worlds set state=jsonb_set(jsonb_set(state,'{fish_adult}','false'::jsonb),'{fish_ready_at}',to_jsonb(now()-interval '1 hour')) where user_id=$1",[A]);
    await actor(A); const reserved=await invitation("reserve");
    assert.equal(reserved.invitation.kind,"growth-ready");
    const row=(await db.query("select * from garden_invitation_deliveries where id=$1",[reserved.invitation.id])).rows[0];
    assert.equal(row.shown_at,null,"A reservation is not proof of display");
    await invitation("shown",{delivery_id:row.id});
    assert((await db.query("select shown_at from garden_invitation_deliveries where id=$1",[row.id])).rows[0].shown_at);
    assert.equal((await invitation("reserve")).invitation,null,"24-hour budget is shared");
    await invitation("dismissed",{delivery_id:row.id});
    await invitation("dismissed",{delivery_id:row.id});
    assert.equal((await db.query("select consecutive_dismissals from garden_worlds where user_id=$1",[A])).rows[0].consecutive_dismissals,1,"Retry does not count as another dismissal");
  });
  await test("two distinct dismissals pause Buddy for seven days", async () => {
    await actor(null,"postgres");
    await db.query("update garden_adventure_settings set last_invited_at=now()-interval '25 hours' where user_id=$1",[A]);
    await db.query("update garden_invitation_deliveries set reserved_at=now()-interval '25 hours' where user_id=$1",[A]);
    await db.query("update garden_worlds set buddy_pause_until=now()-interval '1 second' where user_id=$1",[A]);
    await actor(A); const reserved=await invitation("reserve"); assert.equal(reserved.invitation.kind,"opportunity");
    await invitation("dismissed",{delivery_id:reserved.invitation.id});
    const settings=(await invitation("read")).settings;
    assert(Date.parse(settings.pause_until)-Date.now()>6.9*24*3600*1000);
    assert.equal((await invitation("reserve")).invitation,null);
  });
  await test("Buddy respects OS notifications, focus mode and all-day quiet", async () => {
    await invitation("settings",{enabled:true});
    await actor(null,"postgres");
    await db.query("update garden_adventure_settings set last_invited_at=null where user_id=$1",[A]);
    await db.query("update garden_invitation_deliveries set reserved_at=now()-interval '2 days' where user_id=$1",[A]);
    await db.query("update profiles set focus_mode=true where id=$1",[A]);
    await actor(A); assert.equal((await invitation("reserve")).invitation,null);
    await actor(null,"postgres"); await db.query("update profiles set focus_mode=false where id=$1",[A]);
    await db.query("update notification_preferences set daily_summary=false where user_id=$1",[A]);
    await actor(A); assert.equal((await invitation("reserve")).invitation,null);
    await actor(null,"postgres"); await db.query("update notification_preferences set daily_summary=true where user_id=$1",[A]);
    await db.query("update garden_adventure_settings set quiet_start=8,quiet_end=8 where user_id=$1",[A]);
    await actor(A); assert.equal((await invitation("reserve")).invitation,null);
    await actor(B); const row=await invitation("reserve"); assert.equal(row.invitation,null); assert.equal(row.settings.enabled,false);
    assert.equal((await db.query("select * from garden_invitation_deliveries")).rows.length,0);
  });
  await test("Buddy caps three reserved events per rolling week across repeat visits", async () => {
    await actor(null,"postgres");
    await db.query("update garden_adventure_settings set quiet_start=(extract(hour from now() at time zone 'America/New_York')::int+2)%24,quiet_end=(extract(hour from now() at time zone 'America/New_York')::int+3)%24 where user_id=$1",[A]);
    await db.query("update profiles set os_buddy_enabled=false where id=$1",[A]);
    await actor(A); assert.equal((await invitation("reserve")).invitation,null);
    await actor(null,"postgres"); await db.query("update profiles set os_buddy_enabled=true where id=$1",[A]);
    await actor(A); const third=await invitation("reserve"); assert(third.invitation);
    await invitation("accepted",{delivery_id:third.invitation.id});
    await actor(null,"postgres");
    await db.query("update garden_invitation_deliveries set reserved_at=now()-interval '2 days' where user_id=$1",[A]);
    await db.query("update garden_adventure_settings set last_invited_at=null where user_id=$1",[A]);
    await actor(A); assert.equal((await invitation("reserve")).invitation,null);
    assert.equal((await db.query("select * from garden_invitation_deliveries where user_id=$1",[A])).rows.length,3);
  });
  await test("unused old receipts expire lazily while active and settled evidence survives", async () => {
    const unused=randomUUID(),active=randomUUID();
    await actor(null,"postgres");
    await db.query("insert into garden_source_receipts(user_id,source_kind,source_id,canonical_key,first_observed_at) values($1,'task',$2,'task:'||$2::uuid::text,now()-interval '30 days'),($1,'task',$3,'task:'||$3::uuid::text,now()-interval '30 days')",[A,unused,active]);
    await db.query("insert into garden_life_intentions(user_id,source_kind,source_id,title,zone_at_selection,selected_at) values($1,'task',$2,'An ongoing step','UTC',now()-interval '31 days')",[A,active]);
    const settledBefore=(await db.query("select count(*)::int n from garden_source_receipts where user_id=$1 and settled_at is not null",[A])).rows[0].n;
    await actor(A); await call({kind:"read"});
    assert.equal((await db.query("select * from garden_source_receipts where canonical_key=$1",['task:'+unused])).rows.length,0);
    assert.equal((await db.query("select * from garden_source_receipts where canonical_key=$1",['task:'+active])).rows.length,1);
    assert.equal((await db.query("select count(*)::int n from garden_source_receipts where user_id=$1 and settled_at is not null",[A])).rows[0].n,settledBefore);
  });
  const output = process.env.GARDEN_POND_DB_OUT ?? fileURLToPath(new URL("../../artifacts/garden-v3/db", import.meta.url)); await mkdir(output, { recursive: true });
  await writeFile(`${output}/database-validation.json`, JSON.stringify({ state: "real isolated PostgreSQL; not production", migrationSha256: createHash("sha256").update(await readFile(new URL("../supabase/migrations/20260908162634_garden_living_pond.sql", import.meta.url))).digest("hex"), buddyMigrationSha256: createHash("sha256").update(await readFile(new URL("../supabase/migrations/20260908172055_garden_pond_buddy.sql", import.meta.url))).digest("hex"), checks, limits: ["PGlite serializes one connection; independent PostgreSQL sessions still require concurrency validation.", "No actual users, 3D rendering or retention experiment are covered here."] }, null, 2));
  console.log(`${checks.length} PostgreSQL checks passed`);
} catch (error) {
  console.error(JSON.stringify({ failed: true, message: error.message, code: error.code, where: error.where, position: error.position, expected: error.expected, actual: error.actual }, null, 2));
  process.exitCode = 1;
} finally { await db.close(); }
