import assert from "node:assert/strict";
import { mkdtemp, readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { runPondIntentionChecks } from "./garden-pond-intention-checks.mjs";
import { runPondChoiceChecks } from "./garden-pond-choice-checks.mjs";
import { runPondEvidenceChecks } from "./garden-pond-evidence-checks.mjs";
import { runPondCalendarChecks } from "./garden-pond-calendar-checks.mjs";
import { runTaskLineageChecks } from "./garden-task-lineage-checks.mjs";

// Native, separate PostgreSQL sessions on loopback. Temporary test tooling is not an app dependency.
const { default: EmbeddedPostgres } = await import(process.env.GARDEN_NATIVE_PG ?? "/private/tmp/garden-postgres-verify/node_modules/embedded-postgres/dist/index.js");
const directory = await mkdtemp("/private/tmp/garden-native-pg-");
const log = [], checks = [], clients = [];
let failed = false;
const cluster = new EmbeddedPostgres({ databaseDir: directory, port: 55438, user: "postgres", password: randomUUID(), authMethod: "scram-sha-256", persistent: true, createPostgresUser: false, initdbFlags: ["--locale=C", "--encoding=UTF8"], postgresFlags: ["-h", "127.0.0.1", "-k", directory], onLog: (message) => log.push(message), onError: (message) => log.push(String(message)) });
const A = "00000000-0000-4000-8000-000000000071", B = "00000000-0000-4000-8000-000000000072", tasks = [randomUUID(), randomUUID()];
const migrations = ["20260908061801_garden_adventure_world.sql", "20260908162500_task_lineage.sql", "20260908162634_garden_living_pond.sql", "20260908172055_garden_pond_buddy.sql"];
async function connection(account) {
  const client = cluster.getPgClient(); clients.push(client); await client.connect();
  await client.query("set statement_timeout='8s'");
  if (account) { await client.query("select set_config('request.jwt.claim.sub',$1,false)", [account]); await client.query("set role authenticated"); }
  return client;
}
async function command(client, payload, revision = 0, id = randomUUID(), account = A) {
  return (await client.query("select public.garden_pond_command($1::uuid,$2::bigint,$3::jsonb) value", [id, revision, JSON.stringify({ ...payload, account })])).rows[0].value;
}
async function read(client) { return (await command(client, { kind: "read" })).save; }
async function check(name, run) { await run(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
try {
  await cluster.initialise(); await cluster.start();
  const admin = await connection(), observer = await connection();
  await admin.query(`create role anon nologin; create role authenticated nologin; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;
    create table public.profiles(id uuid primary key references auth.users(id),timezone text default 'UTC',focus_mode boolean default false);
    create table public.notification_preferences(user_id uuid primary key references auth.users(id),daily_summary boolean);
    create table public.tasks(id uuid primary key,user_id uuid references auth.users(id),title text,status text,completed_at timestamptz,created_at timestamptz default now(),project_id uuid);
    create table public.habits(id uuid primary key,user_id uuid references auth.users(id),archived_at timestamptz,frequency jsonb,created_at timestamptz,is_active boolean);
    create table public.habit_completions(id uuid primary key,user_id uuid references auth.users(id),habit_id uuid references public.habits(id) on delete cascade,completion_date date,status text);
    create table public.grateful_things(id uuid primary key,user_id uuid references auth.users(id),content text,entry_date date);
  `);
  await admin.query("insert into auth.users values($1),($2)", [A, B]);
  await admin.query("insert into profiles(id) values($1),($2)", [A, B]);
  await admin.query("insert into notification_preferences values($1,true),($2,true)", [A, B]);
  for (const id of tasks) await admin.query("insert into tasks(id,user_id,title,status,completed_at) values($1,$2,'Fixture step','todo',null)", [id, A]);
  const hashes = {};
  for (const name of migrations) { const sql = await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"); hashes[name] = createHash("sha256").update(sql).digest("hex"); await admin.query(sql); }
  const one = await connection(A), two = await connection(A), other = await connection(B);
  const pids = [(await one.query("select pg_backend_pid() pid")).rows[0].pid, (await two.query("select pg_backend_pid() pid")).rows[0].pid];
  assert.notEqual(pids[0], pids[1]);
  let save = await read(one);
  save = (await command(one, { kind: "connections", modules: ["task", "rest"] }, save.world.revision)).save;
  save = (await command(one, { kind: "select", source_kind: "task", source_id: tasks[0], title: "One meaningful step" }, save.world.revision)).save;
  const first = save.intentions.find((i) => i.status === "active").id;
  await admin.query("update tasks set status='done' where id=$1", [tasks[0]]);
  await check("two actual sessions cannot grant the same completed step twice", async () => {
    const outcomes = await Promise.all([command(one, { kind: "claim", intention_id: first }, save.world.revision), command(two, { kind: "claim", intention_id: first }, save.world.revision)]);
    assert.deepEqual(outcomes.map((value) => value.status).sort(), ["conflict", "ok"]);
    save = await read(one); assert.equal(save.grants.length, 1);
  });
  await check("simultaneous retries of the same command return one persisted change", async () => {
    const id = randomUUID(), base = save.world.revision, payload = { kind: "move", object_id: "starter-reed-2", slot: 1, rotation: 0 };
    const results = await Promise.all([command(one, payload, base, id), command(two, payload, base, id)]);
    assert(results.every((result) => result.status === "ok")); assert.deepEqual(results[0], results[1]);
    save = await read(one); assert.equal(save.world.revision, base + 1);
  });
  await check("competing recipes spend one opportunity on one object", async () => {
    const grant = save.grants[0].id, base = save.world.revision;
    const outcomes = await Promise.all([command(one, { kind: "build", grant_id: grant, recipe: "perch", slot: 3, rotation: 0 }, base), command(two, { kind: "build", grant_id: grant, recipe: "leaf", slot: 4, rotation: 0 }, base)]);
    assert.deepEqual(outcomes.map((result) => result.status).sort(), ["conflict", "ok"]);
    save = await read(one); assert.equal(save.world.objects.length, 5);
    await assert.rejects(() => command(two, { kind: "build", grant_id: grant, recipe: "leaf", slot: 7, rotation: 0 }, save.world.revision), /already built/);
  });
  save = (await command(one, { kind: "select", source_kind: "task", source_id: tasks[1], title: "Second deliberate step" }, save.world.revision)).save;
  const second = save.intentions.find((i) => i.status === "active").id;
  await admin.query("update tasks set status='done' where id=$1", [tasks[1]]);
  await check("a committed undo wins against a grant waiting on the source receipt", async () => {
    await admin.query("begin"); await admin.query("update tasks set status='todo' where id=$1", [tasks[1]]);
    const claim = command(one, { kind: "claim", intention_id: second }, save.world.revision).then((value) => ({ value }), (error) => ({ error }));
    let blocked = false;
    for (let n = 0; n < 20; n++) { if ((await observer.query("select wait_event_type from pg_stat_activity where pid=$1", [pids[0]])).rows[0].wait_event_type === "Lock") { blocked = true; break; } await new Promise((resolve) => setTimeout(resolve, 50)); }
    assert(blocked, "The independent session must wait on the locked receipt");
    await admin.query("commit"); const result = await claim;
    assert.match(result.error?.message ?? "", /Save this action/); assert.equal((await read(one)).grants.length, 1);
  });
  await admin.query("update tasks set status='done' where id=$1", [tasks[1]]);
  await check("an earned grant survives an undo that commits after the grant", async () => {
    save = await read(one); await one.query("begin");
    await command(one, { kind: "claim", intention_id: second }, save.world.revision);
    const undo = admin.query("update tasks set status='todo' where id=$1", [tasks[1]]);
    await one.query("commit"); await undo;
    save = await read(one); assert.equal(save.grants.length, 2); assert.equal(save.world.objects.length, 5);
  });
  await check("concurrent Buddy reservations produce one invitation and preserve account isolation", async () => {
    await command(one, { kind: "buddy-settings", enabled: true }, save.world.revision);
    await admin.query("update garden_adventure_settings set quiet_start=(extract(hour from now())::int+2)%24,quiet_end=(extract(hour from now())::int+3)%24 where user_id=$1", [A]);
    const reserve = (client) => client.query("select public.garden_pond_invitation('reserve',$1::jsonb) value", [JSON.stringify({ account: A })]);
    const results = await Promise.all([reserve(one), reserve(two)]);
    assert.equal(results.filter((result) => result.rows[0].value.invitation).length, 1);
    assert.equal((await other.query("select * from garden_grants")).rows.length, 0);
    assert.equal((await other.query("select * from garden_invitation_deliveries")).rows.length, 0);
    const legacy = (await one.query("select public.garden_adventure_action(current_date,'invite',$1::jsonb) value", [JSON.stringify({ account: A })])).rows[0].value;
    assert.equal(legacy.invited, false, "Cached V2 clients cannot request a generic invitation for a pond player");
  });
  await check("operational pause retains earned progress and source writes; resume preserves retry identities", async () => {
    save = await read(one);
    const id = randomUUID(), base = save.world.revision;
    const payload = { kind: "move", object_id: "starter-reed-2", slot: 8, rotation: 0 };
    const result = await command(one, payload, base, id);
    const before = (await admin.query("select revision,state from garden_worlds where user_id=$1", [A])).rows[0];
    await admin.query(await readFile(new URL("../../docs/garden-research/v3/release/pause-pond.sql", import.meta.url), "utf8"));
    await assert.rejects(() => read(one), /permission denied/);
    await assert.rejects(() => one.query("select private.garden_pond_command($1,0,$2::jsonb)", [randomUUID(), JSON.stringify({ kind: "read", account: A })]), /permission denied/);
    await assert.rejects(() => one.query("select public.garden_pond_invitation('read',$1::jsonb)", [JSON.stringify({ account: A })]), /permission denied/);
    await assert.rejects(() => one.query("select public.garden_pond_task_choices($1)", [A]), /permission denied/);
    await admin.query("update tasks set status='todo' where id=$1", [tasks[0]]);
    assert.equal((await admin.query("select corrected from garden_source_receipts where user_id=$1 and source_id=$2", [A, tasks[0]])).rows[0].corrected, true);
    assert.deepEqual((await admin.query("select revision,state from garden_worlds where user_id=$1", [A])).rows[0], before);
    await one.query("select public.garden_adventure_action(current_date,'settings',$1::jsonb)", [JSON.stringify({ account: A })]);
    await admin.query(await readFile(new URL("../../docs/garden-research/v3/release/resume-pond.sql", import.meta.url), "utf8"));
    const retried = await command(one, payload, base, id);
    await one.query("select public.garden_pond_task_choices($1)", [A]);
    assert.equal(retried.status, "ok");
    assert.deepEqual(retried.save.world, result.save.world);
    assert.equal(retried.save.grants.length, 2);
  });
  await check("bulk source transitions and their receipts commit or roll back together", async () => {
    const ids = [randomUUID(), randomUUID()];
    for (const id of ids) await admin.query("insert into tasks(id,user_id,title,status,completed_at) values($1,$2,'Bulk fixture step','todo',null)", [id, A]);
    await admin.query("begin");
    await admin.query("update tasks set status='done' where id=any($1::uuid[])", [ids]);
    assert.equal((await admin.query("select count(*)::int n from garden_source_receipts where source_id=any($1::uuid[])", [ids])).rows[0].n, 2);
    assert.equal((await observer.query("select count(*)::int n from garden_source_receipts where source_id=any($1::uuid[])", [ids])).rows[0].n, 0);
    await admin.query("rollback");
    assert.equal((await admin.query("select count(*)::int n from garden_source_receipts where source_id=any($1::uuid[])", [ids])).rows[0].n, 0);
    await admin.query("update tasks set status='done' where id=any($1::uuid[])", [ids]);
    assert.equal((await observer.query("select count(*)::int n from garden_source_receipts where source_id=any($1::uuid[])", [ids])).rows[0].n, 2);
    assert.equal((await read(one)).grants.length, 2, "A bulk save never grants objects without a deliberate chosen step and claim");
  });
  await check("recreating an earned task with the same source ID cannot mint a new opportunity", async () => {
    await admin.query("update garden_grants set issued_at=now()-interval '10 days' where user_id=$1", [A]);
    await admin.query("delete from tasks where id=$1", [tasks[0]]);
    await admin.query("insert into tasks(id,user_id,title,status,completed_at) values($1,$2,'Recreated fixture','todo',null)", [tasks[0], A]);
    save = await read(one);
    save = (await command(one, { kind: "select", source_kind: "task", source_id: tasks[0], title: "A recreated task" }, save.world.revision)).save;
    const id = save.intentions.find((intention) => intention.status === "active").id;
    await admin.query("update tasks set status='done' where id=$1", [tasks[0]]);
    const claimed = await command(one, { kind: "claim", intention_id: id }, save.world.revision);
    assert.equal(claimed.save.grants.length, 2);
    assert.equal(claimed.save.intentions.find((intention) => intention.id === id).status, "acknowledged_without_grant");
  });
  await runPondIntentionChecks({ admin, check, connection, command, foreignTask: tasks[0] });
  await runPondChoiceChecks({ admin, check, connection, command });
  await runPondEvidenceChecks({ admin, check, connection, command, foreignTask: tasks[0] });
  await runPondCalendarChecks({ admin, check, connection, command });
  await runTaskLineageChecks({ admin, check, connection, command, foreignTask: tasks[0] });
  const out = new URL("../../artifacts/garden-v3/concurrency/", import.meta.url); await mkdir(out, { recursive: true });
  await writeFile(new URL("validation.json", out), JSON.stringify({ state: "real native PostgreSQL, independent TCP sessions, fixture accounts only", version: (await admin.query("select version() value")).rows[0].value, backendPids: pids, dataDirectory: directory, migrations: hashes, checks }, null, 2));
} catch (error) { failed = true; console.error(JSON.stringify({ failed: true, message: error.message, code: error.code, detail: error.detail, lastLog: log.slice(-3) }, null, 2)); }
finally { await Promise.allSettled(clients.map((client) => client.end())); await cluster.stop(); process.exitCode = failed ? 1 : 0; }
// embedded-postgres's async-exit-hook maps beforeExit to zero. Cleanup is already awaited;
// explicitly preserve a failing test's status instead of reporting a false successful run.
if (failed) process.exit(1);
