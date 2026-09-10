import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { verifyPondBuildSources } from "./garden-pond-build-evidence.mjs";

export const base = process.env.GARDEN_VERIFY_URL ?? "http://127.0.0.1:3122";
export const day = new Date().toISOString().slice(0, 10);
export const accounts = { A: "00000000-0000-4000-8000-000000000071", B: "00000000-0000-4000-8000-000000000072" };

// PGlite exposes SQL DATE as a JS Date; PostgREST sends YYYY-MM-DD. Preserve the
// original repository's wire contract rather than introducing timestamp strings.
function sourceWireRow(row) {
  const value = { ...row };
  for (const field of ["completion_date", "entry_date"]) if (value[field] instanceof Date) value[field] = value[field].toISOString().slice(0, 10);
  return value;
}

export async function createPondFixture(output) {
  assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Fixture only supports a loopback preview");
  const build = await verifyPondBuildSources();
  const response = await fetch(`${base}/en/garden`, { redirect: "manual" });
  assert.equal(response.status, 307, "Production middleware must still protect the isolated preview");
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/build-sources.json`, JSON.stringify(build, null, 2));
  const { PGlite } = await import(process.env.GARDEN_VERIFY_PGLITE ?? "@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated;
    create table public.profiles(id uuid primary key references auth.users(id), timezone text default 'UTC');
    create table public.notification_preferences(user_id uuid primary key references auth.users(id), daily_summary boolean);
  `);
  await db.query("insert into auth.users values ($1),($2)", Object.values(accounts));
  await db.query("insert into public.profiles(id) values ($1),($2)", Object.values(accounts));
  await db.query("insert into public.notification_preferences values ($1,true),($2,true)", Object.values(accounts));
  await db.exec(await readFile("supabase/migrations/20260908061801_garden_adventure_world.sql", "utf8"));
  await db.query("update public.profiles set os_buddy_pet_id='doge',os_buddy_name='Mochi' where id=$1", [accounts.A]);
  await db.query("update public.profiles set os_buddy_name='Pip' where id=$1", [accounts.B]);
  await db.exec("update public.profiles set os_buddy_onboarding_completed=true");
  await db.exec(`
    alter table public.profiles enable row level security;
    create policy profile_owner on public.profiles for select to authenticated using (auth.uid()=id);
    alter table public.notification_preferences enable row level security;
    create policy notification_owner on public.notification_preferences for select to authenticated using (auth.uid()=user_id);
    grant select on public.profiles, public.notification_preferences to authenticated;
  `);
  await db.exec(`
    create table public.tasks(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),title text,description text,status text default 'todo',priority text default 'medium',project_id uuid,created_at timestamptz default now(),updated_at timestamptz default now(),completed_at timestamptz,due_date date,scheduled_date date,estimated_blocks integer,tags text[] default '{}',source text,source_url text,reminder_date timestamptz,category text,ai_generated boolean default false,ai_metadata jsonb,sort_order integer,calendar_event_id text,calendar_provider text);
    create table public.habits(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),name text,description text,type text default 'checkbox',target_value numeric,time_of_day text default 'anytime',color text,icon text,sort_order int default 0,archived_at timestamptz,frequency jsonb default '{"kind":"daily"}',created_at timestamptz default now()-interval '30 days',updated_at timestamptz default now(),is_active boolean default true);
    create table public.habit_completions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),habit_id uuid references public.habits(id) on delete cascade,completion_date date,status text,value numeric,note text,completed_at timestamptz default now(),unique(habit_id,completion_date));
    create table public.grateful_things(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),content text,entry_date date,created_at timestamptz default now());
    insert into public.tasks(id,user_id,title) values('00000000-0000-4000-8000-000000000081','${accounts.A}','Outline my next chapter');
    insert into public.habits(id,user_id,name) values('00000000-0000-4000-8000-000000000082','${accounts.A}','An afternoon walk');
    do $$ declare t text; begin
      foreach t in array array['tasks','habits','habit_completions','grateful_things'] loop
        execute format('alter table public.%I enable row level security',t);
        execute format('create policy source_owner on public.%I for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id)',t);
        execute format('grant select,insert,update,delete on public.%I to authenticated',t);
      end loop;
    end $$;
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/20260908162500_task_lineage.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20260908162634_garden_living_pond.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20260908172055_garden_pond_buddy.sql", import.meta.url), "utf8"));
  let lock = Promise.resolve();
  function asUser(userId, operation) {
    const job = lock.then(async () => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
      await db.exec("set role authenticated");
      return operation();
    });
    lock = job.catch(() => {}); return job;
  }
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const projectRef = JSON.parse(await readFile("package.json", "utf8")).scripts["db:link"]?.match(/--project-ref\s+(\S+)/)?.[1];
  async function open(viewport, { account = "A", dark = false, touch = false, noWebGL = false, locale = "en", empty = false, reduced = false, record = false, deferNavigation = false, automaticTimezone = false, activityDelayMs = 0, deviceTimezone, profileTimezone, everyOtherDayHabit = false, allowHabitWrites = false, allowTaskWrites = false } = {}) {
    const userId = accounts[account];
    if (automaticTimezone || profileTimezone || everyOtherDayHabit) {
      const setup = lock.then(async () => {
        await db.exec("reset role");
        if (automaticTimezone || profileTimezone) await db.query("update public.profiles set timezone=$2 where id=$1", [userId, profileTimezone ?? "auto"]);
        if (everyOtherDayHabit) {
          assert(deviceTimezone, "An interval-habit UI fixture needs its device calendar");
          await db.query("update public.habits set frequency='{\"kind\":\"every_n_days\",\"n\":2}',created_at=((now() at time zone $2)::date-4+time '12:00') at time zone $2 where user_id=$1", [userId, deviceTimezone]);
        }
      });
      lock = setup.catch(() => {}); await setup;
    }
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1, reducedMotion: reduced ? "reduce" : "no-preference", ...(deviceTimezone || automaticTimezone ? { timezoneId: deviceTimezone ?? "Pacific/Honolulu" } : {}), ...(record ? { recordVideo: { dir: `${output}/motion`, size: viewport } } : {}) });
    const user = { id: userId, email: "garden-preview@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
    const session = { access_token: token, refresh_token: "local-fixture", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user };
    await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: base }]);
    await context.addInitScript(({ dark, noWebGL, projectRef, userId, locale }) => {
      const mode = dark ? "dark" : "light";
      localStorage.setItem("mylifeos-theme", JSON.stringify({ uiTheme: "default", colorMode: mode, fontSize: "medium", widgetDensity: "comfortable", focusMode: false }));
      localStorage.setItem("mylifeos:settings-profile:v1", JSON.stringify({ id: userId, language: locale, onboarding_completed: true, theme: mode, ui_theme: "default", color_mode: mode }));
      const user = { id: userId, email: "garden-preview@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} };
      const payload = btoa(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).replaceAll("=", "");
      const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`, refresh_token: "local-fixture", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user };
      for (const ref of ["placeholder", projectRef].filter(Boolean)) document.cookie = `sb-${ref}-auth-token=base64-${btoa(JSON.stringify(session)).replaceAll("=", "")}; Path=/; SameSite=Lax`;
      window.__gardenAudioNotes = 0;
      window.__gardenAudioContexts = [];
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        constructor(...args) { super(...args); window.__gardenAudioContexts.push(this); }
      };
      window.__gardenSvgInvalid = [];
      const setAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name, value) {
        if (this.namespaceURI === "http://www.w3.org/2000/svg" && String(value) === "undefined" && window.__gardenSvgInvalid.length < 12) {
          window.__gardenSvgInvalid.push({ name, tag: this.tagName, svg: this.closest("svg")?.outerHTML.slice(0, 1800), parent: this.closest("svg")?.parentElement?.outerHTML.slice(0, 2300), stack: new Error().stack });
        }
        return setAttribute.call(this, name, value);
      };
      const oscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function(...args) { window.__gardenAudioNotes++; return oscillator.apply(this, args); };
      Object.defineProperty(window, "__THREE_GAME_DIAGNOSTICS__", { get() {
        const canvas = document.querySelector('[data-testid="garden-canvas"] canvas');
        if (!canvas?.dataset.gardenDiagnostics) return null;
        const d = JSON.parse(canvas.dataset.gardenDiagnostics);
        return { renderer: { calls: d.calls, triangles: d.triangles, geometries: d.geometries, textures: d.textures }, ...d, physics: { engine: "custom-ground-circles", timestep: 1 / 60, colliders: 7, sensors: 0, ccdBodies: 0 } };
      } });
      if (noWebGL) { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/.test(type) ? null : original.call(this, type, ...args); }; }
    }, { dark, noWebGL, projectRef, userId, locale });
    const page = await context.newPage(); page.setDefaultTimeout(20_000);
    const errors = [], rendererErrors = [], writes = [];
    let failed = false, dropAfterWrite = false, delayPondReplyMs = 0;
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", message => { if (message.type() === "error" && /THREE|WebGL|shader|hydration/i.test(message.text()) && !(noWebGL && /Error creating WebGL context/.test(message.text()))) rendererErrors.push(message.text()); });
    await page.routeWebSocket("**/realtime/**", ws => ws.onMessage(() => {}));
    await page.route("**/auth/v1/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: userId, email: "garden-preview@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} }) }));
    let plant = empty ? null : { id: "garden-preview", user_id: userId, plant_type: "sunflower", growth_stage: 3, growth_points: 4, streak_days: 5, last_watered_at: null, planted_at: `${day}T12:00:00Z`, variant: "normal", is_wilted: false };
    const logs = [];
    await page.route("**/rest/v1/**", async route => {
      const req = route.request(), url = new URL(req.url()), table = url.pathname.split("/").at(-1), method = req.method();
      const single = (req.headers().accept ?? "").includes("application/vnd.pgrst.object+json");
      const fulfill = (data, status = 200, count) => route.fulfill({ status, contentType: "application/json", ...(count !== undefined ? { headers: { "content-range": `0-${Math.max(0, count - 1)}/${count}` } } : {}), body: method === "HEAD" ? "" : JSON.stringify(data) });
      try {
        if (table === "task_derive") {
          assert(allowTaskWrites && method === "POST", "Task writes must be explicitly enabled in this fixture");
          const input = req.postDataJSON();
          const value = await asUser(userId, async () => (await db.query("select public.task_derive($1,$2,$3,$4,$5::jsonb) value", [input.p_account,input.p_command_id,input.p_source_id,input.p_relation,JSON.stringify(input.p_titles)])).rows[0].value);
          writes.push({ table, command_id: input.p_command_id, relation: input.p_relation, task_ids: value.task_ids, replayed: value.replayed });
          if (dropAfterWrite) { dropAfterWrite = false; return route.abort("failed"); }
          return fulfill(value);
        }
        if (table === "task_lineage") {
          assert(method === "GET" || method === "HEAD");
          const source = url.searchParams.get("task_id");
          assert(source?.startsWith("eq."));
          const rows = await asUser(userId, async () => (await db.query("select task_id,user_id,outcome_id,parent_task_id,relation from task_lineage where user_id=$1 and task_id=$2", [userId,source.slice(3)])).rows);
          return fulfill(single ? rows[0] ?? null : rows);
        }
        if (table === "garden_pond_task_choices") {
          if (failed) return fulfill({ message: "Isolated network failure" }, 503);
          const input = req.postDataJSON();
          return fulfill(await asUser(userId, async () => (await db.query("select public.garden_pond_task_choices($1::uuid) value", [input.p_account])).rows[0].value));
        }
        if (table === "garden_pond_invitation") {
          if (failed) return fulfill({message:"Isolated network failure"},503);
          const input=req.postDataJSON();
          return fulfill(await asUser(userId,async()=>(await db.query("select public.garden_pond_invitation($1,$2::jsonb) value",[input.p_action,JSON.stringify(input.p_input)])).rows[0].value));
        }
        if (table === "garden_pond_command") {
          const input = req.postDataJSON();
          if (failed) return fulfill({ message: "Isolated network failure" }, 503);
          const value = await asUser(userId, async () => (await db.query("select public.garden_pond_command($1::uuid,$2::bigint,$3::jsonb) value", [input.p_command_id,input.p_revision,JSON.stringify(input.p_command)])).rows[0].value);
          writes.push({ table, command: input.p_command.kind, status: value.status });
          if(delayPondReplyMs && input.p_command.kind !== "read") { const delay=delayPondReplyMs; delayPondReplyMs=0; await new Promise(resolve=>setTimeout(resolve,delay)); }
          if (dropAfterWrite && input.p_command.kind !== "read") { dropAfterWrite = false; failed = true; return route.abort("failed"); }
          return fulfill(value);
        }
        if (["tasks","habits","habit_completions","grateful_things"].includes(table)) {
          if (table === "tasks" && method === "PATCH" && allowTaskWrites) {
            const id = url.searchParams.get("id"), input = req.postDataJSON();
            assert(id?.startsWith("eq."));
            assert(Object.keys(input).every(key => ["status","completed_at","updated_at","title"].includes(key)));
            const fields = Object.keys(input), values = [userId,id.slice(3),...Object.values(input)];
            const rows = await asUser(userId, async () => (await db.query(`update tasks set ${fields.map((field,index)=>`${field}=$${index+3}`).join(",")} where user_id=$1 and id=$2 returning *`, values)).rows);
            writes.push({table,method,id:id.slice(3),...input});
            return fulfill(single ? rows[0] ?? null : rows);
          }
          if (table === "habit_completions" && method === "DELETE" && allowHabitWrites) {
            const habit = url.searchParams.get("habit_id"), date = url.searchParams.get("completion_date");
            assert(habit?.startsWith("eq.") && date?.startsWith("eq."), "Original Habit undo must target an explicit occurrence");
            await asUser(userId, () => db.query("delete from habit_completions where user_id=$1 and habit_id=$2 and completion_date=$3::date", [userId,habit.slice(3),date.slice(3)]));
            writes.push({ table, method, completion_date: date.slice(3), habit_id: habit.slice(3) });
            return fulfill([]);
          }
          if (table === "habit_completions" && method === "POST" && allowHabitWrites) {
            const input = req.postDataJSON();
            assert.equal(input.user_id, userId, "The original Habit repository must send its signed-in account");
            assert.equal(url.searchParams.get("on_conflict"), "habit_id,completion_date");
            assert(Object.keys(input).every(key => ["user_id","habit_id","completion_date","status","value","note","completed_at"].includes(key)));
            const row = await asUser(userId, async () => {
              assert.equal((await db.query("select count(*)::int n from habits where id=$1 and user_id=$2", [input.habit_id,userId])).rows[0].n, 1);
              return (await db.query("insert into habit_completions(user_id,habit_id,completion_date,status,value,note,completed_at) values($1,$2,$3::date,$4,$5,$6,$7::timestamptz) on conflict(habit_id,completion_date) do update set status=excluded.status,value=excluded.value,note=excluded.note,completed_at=excluded.completed_at returning *", [userId,input.habit_id,input.completion_date,input.status,input.value,input.note,input.completed_at])).rows[0];
            });
            writes.push({ table, method, completion_date: input.completion_date, habit_id: input.habit_id });
            return fulfill(single ? sourceWireRow(row) : [sourceWireRow(row)], 201);
          }
          assert(method === "GET" || method === "HEAD", "Use the explicitly isolated source-write helper");
          let rows = await asUser(userId, async () => {
            const conditions = ["user_id=$1"], values = [userId];
            const fields = table === "habit_completions" ? ["id","habit_id","completion_date"] : ["id"];
            for (const field of fields) for (const value of url.searchParams.getAll(field)) {
              const match = /^(eq|gte|lte)\.(.+)$/.exec(value);
              if (match) { values.push(match[2]); conditions.push(`${field}${({ eq: "=", gte: ">=", lte: "<=" })[match[1]]}$${values.length}`); }
            }
            return (await db.query(`select * from public.${table} where ${conditions.join(" and ")}`, values)).rows;
          });
          rows = rows.map(sourceWireRow);
          const select = url.searchParams.get("select");
          if (["id,title,status,project_id", "id,name", "id,created_at"].includes(select)) {
            if (url.searchParams.get("status") === "neq.done") rows = rows.filter(row => row.status !== "done");
            rows = rows.map(row => Object.fromEntries(select.split(",").map(key => [key, row[key]])));
          }
          return fulfill(single ? rows[0] ?? null : rows,200,rows.length);
        }
        if (table === "garden_adventure_action") {
          const input = req.postDataJSON();
          if (failed) return fulfill({ message: "Isolated network failure" }, 503);
          const value = await asUser(userId, async () => (await db.query("select public.garden_adventure_action($1::date,$2,$3::jsonb) as value", [input.p_day, input.p_action, JSON.stringify(input.p_value ?? {})])).rows[0].value);
          writes.push({ table, action: input.p_action, result: value.stamps });
          if (dropAfterWrite) { dropAfterWrite = false; failed = true; return route.abort("failed"); }
          return fulfill(value);
        }
        if (table === "garden_adventure_events" || table === "garden_adventure_settings") {
          if (failed) return fulfill({ message: "Isolated network failure" }, 503);
          assert(method === "GET" || method === "HEAD", "Direct writes must use the RPC");
          const rows = await asUser(userId, async () => {
            const conditions = ["user_id=$1"], values = [userId];
            for (const field of ["day", "action"]) if (url.searchParams.get(field)?.startsWith("eq.")) { values.push(url.searchParams.get(field).slice(3)); conditions.push(`${field}=$${values.length}`); }
            return (await db.query(`select * from public.${table} where ${conditions.join(" and ")}`, values)).rows;
          });
          return fulfill(single ? rows[0] ?? null : rows, 200, rows.length);
        }
        if (table === "profiles") {
          const profile = await asUser(userId, async () => (await db.query("select * from public.profiles where id=$1", [userId])).rows[0]);
          const row = { ...profile, language: locale, full_name: "Garden preview", onboarding_completed: true, theme: dark ? "dark" : "light", ui_theme: "default", color_mode: dark ? "dark" : "light", font_size_pref: "medium", widget_density: "comfortable", focus_mode: false };
          return fulfill(single ? row : [row]);
        }
        if (table === "notification_preferences") {
          const rows = await asUser(userId, async () => (await db.query("select * from public.notification_preferences")).rows);
          return fulfill(single ? rows[0] : rows);
        }
        let rows = [];
        if (method !== "GET" && method !== "HEAD") {
          writes.push({ table, method });
          if (table === "user_garden") { if (method === "DELETE") plant = null; else plant = { ...(plant ?? { id: "garden-preview", user_id: userId, growth_stage: 1, growth_points: 0, streak_days: 0, variant: "normal", last_watered_at: null }), ...req.postDataJSON() }; }
          else if (table === "garden_daily_log") { const record = req.postDataJSON(); const previous = logs.find(l => l.log_date === record.log_date); if (previous) Object.assign(previous, record); else logs.push(record); }
          else if (table !== "plant_collection") return fulfill({ message: "Unexpected fixture write blocked" }, 403);
        }
        if (table === "user_garden") rows = plant ? [plant] : [];
        if (table === "garden_daily_log") rows = logs;
        if (["tasks", "journal_entries", "habit_completions"].includes(table) && url.searchParams.get("select") === "id") {
          if (activityDelayMs) await new Promise(resolve => setTimeout(resolve, activityDelayMs));
          rows = empty ? [] : [{ id: "completed-life-action" }];
        }
        if (table === "plant_collection") rows = empty ? [] : ["grass", "lily", "orchid"].map((type, i) => ({ id: `flower-${i}`, user_id: userId, plant_type: type, variant: "normal", bloom_date: day, harvested_at: `${day}T10:00:00Z`, streak_days: 7 }));
        if (table === "focus_preferences") rows = [{ id: "focus-preview", user_id: userId, reality_mode: "normal" }];
        return fulfill(single ? rows[0] ?? null : rows, 200, rows.length);
      } catch (error) { return fulfill({ message: error.message, code: error.code }, 400); }
    });
    await page.route("**/api/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await page.route(`${base}/**`, route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (path === "/favicon.ico" || (/^\/(en|zh-hk)\/(?!(?:garden|dashboard|habits|tasks)(?:\/|$))/.test(path) && !req.isNavigationRequest())) return route.fulfill({ status: 204 });
      return route.fallback();
    });
    if (!deferNavigation) {
      await page.goto(`${base}/${locale === "zh-TW" ? "zh-hk" : locale}/garden`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      try { await page.getByTestId("garden-adventure").waitFor({ timeout: 30_000 }); await page.locator("[data-garden-enter]:enabled").waitFor({ timeout: 30_000 }); }
      catch (error) { await writeFile(`${output}/startup-failure.json`, JSON.stringify({ url: page.url(), errors, body: (await page.locator("body").innerText()).slice(0, 1800) })); throw error; }
    }
    return { page, context, errors, rendererErrors, writes, fail: () => { failed = true; }, recover: () => { failed = false; }, loseNextResponse: () => { dropAfterWrite = true; }, delayNextPondReply: (ms) => { delayPondReplyMs=ms; } };
  }
  return { open, browser, db,
    pondStepState: () => asUser(accounts.A, async () => (await db.query("select jsonb_build_object('intentions',(select jsonb_agg(to_jsonb(i)) from garden_life_intentions i),'evidence_links',(select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from garden_evidence_links l),'grants',(select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) from garden_grants g),'task_status',(select status from tasks where id='00000000-0000-4000-8000-000000000081'),'objects',(select state->'objects' from garden_worlds where user_id=$1)) value", [accounts.A])).rows[0].value),
    renameTask: (title) => asUser(accounts.A, () => db.query("update tasks set title=$1 where id='00000000-0000-4000-8000-000000000081'", [title])),
    deleteTask: () => asUser(accounts.A, () => db.query("delete from tasks where id='00000000-0000-4000-8000-000000000081'")),
    completeTask: () => asUser(accounts.A, () => db.query("update tasks set status='done',completed_at=now() where id='00000000-0000-4000-8000-000000000081'")),
    // The source module saves an explicit calendar occurrence, never the database's session date.
    completeHabit: (occurrence) => {
      assert(/^\d{4}-\d{2}-\d{2}$/.test(occurrence), "Specify the source Habit occurrence");
      return asUser(accounts.A, () => db.query("insert into habit_completions(user_id,habit_id,completion_date,status) values($1,'00000000-0000-4000-8000-000000000082',$2::date,'done')", [accounts.A, occurrence]));
    },
    readyPondGrowth: async () => {
      const job=lock.then(async()=>{
        await db.exec("reset role");
        await db.query("update garden_worlds set state=jsonb_set(jsonb_set(state,'{fish_adult}','false'::jsonb),'{fish_ready_at}',to_jsonb(now()-interval '1 hour')) where user_id=$1",[accounts.A]);
        await db.query("update garden_adventure_settings set quiet_start=(extract(hour from now() at time zone 'UTC')::int+2)%24,quiet_end=(extract(hour from now() at time zone 'UTC')::int+3)%24 where user_id=$1",[accounts.A]);
      });
      lock=job.catch(()=>{}); return job;
    },
    invitationRows: () => asUser(accounts.A,()=>db.query("select * from garden_invitation_deliveries where user_id=$1",[accounts.A])),
    saveGratitude: () => asUser(accounts.A, () => db.query("insert into grateful_things(user_id,content,entry_date) values($1,'Private fixture gratitude',current_date) returning id",[accounts.A])),
    close: async () => { await browser.close(); await db.close(); } };
}
