import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

export const base = process.env.GARDEN_VERIFY_URL ?? "http://127.0.0.1:3100";
export const day = new Date().toISOString().slice(0, 10);
export const accounts = { A: "00000000-0000-4000-8000-000000000071", B: "00000000-0000-4000-8000-000000000072" };

export async function createGardenFixture(output) {
  assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Fixture only supports a loopback preview");
  const response = await fetch(`${base}/en/garden`, { redirect: "manual" });
  assert.equal(response.status, 307, "Production middleware must still protect the isolated preview");
  await mkdir(output, { recursive: true });
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
  async function open(viewport, { account = "A", dark = false, touch = false, noWebGL = false, locale = "en", empty = false, reduced = false, record = false, deferNavigation = false, automaticTimezone = false, activityDelayMs = 0 } = {}) {
    const userId = accounts[account];
    if (automaticTimezone) {
      const setup = lock.then(async () => { await db.exec("reset role"); await db.query("update public.profiles set timezone='auto' where id=$1", [userId]); });
      lock = setup.catch(() => {}); await setup;
    }
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1, reducedMotion: reduced ? "reduce" : "no-preference", ...(automaticTimezone ? { timezoneId: "Pacific/Honolulu" } : {}), ...(record ? { recordVideo: { dir: `${output}/motion`, size: viewport } } : {}) });
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
    let failed = false, dropAfterWrite = false;
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
      } catch (error) { return fulfill({ message: error.message }, 400); }
    });
    await page.route("**/api/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await page.route(`${base}/**`, route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (path === "/favicon.ico" || (/^\/(en|zh-hk)\/(?!(?:garden|dashboard)(?:\/|$))/.test(path) && !req.isNavigationRequest())) return route.fulfill({ status: 204 });
      return route.fallback();
    });
    if (!deferNavigation) {
      await page.goto(`${base}/${locale === "zh-TW" ? "zh-hk" : locale}/garden`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      try { await page.getByTestId("garden-adventure").waitFor({ timeout: 30_000 }); await page.locator("[data-garden-enter]:enabled").waitFor({ timeout: 30_000 }); }
      catch (error) { await writeFile(`${output}/startup-failure.json`, JSON.stringify({ url: page.url(), errors, body: (await page.locator("body").innerText()).slice(0, 1800) })); throw error; }
    }
    return { page, context, errors, rendererErrors, writes, fail: () => { failed = true; }, recover: () => { failed = false; }, loseNextResponse: () => { dropAfterWrite = true; } };
  }
  return { open, browser, db, close: async () => { await browser.close(); await db.close(); } };
}
