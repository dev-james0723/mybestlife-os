import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";

// Executes the actual candidate migration in isolated PostgreSQL (PGlite/WASM).
// No Supabase URL, credential or production connection is accepted by this script.
const { PGlite } = await import(process.env.GARDEN_VERIFY_PGLITE ?? "@electric-sql/pglite");
const db = new PGlite();
const checks = [], output = process.env.GARDEN_DB_OUT ?? "../artifacts/garden-v2/db";
const A = "00000000-0000-4000-8000-000000000071", B = "00000000-0000-4000-8000-000000000072";
let expectedActor = null;
async function pass(name, fn) { await fn(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
async function actor(id, role = "authenticated") {
  expectedActor = id;
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  await db.exec(`set role ${role}`);
}
async function rpc(day, action, value = {}) {
  return (await db.query("select public.garden_adventure_action($1::date, $2::text, $3::jsonb) as value", [day, action, JSON.stringify({ account: expectedActor, ...value })])).rows[0].value;
}
try {
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    create table public.profiles(id uuid primary key references auth.users(id), timezone text default 'UTC');
    create table public.notification_preferences(user_id uuid primary key references auth.users(id), daily_summary boolean);
  `);
  await db.query("insert into auth.users(id) values ($1),($2)", [A, B]);
  await db.query("insert into public.profiles(id) values ($1),($2)", [A, B]);
  await db.query("insert into public.notification_preferences values ($1,true),($2,true)", [A, B]);
  const migration = await readFile("supabase/migrations/20260908061801_garden_adventure_world.sql", "utf8");
  await db.exec(migration);
  const clock = (await db.query("select to_char(now() at time zone 'UTC','YYYY-MM-DD') as day, extract(hour from now() at time zone 'UTC')::int as hour")).rows[0];
  const { day, hour } = clock;
  await pass("additive migration applies in PostgreSQL; existing profiles receive Buddy fields", async () => {
    const rows = (await db.query("select os_buddy_pet_id,os_buddy_enabled from public.profiles")).rows;
    assert.equal(rows.length, 2); assert(rows.every(r => r.os_buddy_pet_id === "xiaoba" && r.os_buddy_enabled));
  });
  await pass("the migration's Buddy additions preserve an existing pet, name and opt-out", async () => {
    await db.query("update public.profiles set os_buddy_pet_id='doge',os_buddy_name='Mochi',os_buddy_enabled=false where id=$1", [A]);
    const statement = migration.match(/alter table public\.profiles[\s\S]*?;/)?.[0];
    assert(statement); await db.exec(statement);
    assert.deepEqual((await db.query("select os_buddy_pet_id,os_buddy_name,os_buddy_enabled from public.profiles where id=$1", [A])).rows[0], { os_buddy_pet_id: "doge", os_buddy_name: "Mochi", os_buddy_enabled: false });
  });
  await actor(null, "anon");
  await pass("anonymous callers cannot read game tables or execute rewards", async () => {
    await assert.rejects(() => db.query("select * from public.garden_adventure_events"), /permission denied/);
    await assert.rejects(() => rpc(day, "plant:0"), /permission denied/);
  });
  await actor(null);
  await pass("authenticated role without a user identity is rejected", async () => { await assert.rejects(() => rpc(day, "plant:0"), /Sign in/); });
  await actor(A);
  await pass("a session switch between client validation and the RPC cannot apply old-account work", async () => {
    await assert.rejects(() => rpc(day, "plant:0", { account: B }), /Garden account changed/);
    assert.equal((await db.query("select * from public.garden_adventure_events")).rows.length, 0);
  });
  await pass("server rejects invalid days, forged actions and missing prerequisites", async () => {
    await assert.rejects(() => rpc("2100-01-01", "plant:0"), /Invalid garden day/);
    await assert.rejects(() => rpc("2000-01-01", "plant:0"), /Invalid garden day/);
    await assert.rejects(() => rpc(day, "plant:999"), /Unknown garden action/);
    await assert.rejects(() => rpc(day, "water:0"), /Plant this bed first/);
    await assert.rejects(() => rpc(day, "harvest:0"), /Water this bed first/);
    await assert.rejects(() => rpc(day, "deliver"), /Harvest three beds/);
    await assert.rejects(() => rpc(day, "settings", { decoration: "flower-cart" }), /not yet unlocked/);
    await assert.rejects(() => rpc(day, "settings", { reminders_enabled: "false" }), /Invalid reminder/);
  });
  await pass("earned facts persist and repeated responses cannot duplicate the stamp", async () => {
    for (let i = 0; i < 3; i++) for (const kind of ["plant", "water", "harvest"]) await rpc(day, `${kind}:${i}`);
    for (let i = 0; i < 3; i++) await rpc(day, `forage:${i}`);
    let result = await rpc(day, "deliver");
    assert.equal(result.stamps, 1); assert.equal(result.actions.length, 13);
    assert.equal(Object.keys(result.watered_at).length, 3);
    for (let i = 0; i < 6; i++) { result = await rpc(day, "deliver"); assert.equal(result.stamps, 1); }
    await rpc(day, "settings", { decoration: "lantern" });
    result = await rpc(day, "discover:pond"); assert.equal(result.settings.decoration, "lantern");
  });
  await pass("direct writes cannot bypass reward checks", async () => {
    await assert.rejects(() => db.query("insert into public.garden_adventure_events(user_id,day,action) values ($1,$2,'forage:5')", [A, day]), /permission denied/);
    await assert.rejects(() => db.query("update public.garden_adventure_settings set decoration='flower-cart'"), /permission denied/);
  });
  await actor(B);
  await pass("a second account sees no first-account events or settings", async () => {
    assert.equal((await db.query("select * from public.garden_adventure_events")).rows.length, 0);
    assert.equal((await db.query("select * from public.garden_adventure_settings")).rows.length, 0);
    const result = await rpc(day, "settings", { user_id: A });
    assert.equal(result.stamps, 0); assert.equal(result.settings.user_id, B); assert.equal(result.settings.decoration, "none");
  });
  await pass("invitations default off and equal quiet hours silence the entire day", async () => {
    assert.equal((await rpc(day, "invite")).invited, false);
    await rpc(day, "settings", { reminders_enabled: true, quiet_start: hour, quiet_end: hour });
    assert.equal((await rpc(day, "invite")).invited, false);
  });
  await pass("quiet-hour exclusion and database claim permit only one invitation across devices", async () => {
    await rpc(day, "settings", { quiet_start: (hour + 1) % 24, quiet_end: (hour + 2) % 24 });
    const results = await Promise.all([rpc(day, "invite"), rpc(day, "invite"), rpc(day, "invite")]);
    assert.equal(results.filter(r => r.invited).length, 1);
  });
  await actor(A);
  await pass("returning as the first account restores its earned facts and customization", async () => {
    const result = await rpc(day, "deliver");
    assert.equal(result.stamps, 1); assert.equal(result.settings.decoration, "lantern"); assert(result.actions.includes("discover:pond"));
    const visible = (await db.query("select distinct user_id from public.garden_adventure_events")).rows;
    assert.deepEqual(visible, [{ user_id: A }]);
  });
  await actor(null, "postgres");
  await pass("notification and Buddy opt-outs are checked again on the server", async () => {
    await db.query("update public.garden_adventure_settings set last_invited_at=null where user_id=$1", [B]);
    await db.query("update public.notification_preferences set daily_summary=false where user_id=$1", [B]);
    await actor(B); assert.equal((await rpc(day, "invite")).invited, false);
    await actor(null, "postgres");
    await db.query("update public.notification_preferences set daily_summary=true where user_id=$1", [B]);
    await db.query("update public.profiles set os_buddy_enabled=false where id=$1", [B]);
    await actor(B); assert.equal((await rpc(day, "invite")).invited, false);
  });
  await pass("automatic timezone uses the device zone and cannot override an explicit account timezone", async () => {
    await actor(null, "postgres");
    await db.query("update public.profiles set os_buddy_enabled=true,timezone='auto' where id=$1", [B]);
    const localHour = (await db.query("select extract(hour from now() at time zone 'Pacific/Honolulu')::int as hour")).rows[0].hour;
    await actor(B);
    await rpc(day, "settings", { quiet_start: localHour, quiet_end: (localHour + 1) % 24 });
    assert.equal((await rpc(day, "invite", { timezone: "Pacific/Honolulu" })).invited, false);
    await rpc(day, "settings", { quiet_start: hour, quiet_end: (hour + 1) % 24 });
    assert.equal((await rpc(day, "invite", { timezone: "Pacific/Honolulu" })).invited, true);
    await actor(null, "postgres");
    await db.query("update public.garden_adventure_settings set last_invited_at=null where user_id=$1", [B]);
    await db.query("update public.profiles set timezone='UTC' where id=$1", [B]);
    await actor(B);
    assert.equal((await rpc(day, "invite", { timezone: "Pacific/Honolulu" })).invited, false);
  });
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/database-validation.json`, JSON.stringify({ state: "real isolated PostgreSQL execution; no cloud migration", clock, checks, limits: ["PGlite serializes its connection. Cross-session locking follows PostgreSQL FOR UPDATE semantics; parallel production connections are not exercised here.", "Private cosmetic rewards enforce identity, dependencies and deduplication; they are not competitive anti-cheat."] }, null, 2));
  console.log(`${checks.length} PostgreSQL checks passed. Evidence: ${output}/database-validation.json`);
} finally { await db.close(); }
