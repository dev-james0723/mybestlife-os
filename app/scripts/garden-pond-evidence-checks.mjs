import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/** Independent fixture accounts; real SQL, native sessions, and source transitions. */
export async function runPondEvidenceChecks({ admin, check, connection, command, foreignTask }) {
  async function scenario() {
    const account = randomUUID();
    await admin.query("insert into auth.users values($1)", [account]);
    await admin.query("insert into profiles(id) values($1)", [account]);
    const client = await connection(account);
    let save;
    const run = async (payload, id = randomUUID()) => {
      const response = await command(client, payload, save?.world.revision ?? 0, id, account);
      assert.equal(response.status, "ok"); save = response.save; return response;
    };
    await run({ kind: "read" });
    await run({ kind: "connections", modules: ["task", "habit", "gratitude", "rest"] });
    const row = id => save.intentions.find(i => i.id === id);
    const select = async (kind, source) => {
      const before = new Set(save.intentions.map(i => i.id));
      await run({ kind: "select", source_kind: kind, source_id: source, title: "One fixture action" });
      return save.intentions.find(i => !before.has(i.id)).id;
    };
    const link = async (id, kind, source) => {
      await run({ kind: "evidence", action: "link", intention_id: id, intention_version: row(id).version, source_kind: kind, source_id: source });
      return save.evidence_links.find(l => l.intention_id === id && l.source_kind === kind && l.source_id === source && !l.is_primary);
    };
    const claim = (id, extra = {}) => run({ kind: "claim", intention_id: id, intention_version: row(id).version, ...extra });
    const task = async () => {
      const id = randomUUID(); await admin.query("insert into tasks(id,user_id,title,status) values($1,$2,'Private fixture title','todo')", [id, account]); return id;
    };
    const habit = async () => {
      const id = randomUUID(); await admin.query("insert into habits(id,user_id,frequency,created_at,is_active) values($1,$2,'{\"kind\":\"daily\"}',now()-interval '30 days',true)", [id, account]); return id;
    };
    const doneTask = id => admin.query("update tasks set status='done' where id=$1", [id]);
    const doneHabit = id => {
      const occurrence = save.evidence_links.find(value => value.source_kind === "habit" && value.source_id === id)?.occurrence ?? save.intentions.find(value => value.source_kind === "habit" && value.source_id === id)?.occurrence;
      assert(occurrence, "Save the selected Habit occurrence, not the database session date");
      return admin.query("insert into habit_completions values($1,$2,$3,$4::date,'done')", [randomUUID(), account, id, occurrence]);
    };
    return { account, client, run, row, select, link, claim, task, habit, doneTask, doneHabit, get save() { return save; } };
  }

  await check("explicit links require owner, consent and current step version without granting anything", async () => {
    const s = await scenario(), task = await s.task(), habit = await s.habit(), id = await s.select("task", task);
    await assert.rejects(() => s.link(id, "task", foreignTask), /unavailable/);
    await s.run({ kind: "connections", modules: ["task"] });
    await assert.rejects(() => s.link(id, "habit", habit), /Connect this life module/);
    await s.run({ kind: "connections", modules: ["task", "habit"] });
    const version = s.row(id).version, linked = await s.link(id, "habit", habit);
    assert.equal(s.row(id).version, version + 1); assert.equal(s.save.grants.length, 0);
    assert.equal(s.save.evidence_links.length, 2); assert(linked.occurrence);
    await assert.rejects(() => s.run({ kind: "claim", intention_id: id, intention_version: version, link_id: linked.id }), /step changed/);
    await assert.rejects(() => s.claim(id, { link_id: randomUUID() }), /Linked record is unavailable/);
    const stranger = await connection(randomUUID());
    assert.equal((await stranger.query("select * from garden_evidence_links")).rows.length, 0);
    await assert.rejects(() => s.client.query("delete from garden_evidence_links"), /permission denied/);
  });

  await check("a linked Habit completion confirms the Task step, and later Task completion cannot reward it again", async () => {
    const s = await scenario(), task = await s.task(), habit = await s.habit(), id = await s.select("task", task);
    const link = await s.link(id, "habit", habit);
    await assert.rejects(() => s.claim(id, { link_id: link.id }), /Save this action/);
    await s.doneHabit(habit); await s.claim(id, { link_id: link.id });
    assert.equal(s.save.grants.length, 1); assert.equal(s.save.grants[0].source_kind, "habit");
    assert.equal(s.save.grants[0].evidence_kind, "saved_record"); assert.equal(s.save.grants[0].intention_id, id);
    assert.equal((await admin.query("select status from tasks where id=$1", [task])).rows[0].status, "todo");
    await admin.query("update garden_grants set issued_at=now()-interval '10 days' where user_id=$1", [s.account]);
    await s.doneTask(task);
    const duplicate = await s.select("task", task); await s.claim(duplicate);
    assert.equal(s.save.grants.length, 1); assert.equal(s.row(duplicate).status, "acknowledged_without_grant");
    const choices = (await s.client.query("select garden_pond_task_choices($1) choices", [s.account])).rows[0].choices;
    assert(!choices.some(item => item.id === task));
  });

  await check("post-award links protect later records and cannot erase a separately earned result", async () => {
    const s = await scenario(), firstTask = await s.task(), laterTask = await s.task(), id = await s.select("task", firstTask);
    await s.doneTask(firstTask); await s.claim(id); await s.link(id, "task", laterTask);
    await s.doneTask(laterTask); const later = await s.select("task", laterTask); await s.claim(later);
    assert.equal(s.save.grants.length, 1);
    const distinctTask = await s.task(), distinct = await s.select("task", distinctTask);
    await s.doneTask(distinctTask); await s.claim(distinct); assert.equal(s.save.grants.length, 2);
    await assert.rejects(() => s.link(id, "task", distinctTask), /already belongs|already acknowledged/);
    assert.equal(s.save.grants.length, 2);
    const alias = s.save.evidence_links.find(l => l.source_id === laterTask);
    await assert.rejects(() => s.run({ kind: "evidence", action: "unlink", intention_id: id, intention_version: s.row(id).version, link_id: alias.id }), /Acknowledged records stay linked/);
  });

  await check("unearned links can be removed or skipped, while source changes require an explicit unlink", async () => {
    const s = await scenario(), task = await s.task(), habit = await s.habit(), replacement = await s.task(), id = await s.select("task", task);
    let alias = await s.link(id, "habit", habit);
    const revise = () => s.run({ kind: "intention", action: "revise", intention_id: id, intention_version: s.row(id).version, source_kind: "task", source_id: replacement, title: "A different step" });
    await assert.rejects(revise, /Remove linked records/);
    await s.run({ kind: "evidence", action: "unlink", intention_id: id, intention_version: s.row(id).version, link_id: alias.id });
    assert.equal(s.save.evidence_links.length, 0); await revise(); assert.equal(s.row(id).source_id, replacement);
    alias = await s.link(id, "habit", habit);
    await s.run({ kind: "skip", intention_id: id, intention_version: s.row(id).version });
    assert.equal(s.save.evidence_links.length, 0); assert.equal(s.save.grants.length, 0);
    const next = await s.select("habit", habit); await s.doneHabit(habit); await s.claim(next);
    assert.equal(s.save.grants.length, 1, "Skipping an unearned group does not consume the life action");
  });

  await check("archiving an earned primary Habit does not block adding a related record to its history", async () => {
    const s = await scenario(), habit = await s.habit(), task = await s.task(), id = await s.select("habit", habit);
    await s.doneHabit(habit); await s.claim(id);
    await admin.query("update habits set archived_at=now(),is_active=false where id=$1", [habit]);
    await s.link(id, "task", task); await s.doneTask(task);
    const duplicate = await s.select("task", task); await s.claim(duplicate);
    assert.equal(s.save.grants.length, 1); assert.equal(s.row(duplicate).status, "acknowledged_without_grant");
  });

  await check("deleting the original Task preserves a surviving linked action and earned world, including recreated IDs", async () => {
    const s = await scenario(), task = await s.task(), habit = await s.habit(), id = await s.select("task", task);
    const alias = await s.link(id, "habit", habit), stale = s.row(id).version;
    await admin.query("delete from tasks where id=$1", [task]); await s.run({ kind: "read" });
    assert.equal(s.row(id).status, "active"); assert.equal(s.row(id).source_id, null); assert.equal(s.row(id).settled_at, null);
    assert.equal(s.row(id).title, "A step you chose"); assert(s.row(id).version > stale);
    await s.doneHabit(habit); await s.claim(id, { link_id: alias.id });
    const grant = s.save.grants[0]; await s.run({ kind: "build", grant_id: grant.id, recipe: "perch", slot: 3, rotation: 0 });
    const objects = structuredClone(s.save.world.objects);
    await admin.query("delete from habits where id=$1", [habit]); await s.run({ kind: "read" });
    assert.deepEqual(s.save.world.objects, objects); assert(s.save.evidence_links.every(l => l.source_id === null));
    await admin.query("insert into tasks(id,user_id,title,status) values($1,$2,'Recreated fixture','todo')", [task, s.account]);
    const next = await s.select("task", task); await s.doneTask(task); await s.claim(next);
    assert.equal(s.save.grants.length, 1); assert.deepEqual(s.save.world.objects, objects);
  });

  await check("deleting a linked Habit invalidates stale confirmations and leaves the original action usable", async () => {
    const s = await scenario(), task = await s.task(), habit = await s.habit(), id = await s.select("task", task);
    const alias = await s.link(id, "habit", habit), version = s.row(id).version;
    await s.doneHabit(habit); await admin.query("delete from habits where id=$1", [habit]);
    await s.run({ kind: "read" }); assert.equal(s.row(id).status, "active"); assert(s.row(id).version > version);
    assert(!s.save.evidence_links.some(l => l.id === alias.id));
    await assert.rejects(() => s.claim(id, { link_id: alias.id }), /Linked record is unavailable/);
    await s.doneTask(task); await s.claim(id); assert.equal(s.save.grants.length, 1);
  });

  await check("an old but selected linked receipt survives retention and remains claimable", async () => {
    const s = await scenario(), task = await s.task(), habit = await s.habit(), id = await s.select("task", task);
    const alias = await s.link(id, "habit", habit); await s.doneHabit(habit);
    // Synthetic age, explicitly testing retention rather than claiming real elapsed time.
    await admin.query("update garden_life_intentions set selected_at=now()-interval '20 days' where id=$1", [id]);
    await admin.query("update garden_evidence_links set linked_at=now()-interval '20 days' where intention_id=$1", [id]);
    await admin.query("update garden_source_receipts set first_observed_at=now()-interval '19 days' where user_id=$1", [s.account]);
    await s.run({ kind: "read" });
    assert.equal((await admin.query("select count(*)::int n from garden_source_receipts where user_id=$1", [s.account])).rows[0].n, 1);
    await s.claim(id, { link_id: alias.id }); assert.equal(s.save.grants.length, 1);
  });

  await check("two sessions confirming different records of one group commit only one grant", async () => {
    const s = await scenario(), task = await s.task(), habit = await s.habit(), id = await s.select("task", task);
    const alias = await s.link(id, "habit", habit); await s.doneTask(task); await s.doneHabit(habit);
    const second = await connection(s.account), revision = s.save.world.revision, version = s.row(id).version;
    const outcomes = await Promise.all([
      command(s.client, { kind: "claim", intention_id: id, intention_version: version }, revision, randomUUID(), s.account),
      command(second, { kind: "claim", intention_id: id, intention_version: version, link_id: alias.id }, revision, randomUUID(), s.account),
    ]);
    assert.deepEqual(outcomes.map(r => r.status).sort(), ["conflict", "ok"]);
    await s.run({ kind: "read" }); assert.equal(s.save.grants.length, 1);
    const laterTask = await s.task(), payload = { kind: "evidence", action: "link", intention_id: id, intention_version: s.row(id).version, source_kind: "task", source_id: laterTask }, commandId = randomUUID();
    const retry = await Promise.all([command(s.client, payload, s.save.world.revision, commandId, s.account), command(second, payload, s.save.world.revision, commandId, s.account)]);
    assert.deepEqual(retry[0], retry[1]); assert.equal(retry[0].save.evidence_links.filter(l => l.source_id === laterTask).length, 1);
  });

  await check("a source deletion already holding its row defeats an in-flight link without stale private references", async () => {
    const s = await scenario(), task = await s.task(), aliasTask = await s.task(), id = await s.select("task", task);
    const pid = (await s.client.query("select pg_backend_pid() pid")).rows[0].pid, observer = await connection();
    await admin.query("begin"); await admin.query("delete from tasks where id=$1", [aliasTask]);
    const pending = s.link(id, "task", aliasTask).then(value => ({ value }), error => ({ error }));
    let blocked = false;
    for (let i = 0; i < 30; i++) {
      if ((await observer.query("select wait_event_type from pg_stat_activity where pid=$1", [pid])).rows[0].wait_event_type === "Lock") { blocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    await admin.query("commit"); const result = await pending;
    assert(blocked); assert.match(result.error?.message ?? "", /unavailable/);
    await s.run({ kind: "read" }); assert.equal(s.save.evidence_links.length, 0); assert.equal(s.row(id).version, 1);
  });
}
