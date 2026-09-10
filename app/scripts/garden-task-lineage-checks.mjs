import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/** Actual source RPCs and Garden commands, with independent native TCP sessions. */
export async function runTaskLineageChecks({ admin, check, connection, command, foreignTask }) {
  const account = "00000000-0000-4000-8000-000000000097", root = randomUUID();
  await admin.query("insert into auth.users values($1)", [account]);
  await admin.query("insert into profiles(id) values($1)", [account]);
  await admin.query("insert into tasks(id,user_id,title,status) values($1,$2,'One original outcome','todo')", [root, account]);
  const one = await connection(account), two = await connection(account);
  let save;
  async function run(payload, id = randomUUID()) {
    const result = await command(one, payload, save?.world.revision ?? 0, id, account);
    assert.equal(result.status, "ok"); save = result.save; return result;
  }
  const derive = async (source, relation, titles, id = randomUUID(), client = one, owner = account) =>
    (await client.query("select public.task_derive($1,$2,$3,$4,$5::jsonb) value", [owner,id,source,relation,JSON.stringify(titles)])).rows[0].value;
  const choose = async (source, extra = {}) => {
    await run({ kind: "select", source_kind: "task", source_id: source, title: "Chosen concrete outcome", ...extra });
    return save.intentions.find(i => i.source_id === source && i.status === "active");
  };
  const claim = (intention, extra = {}) => run({ kind: "claim", intention_id: intention.id, intention_version: intention.version, ...extra });
  const ageGrants = () => admin.query("update garden_grants set issued_at=now()-interval '10 days' where user_id=$1", [account]);
  const complete = (id) => admin.query("update tasks set status='done' where id=$1", [id]);
  const lineage = async (id) => (await one.query("select * from task_lineage where task_id=$1", [id])).rows[0];
  await run({ kind: "read" }); await run({ kind: "connections", modules: ["task","rest"] });
  await check("Task lineage records original opaque identities without copying source text", async () => {
    const entry = await lineage(root);
    assert.equal(entry.outcome_id, root); assert.equal(entry.relation, "original");
    assert(!JSON.stringify(entry).includes("One original outcome"));
    assert.equal((await one.query("select * from task_lineage where task_id=$1", [foreignTask])).rows.length, 0);
  });
  await check("Task derivation rejects foreign sources, switched accounts and direct identity writes", async () => {
    await assert.rejects(() => derive(foreignTask,"copy",["Foreign"]), /Original task is unavailable/);
    await assert.rejects(() => derive(root,"copy",["Switched"],randomUUID(),one,randomUUID()), /account changed/);
    await assert.rejects(() => one.query("update task_lineage set outcome_id=gen_random_uuid() where task_id=$1", [root]), /permission denied/);
    await assert.rejects(() => one.query("insert into task_lineage(task_id,user_id,outcome_id,relation) values($1,$2,$1,'original')", [randomUUID(),account]), /permission denied/);
    await assert.rejects(() => one.query("select * from private.task_derivation_commands"), /permission denied/);
  });
  let children;
  await check("simultaneous split retries create exactly one set of parts with one outcome", async () => {
    const id = randomUUID(), titles = ["Draft opening", "Draft middle", "Draft close"];
    const results = await Promise.all([derive(root,"split",titles,id,one),derive(root,"split",titles,id,two)]);
    children = results[0].task_ids;
    assert.deepEqual(results[1].task_ids, children); assert.equal(children.length, 3);
    assert.deepEqual(results.map(r => r.replayed).sort(), [false,true]);
    for (const child of children) { const row = await lineage(child); assert.equal(row.outcome_id, root); assert.equal(row.parent_task_id, root); assert.equal(row.relation, "split"); }
    assert.equal((await admin.query("select count(*)::int n from tasks where user_id=$1", [account])).rows[0].n, 4);
    await assert.rejects(() => derive(root,"split",["Changed","Request"],id), /identity was already used/);
  });
  await check("invalid derivation and a source-write failure leave no partial tasks or commands", async () => {
    const before = (await one.query("select count(*)::int n from task_lineage")).rows[0].n;
    for (const [kind,titles] of [["split",["Only one"]],["copy",["One","Two"]],["copy",[""]],["split",["Good",17]]]) await assert.rejects(() => derive(root,kind,titles));
    await admin.query("create function private.fixture_reject_task() returns trigger language plpgsql as $$begin if new.title='Reject second part' then raise exception 'Fixture rejects source write'; end if; return new; end$$; create trigger fixture_reject_task before insert on tasks for each row execute function private.fixture_reject_task()");
    const id = randomUUID();
    try { await assert.rejects(() => derive(root,"split",["First part","Reject second part"],id), /Fixture rejects source write/); }
    finally { await admin.query("drop trigger fixture_reject_task on tasks; drop function private.fixture_reject_task()"); }
    assert.equal((await one.query("select count(*)::int n from task_lineage")).rows[0].n, before);
    assert.equal((await admin.query("select count(*)::int n from private.task_derivation_commands where command_id=$1", [id])).rows[0].n, 0);
  });
  await check("part receipts remain independent when a sibling completion is undone", async () => {
    await complete(children[0]); await complete(children[1]); await admin.query("update tasks set status='todo' where id=$1", [children[0]]);
    const rows = (await admin.query("select source_id,corrected from garden_source_receipts where user_id=$1", [account])).rows;
    assert.equal(rows.find(r => r.source_id === children[0]).corrected, true); assert.equal(rows.find(r => r.source_id === children[1]).corrected, false);
    assert.equal((await admin.query("select status from tasks where id=$1", [root])).rows[0].status, "todo");
  });
  await check("concurrent claims of different split parts settle one outcome exactly once", async () => {
    await complete(children[0]); const first = await choose(children[0]), second = await choose(children[1]), revision = save.world.revision;
    const claims = [first,second].map(i => ({ kind:"claim",intention_id:i.id,intention_version:i.version }));
    const outcomes = await Promise.all([command(one,claims[0],revision,randomUUID(),account),command(two,claims[1],revision,randomUUID(),account)]);
    assert.deepEqual(outcomes.map(r => r.status).sort(), ["conflict","ok"]);
    await run({ kind:"read" }); for (const i of [first,second]) await claim(i);
    assert.equal(save.grants.length, 1); assert.equal(save.grants[0].action_key, `task:${root}`);
    assert.equal(save.intentions.filter(i => i.status === "granted").length, 1);
  });
  await check("parent and renamed copies cannot reward again after rolling limits expire", async () => {
    await ageGrants(); await complete(root); await claim(await choose(root));
    const copied = (await derive(children[2],"copy",["A reorganized title"])).task_ids[0];
    await complete(copied); await claim(await choose(copied)); assert.equal(save.grants.length, 1); assert.equal((await lineage(copied)).outcome_id, root);
    const choices = (await one.query("select public.garden_pond_task_choices($1) value", [account])).rows[0].value;
    assert(!choices.some(row => [root,copied,children[0],children[1]].includes(row.id)));
  });
  await check("deleted originals can be explicitly recreated with a new ID and the same outcome", async () => {
    await admin.query("delete from tasks where id=$1", [root]); await assert.rejects(() => derive(root,"copy",["Unmarked recreation"]), /choose recreate/);
    const recreated = (await derive(root,"recreate",["Recreated original"])).task_ids[0];
    assert.notEqual(recreated,root); assert.equal((await lineage(recreated)).outcome_id,root);
    await complete(recreated); await claim(await choose(recreated)); assert.equal(save.grants.length,1);
    await assert.rejects(() => admin.query("insert into tasks(id,user_id,title,status) values($1,$2,'Identity theft','todo')", [root,"00000000-0000-4000-8000-000000000071"]), /belongs to another account/);
  });
  let next;
  await check("an explicit new next step keeps its ancestry but receives a distinct opportunity", async () => {
    next = (await derive(children[0],"next_step",["Revise after feedback"])).task_ids[0];
    const row = await lineage(next); assert.equal(row.outcome_id,next); assert.equal(row.parent_task_id,children[0]);
    await complete(next); await claim(await choose(next)); assert.equal(save.grants.length,2); assert.equal(save.grants.at(-1).action_key, `task:${next}`);
  });
  await check("partial progress of a new outcome prevents another grant from its later full copy", async () => {
    await ageGrants(); const partial = (await derive(next,"next_step",["Plan another section"])).task_ids[0];
    await claim(await choose(partial,{scope:"chosen_step"}),{confirmed:true});
    const copy = (await derive(partial,"copy",["The same section now finished"])).task_ids[0]; await complete(copy); await claim(await choose(copy));
    assert.equal(save.grants.length,3); assert.equal((await admin.query("select status from tasks where id=$1",[partial])).rows[0].status,"todo");
  });
  await check("a Task linked to an acknowledged rest consumes all explicit copies of that outcome", async () => {
    await ageGrants(); const shared = (await derive(next,"next_step",["The same quiet break"])).task_ids[0];
    await run({kind:"select",source_kind:"rest",title:"A chosen rest"}); let rest = save.intentions.find(i=>i.status==="active" && i.source_kind==="rest");
    await run({kind:"evidence",action:"link",intention_id:rest.id,intention_version:rest.version,source_kind:"task",source_id:shared});
    rest=save.intentions.find(i=>i.id===rest.id); await claim(rest,{confirmed:true});
    const copy = (await derive(shared,"copy",["Another record of that break"])).task_ids[0]; await complete(copy); await claim(await choose(copy));
    assert.equal(save.grants.length,4); assert.equal(save.grants.at(-1).source_kind,"rest");
  });
  await check("a cap acknowledgement stays consumed across copied IDs after the cap expires", async () => {
    await ageGrants(); await admin.query("update garden_grants set issued_at=now() where id in (select id from garden_grants where user_id=$1 limit 2)",[account]);
    const capped = (await derive(next,"next_step",["Outcome at the rolling limit"])).task_ids[0]; await complete(capped); await claim(await choose(capped)); assert.equal(save.grants.length,4);
    await ageGrants(); const copy = (await derive(capped,"copy",["The same outcome after the limit"])).task_ids[0]; await complete(copy); await claim(await choose(copy)); assert.equal(save.grants.length,4);
  });
}
