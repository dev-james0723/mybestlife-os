import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function runPondChoiceChecks({ admin, check, connection, command }) {
  const account = "00000000-0000-4000-8000-000000000074";
  const todo = randomUUID(), prior = randomUUID(), today = randomUUID(), old = randomUUID();
  await admin.query("insert into auth.users values($1)", [account]);
  await admin.query("insert into profiles(id) values($1)", [account]);
  for (const id of [todo, prior, today, old]) await admin.query("insert into tasks(id,user_id,title,status) values($1,$2,'Source choice fixture','todo')", [id, account]);
  const client = await connection(account);
  const choices = async () => (await client.query("select public.garden_pond_task_choices($1) value", [account])).rows[0].value;
  let save;
  async function run(payload) {
    const result = await command(client, payload, save?.world.revision ?? 0, randomUUID(), account);
    assert.equal(result.status, "ok"); save = result.save;
  }
  await check("source choices require the owning account and an explicit task connection", async () => {
    assert.deepEqual(await choices(), []);
    assert.equal((await admin.query("select count(*)::int n from garden_worlds where user_id=$1", [account])).rows[0].n, 0, "A choice read cannot silently enroll a player");
    await assert.rejects(() => client.query("select public.garden_pond_task_choices($1)", [randomUUID()]), /account changed/);
    const anonymous = await connection(); await anonymous.query("set role anon");
    await assert.rejects(() => anonymous.query("select public.garden_pond_task_choices($1)", [account]), /permission denied/);
    await run({ kind: "read" });
    await admin.query("update tasks set status='done' where id=$1", [prior]);
    assert.deepEqual(await choices(), []);
    await run({ kind: "connections", modules: ["task"] });
    await admin.query("insert into tasks(id,user_id,title,status) values($1,$2,'Cancelled work is not a new invitation','cancelled')", [randomUUID(), account]);
    const rows = await choices(); assert.equal(rows.length, 3); assert(!rows.some(row => row.id === prior));
    assert(rows.every(row => [todo, today, old].includes(row.id) && !row.recorded_today));
    assert.deepEqual(Object.keys(rows[0]).sort(), ["id", "project_id", "recorded_today", "status", "title"]);
  });
  await check("a saved completion is selectable today without backfilling pre-consent history", async () => {
    await admin.query("update tasks set status='done' where id=any($1::uuid[])", [[today, old]]);
    await admin.query("update garden_source_receipts set first_observed_at=now()-interval '2 days' where source_id=$1", [old]);
    const rows = await choices();
    assert.equal(rows.find(row => row.id === today)?.recorded_today, true);
    assert.equal(rows[0].id, today); assert(!rows.some(row => [prior, old].includes(row.id)));
    assert.equal(save.grants.length, 0, "Reading choices does not grant anything");
  });
  await check("choice dates use the account Garden window and apply a pending zone only after its boundary", async () => {
    const zones = (await admin.query("select zone,((((now() at time zone zone)-interval '4 hours')::date)::timestamp+interval '4 hours') at time zone zone as start from unnest(array['Etc/GMT+12','Pacific/Kiritimati']) zone order by start")).rows;
    const [earlier, later] = zones;
    assert(earlier.start < later.start);
    const middle = new Date((earlier.start.getTime() + later.start.getTime()) / 2);
    await admin.query("update garden_source_receipts set first_observed_at=$1 where source_id=$2", [middle, today]);
    await admin.query("update garden_worlds set timezone=$1,pending_timezone=$2,window_ends_at=now()+interval '1 hour' where user_id=$3", [later.zone, earlier.zone, account]);
    assert(!(await choices()).some(row => row.id === today), "A future timezone change cannot expose yesterday's action now");
    await admin.query("update garden_worlds set window_ends_at=now()-interval '1 second' where user_id=$1", [account]);
    assert((await choices()).some(row => row.id === today), "The next effective zone uses the same day boundary as selection");
    await run({ kind: "select", source_kind: "task", source_id: today, title: "Bring this saved action into my pond" });
    assert.equal(save.timezone, earlier.zone);
  });
  await check("a chosen saved-today task grants once then leaves the available completed choices", async () => {
    const intention = save.intentions.find(row => row.source_id === today);
    await run({ kind: "claim", intention_id: intention.id, intention_version: intention.version });
    assert.equal(save.grants.length, 1); assert.equal(save.grants[0].evidence_kind, "saved_record");
    assert(!(await choices()).some(row => row.id === today));
    await admin.query("update tasks set status='todo' where id=$1", [today]);
    await admin.query("update tasks set status='done' where id=$1", [today]);
    assert(!(await choices()).some(row => row.id === today), "Undo and redo do not reopen the completed offer");
  });
  await check("corrected, deleted and disconnected source choices cannot expose an awardable completion", async () => {
    await admin.query("update tasks set status='done' where id=$1", [todo]);
    assert((await choices()).some(row => row.id === todo && row.recorded_today));
    await admin.query("update tasks set status='todo' where id=$1", [todo]);
    assert.equal((await choices()).find(row => row.id === todo)?.recorded_today, false);
    await admin.query("delete from tasks where id=$1", [todo]);
    assert(!(await choices()).some(row => row.id === todo));
    await run({ kind: "connections", modules: [] });
    assert.deepEqual(await choices(), []);
    assert.equal(save.grants.length, 1);
  });
}
