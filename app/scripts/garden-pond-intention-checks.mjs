import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/** Actual SQL transitions in the native PostgreSQL harness, using a fresh fixture account. */
export async function runPondIntentionChecks({ admin, check, connection, command, foreignTask }) {
  const account = "00000000-0000-4000-8000-000000000073";
  const task = randomUUID(), otherTask = randomUUID(), habit = randomUUID();
  await admin.query("insert into auth.users values($1)", [account]);
  await admin.query("insert into profiles(id) values($1)", [account]);
  for (const id of [task, otherTask]) await admin.query("insert into tasks(id,user_id,title,status,completed_at) values($1,$2,'Intention fixture','todo',null)", [id, account]);
  await admin.query("insert into habits(id,user_id,frequency,created_at,is_active) values($1,$2,'{\"kind\":\"daily\"}',now()-interval '30 days',true)", [habit, account]);
  const client = await connection(account);
  const backendPid = (await client.query("select pg_backend_pid() pid")).rows[0].pid;
  let save;
  async function run(payload, id = randomUUID()) {
    const result = await command(client, payload, save?.world.revision ?? 0, id, account);
    assert.equal(result.status, "ok"); save = result.save; return result;
  }
  const intention = (id) => save.intentions.find((item) => item.id === id);
  const adjust = (id, action, values = {}) => run({ kind: "intention", intention_id: id, intention_version: intention(id).version, action, ...values });
  const claim = (id, values = {}) => run({ kind: "claim", intention_id: id, intention_version: intention(id).version, ...values });
  await run({ kind: "read" });
  await run({ kind: "connections", modules: ["task", "habit", "rest"] });
  let first, second;
  await check("pausing keeps a step and its world while freeing an active slot", async () => {
    await run({ kind: "select", source_kind: "task", source_id: task, title: "First chosen step", planned_for: "2026-10-20" });
    first = save.intentions.find((item) => item.title === "First chosen step").id;
    const objects = structuredClone(save.world.objects);
    await adjust(first, "pause");
    assert.equal(intention(first).status, "paused"); assert.equal(intention(first).version, 2);
    assert.deepEqual(save.world.objects, objects); assert.equal(save.grants.length, 0);
    await assert.rejects(() => claim(first), /Resume this step/);
    await assert.rejects(() => run({ kind: "select", source_kind: "task", source_id: task, title: "Duplicate paused source" }), /already selected or paused/);
    await run({ kind: "select", source_kind: "task", source_id: otherTask, title: "Second chosen step" });
    second = save.intentions.find((item) => item.title === "Second chosen step").id;
  });
  await check("a paused intention can change source and resume under the same identity", async () => {
    await adjust(first, "revise", { source_kind: "rest", source_id: null, title: "A quiet break", scope: "completion", planned_for: null });
    assert.equal(intention(first).status, "paused"); assert.equal(intention(first).source_kind, "rest");
    assert.equal(intention(first).version, 3);
    await adjust(first, "resume"); assert.equal(intention(first).version, 4);
    await assert.rejects(() => run({ kind: "select", source_kind: "rest", title: "Too many active steps" }), /two selected steps/);
    await adjust(second, "pause"); await claim(first, { confirmed: true });
    assert.equal(save.grants.length, 1); assert.equal(save.grants[0].intention_id, first);
    assert.equal(save.grants[0].evidence_kind, "self_report");
    await assert.rejects(() => adjust(first, "revise", { source_kind: "rest", title: "Rewrite an earned result" }), /keeps its history/);
  });
  await check("changed step versions reject stale confirmations even with a current world revision", async () => {
    await adjust(second, "resume");
    const staleVersion = intention(second).version;
    await adjust(second, "revise", { source_kind: "task", source_id: otherTask, title: "Draft one paragraph", scope: "chosen_step", planned_for: "2026-12-01" });
    await assert.rejects(() => run({ kind: "claim", intention_id: second, intention_version: staleVersion, confirmed: true }), /This step changed/);
    await assert.rejects(() => run({ kind: "claim", intention_id: second, confirmed: true }), /This step changed/);
    await assert.rejects(() => claim(second), /Confirm the part/);
    assert.equal(save.grants.length, 1);
  });
  await check("explicit partial progress gives a labeled opportunity without marking the task done", async () => {
    await claim(second, { confirmed: true });
    assert.equal(save.grants.length, 2);
    const grant = save.grants.find((item) => item.intention_id === second);
    assert.equal(grant.evidence_kind, "self_report");
    assert.equal((await admin.query("select status from tasks where id=$1", [otherTask])).rows[0].status, "todo");
    assert.equal((await admin.query("select evidence_kind from garden_source_receipts where source_id=$1", [otherTask])).rows[0].evidence_kind, "self_report");
    await claim(second, { confirmed: true }); assert.equal(save.grants.length, 2);
  });
  await check("later full completion of the same task cannot claim the partial action again", async () => {
    await admin.query("update garden_grants set issued_at=now()-interval '10 days' where user_id=$1", [account]);
    await admin.query("update tasks set status='done' where id=$1", [otherTask]);
    await run({ kind: "select", source_kind: "task", source_id: otherTask, title: "Now the whole task" });
    const next = save.intentions.find((item) => item.title === "Now the whole task").id;
    await claim(next); assert.equal(save.grants.length, 2);
    assert.equal(intention(next).status, "acknowledged_without_grant");
  });
  await check("changing a source rejects another account and cannot bypass consent", async () => {
    await run({ kind: "select", source_kind: "rest", title: "An adjustable step" });
    const current = save.intentions.find((item) => item.title === "An adjustable step").id;
    await assert.rejects(() => adjust(current, "revise", { source_kind: "task", source_id: foreignTask, title: "Foreign task" }), /Task is unavailable/);
    await assert.rejects(() => adjust(current, "revise", { source_kind: "gratitude", source_id: null, title: "Unconnected source" }), /Connect this life module/);
    assert.equal(intention(current).source_kind, "rest");
    await run({ kind: "skip", intention_id: current, intention_version: intention(current).version });
  });
  await check("rescheduling a habit changes the plan without rewriting its original occurrence", async () => {
    await run({ kind: "select", source_kind: "habit", source_id: habit, title: "A gentle walk" });
    const step = save.intentions.find((item) => item.title === "A gentle walk"), occurrence = step.occurrence, selectedAt = step.selected_at;
    await adjust(step.id, "revise", { source_kind: "habit", source_id: habit, title: "Walk when it fits", planned_for: "2026-12-15" });
    assert.equal(intention(step.id).occurrence, occurrence); assert.equal(intention(step.id).selected_at, selectedAt);
    assert.equal(intention(step.id).planned_for, "2026-12-15"); assert.equal(save.grants.length, 2);
    await admin.query("insert into habit_completions values($1,$2,$3,$4,'done')", [randomUUID(), account, habit, occurrence]);
    await claim(step.id); assert.equal(save.grants.length, 3);
    assert.equal(save.grants.find((item) => item.intention_id === step.id).evidence_kind, "saved_record");
  });
  await check("paused evidence survives retention and source deletion scrubs the paused step", async () => {
    await run({ kind: "select", source_kind: "task", source_id: task, title: "Private paused title" });
    const id = save.intentions.find((item) => item.title === "Private paused title").id;
    await admin.query("update tasks set status='done' where id=$1", [task]);
    await adjust(id, "pause");
    await admin.query("update garden_source_receipts set first_observed_at=now()-interval '30 days' where source_id=$1", [task]);
    await admin.query("update garden_life_intentions set selected_at=now()-interval '31 days' where id=$1", [id]);
    await run({ kind: "read" });
    assert.equal((await admin.query("select count(*)::int n from garden_source_receipts where source_id=$1", [task])).rows[0].n, 1);
    await admin.query("delete from tasks where id=$1", [task]);
    await run({ kind: "read" });
    assert.equal(intention(id).status, "skipped"); assert.equal(intention(id).source_id, null);
    assert(!JSON.stringify(save).includes("Private paused title")); assert.equal(save.grants.length, 3);
  });
  async function waitForLock() {
    for (let n = 0; n < 30; n++) {
      if ((await admin.query("select wait_event_type from pg_stat_activity where pid=$1", [backendPid])).rows[0]?.wait_event_type === "Lock") return;
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error("Expected the independent step command to wait for a real PostgreSQL lock");
  }
  await check("a concurrent source deletion cannot be overwritten by a stale intention edit", async () => {
    const source = randomUUID();
    await admin.query("insert into tasks(id,user_id,title,status,completed_at) values($1,$2,'Delete fixture','todo',null)", [source, account]);
    await run({ kind: "select", source_kind: "task", source_id: source, title: "A private pending step" });
    const step = save.intentions.find(item => item.source_id === source), before = save.world.revision;
    await admin.query("begin"); await admin.query("delete from tasks where id=$1", [source]);
    const editing = adjust(step.id, "revise", { source_kind: "rest", source_id: null, title: "Stale private edit" }).then(value => ({ value }), error => ({ error }));
    try { await waitForLock(); } finally { await admin.query("commit"); }
    assert.match((await editing).error?.message ?? "", /This step changed/);
    await run({ kind: "read" }); assert.equal(save.world.revision, before);
    assert.equal(intention(step.id).source_id, null); assert.equal(intention(step.id).status, "skipped");
    assert(!JSON.stringify(save).includes("Stale private edit"));
  });
  await check("rebinding cannot attach a source deleted while ownership is being checked", async () => {
    const source = randomUUID();
    await admin.query("insert into tasks(id,user_id,title,status,completed_at) values($1,$2,'New link fixture','todo',null)", [source, account]);
    await run({ kind: "select", source_kind: "rest", title: "Keep this rest" });
    const step = save.intentions.find(item => item.title === "Keep this rest");
    await admin.query("begin"); await admin.query("delete from tasks where id=$1", [source]);
    const editing = adjust(step.id, "revise", { source_kind: "task", source_id: source, title: "Missing source" }).then(value => ({ value }), error => ({ error }));
    try { await waitForLock(); } finally { await admin.query("commit"); }
    assert.match((await editing).error?.message ?? "", /Task is unavailable/);
    await run({ kind: "read" }); assert.equal(intention(step.id).source_kind, "rest"); assert.equal(intention(step.id).version, 1);
  });
}
