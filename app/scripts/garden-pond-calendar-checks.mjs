import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function runPondCalendarChecks({ admin, connection, command, check }) {
  const deviceZone = "Pacific/Honolulu", worldZone = "Pacific/Kiritimati";
  const calendar = async timezone => ({ timezone, date: (await admin.query("select (now() at time zone $1)::date::text as occurrence_day", [timezone])).rows[0].occurrence_day });
  async function scenario() {
    const account = randomUUID(), habit = randomUUID();
    await admin.query("insert into auth.users values($1)", [account]);
    await admin.query("insert into profiles(id,timezone) values($1,$2)", [account, worldZone]);
    await admin.query("insert into notification_preferences values($1,false)", [account]);
    // Local noon four days ago has a different creation calendar date in the world zone.
    await admin.query("insert into habits(id,user_id,frequency,created_at,is_active) values($1,$2,'{\"kind\":\"every_n_days\",\"n\":2}',((now() at time zone $3)::date-4+time '12:00') at time zone $3,true)", [habit, account, deviceZone]);
    const client = await connection(account);
    let save = (await command(client, { kind: "read" }, 0, randomUUID(), account)).save;
    const run = async (payload, id = randomUUID()) => {
      const result = await command(client, payload, save.world.revision, id, account);
      assert.equal(result.status, "ok"); save = result.save; return result;
    };
    await run({ kind: "connections", modules: ["habit", "rest"] });
    const select = async (sourceCalendar) => {
      sourceCalendar ??= await calendar(deviceZone);
      await run({ kind: "select", source_kind: "habit", source_id: habit, title: "Walk in my Habits calendar", source_calendar: sourceCalendar });
      return save.intentions.find(value => value.status === "active");
    };
    const done = date => admin.query("insert into habit_completions values($1,$2,$3,$4,'done')", [randomUUID(), account, habit, date]);
    const claim = (step, extra = {}) => run({ kind: "claim", intention_id: step.id, intention_version: step.version, ...extra });
    return { account, habit, client, run, select, done, claim, get save() { return save; } };
  }

  await check("habit calendars follow the source date across the date line and both DST transitions", async () => {
    for (const [instant, timezone, date] of [
      ["2026-09-09T02:00:00Z", deviceZone, "2026-09-08"],
      ["2026-09-09T02:00:00Z", worldZone, "2026-09-09"],
      ["2026-03-08T06:59:00Z", "America/New_York", "2026-03-08"],
      ["2026-03-08T07:01:00Z", "America/New_York", "2026-03-08"],
      ["2026-11-01T05:30:00Z", "America/New_York", "2026-11-01"],
      ["2026-11-01T06:30:00Z", "America/New_York", "2026-11-01"],
    ]) {
      const result = (await admin.query("select occurrence::text,timezone from private.garden_habit_calendar($1::jsonb,'UTC',$2::timestamptz)", [JSON.stringify({ timezone, date }), instant])).rows[0];
      assert.deepEqual(result, { occurrence: date, timezone });
    }
  });
  await check("a saved every-other-day Habit in the device calendar grants once without changing the world timezone", async () => {
    const s = await scenario(), expected = await calendar(deviceZone), step = await s.select(expected);
    assert.equal(step.occurrence, expected.date); assert.equal(step.zone_at_selection, deviceZone);
    assert.notEqual(step.occurrence, (await calendar(worldZone)).date);
    await s.done(expected.date); await s.claim(step);
    assert.equal(s.save.grants.length, 1); assert.equal(s.save.timezone, worldZone);
  });
  await check("wrong occurrence source facts cannot confirm a selected Habit", async () => {
    const s = await scenario(), step = await s.select();
    await s.done((await calendar(worldZone)).date);
    assert.equal((await admin.query("select count(*)::int n from garden_source_receipts where user_id=$1", [s.account])).rows[0].n, 1, "The source write is a fact, not an award");
    await assert.rejects(() => s.claim(step), /Save this action in its life module first/);
    assert.equal(s.save.grants.length, 0);
    await s.done(step.occurrence); await s.claim(step); assert.equal(s.save.grants.length, 1);
  });
  await check("travel and schedule edits preserve an already chosen Habit occurrence and its original calendar", async () => {
    const s = await scenario(), step = await s.select();
    await admin.query("update habits set frequency=jsonb_build_object('kind','weekdays','days',jsonb_build_array((extract(dow from $2::date)::int+1)%7)) where id=$1", [s.habit, step.occurrence]);
    await s.run({ kind: "intention", action: "revise", intention_id: step.id, intention_version: step.version, source_kind: "habit", source_id: s.habit, title: "Continue my chosen walk", planned_for: "2026-12-15", source_calendar: await calendar(worldZone) });
    const revised = s.save.intentions.find(value => value.id === step.id);
    assert.equal(revised.occurrence, step.occurrence); assert.equal(revised.zone_at_selection, deviceZone);
    await s.done(step.occurrence); await s.claim(revised); assert.equal(s.save.grants.length, 1);
    await assert.rejects(() => s.select(), /not scheduled/);
  });
  await check("saved midnight Habit work remains eligible when it is chosen after the Garden four-hour boundary", async () => {
    const s = await scenario();
    const zone = (await admin.query("select zone from unnest(array['UTC','Asia/Tokyo','Pacific/Honolulu']) zone where extract(hour from now() at time zone zone)>=6 limit 1")).rows[0].zone;
    await admin.query("update habits set frequency='{\"kind\":\"daily\"}' where id=$1", [s.habit]);
    const step = await s.select(await calendar(zone));
    await s.done(step.occurrence);
    // Simulate an actual earlier check-in and later selection, both earlier than server now.
    await admin.query("update garden_source_receipts set first_observed_at=($2::date+time '00:30') at time zone $3 where user_id=$1", [s.account, step.occurrence, zone]);
    await admin.query("update garden_life_intentions set selected_at=($2::date+time '05:00') at time zone $3 where id=$1", [step.id, step.occurrence, zone]);
    await s.claim(step); assert.equal(s.save.grants.length, 1);
  });
  await check("stale offline dates, unknown zones and caller-supplied clocks are rejected without selecting or granting", async () => {
    const s = await scenario();
    await assert.rejects(() => s.select({ date: "2001-01-01", timezone: deviceZone }), /habit day changed/);
    await assert.rejects(() => s.select({ date: "2026-09-08", timezone: "Not/A_Zone" }), /Unknown habit timezone/);
    await assert.rejects(async () => s.select({ ...await calendar(deviceZone), now: "2001-01-01" }), /valid habit calendar/);
    await assert.rejects(() => s.client.query("select * from private.garden_habit_calendar(null,'UTC','2001-01-01')"), /permission denied/);
    assert.equal(s.save.intentions.length, 0); assert.equal(s.save.grants.length, 0);
  });
  await check("linked Habit records keep their device date and timezone aliases cannot reward the same occurrence twice", async () => {
    const s = await scenario();
    await s.run({ kind: "select", source_kind: "rest", title: "One shared walk" });
    let step = s.save.intentions.find(value => value.status === "active");
    const payload = { kind: "evidence", action: "link", intention_id: step.id, intention_version: step.version, source_kind: "habit", source_id: s.habit, source_calendar: await calendar(deviceZone) }, id = randomUUID();
    await s.run(payload, id); await s.run(payload, id);
    const link = s.save.evidence_links.find(value => !value.is_primary);
    assert.equal(link.occurrence, payload.source_calendar.date); assert.equal(link.zone_at_link, deviceZone);
    assert.equal(s.save.evidence_links.length, 2);
    step = s.save.intentions.find(value => value.id === step.id);
    await s.done(link.occurrence); await s.claim(step, { link_id: link.id });
    const repeated = await s.select(await calendar("US/Hawaii")); await s.claim(repeated);
    assert.equal(s.save.grants.length, 1);
    assert.equal(s.save.intentions.find(value => value.id === repeated.id).status, "acknowledged_without_grant");
  });
  await check("legacy pending Habit commands still select the world-calendar date", async () => {
    const s = await scenario();
    await admin.query("update habits set frequency='{\"kind\":\"daily\"}' where id=$1", [s.habit]);
    await s.run({ kind: "select", source_kind: "habit", source_id: s.habit, title: "Older pending choice" });
    const step = s.save.intentions[0];
    assert.equal(step.occurrence, (await calendar(worldZone)).date); assert.equal(step.zone_at_selection, worldZone);
    await assert.rejects(async () => s.run({ kind: "select", source_kind: "rest", title: "No calendar for rest", source_calendar: await calendar(deviceZone) }), /habit calendar belongs/);
  });
}
