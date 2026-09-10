import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createGardenFixture, accounts } from "./sky-garden-fixture.mjs";

const output=process.env.SKY_VERIFY_OUT??"../artifacts/sky-garden/smoke-1";
await mkdir(output,{recursive:true});
const fixture=await createGardenFixture(output);
const results={execution:"local browser with isolated PostgreSQL/auth fixtures",captures:[],checks:[]};
try {
  const opened=await fixture.open({width:1440,height:900},{record:true});
  const {page}=opened;
  await page.getByRole("button",{name:"Enter Garden",exact:true}).click();
  await page.getByRole("button",{name:"Garden settings",exact:true}).click();
  await page.getByLabel("Time of day",{exact:true}).selectOption("day");
  await page.getByLabel("Garden weather",{exact:true}).selectOption("clear");
  await page.getByRole("button",{name:"Close menu and resume",exact:true}).click();
  await page.waitForTimeout(2200);
  const diagnostics=()=>page.locator("canvas[data-garden-diagnostics]").evaluate(el=>JSON.parse(el.dataset.gardenDiagnostics));
  assert.equal((await diagnostics()).version,3);
  await page.screenshot({path:`${output}/desktop-day.png`});
  results.captures.push("desktop-day.png");
  await page.getByRole("button",{name:"Hide interface",exact:true}).click();
  assert.equal(await page.getByRole("button",{name:"Show interface",exact:true}).isVisible(),true);
  assert.equal(await page.locator('[data-garden-controls] header').isVisible(),false);
  await page.screenshot({path:`${output}/desktop-clean.png`});
  results.captures.push("desktop-clean.png");
  await page.getByRole("button",{name:"Show interface",exact:true}).click();
  await page.getByRole("button",{name:"Garden settings",exact:true}).click();
  await page.getByLabel("Time of day",{exact:true}).selectOption("night");
  await page.getByRole("button",{name:"Close menu and resume",exact:true}).click();
  await page.waitForTimeout(3000);
  await page.screenshot({path:`${output}/desktop-night.png`});
  results.captures.push("desktop-night.png");
  for(const [time,weather] of [["dawn","clear"],["dusk","cloudy"],["day","rain"]]) {
    await page.getByRole("button",{name:"Garden settings",exact:true}).click();
    await page.getByLabel("Time of day",{exact:true}).selectOption(time);
    await page.getByLabel("Garden weather",{exact:true}).selectOption(weather);
    await page.getByRole("button",{name:"Close menu and resume",exact:true}).click();await page.waitForTimeout(2300);
    await page.screenshot({path:`${output}/desktop-${time}-${weather}.png`});results.captures.push(`desktop-${time}-${weather}.png`);
  }
  await page.getByRole("button",{name:"Garden settings",exact:true}).click();
  await page.getByLabel("Observation mode · camera only",{exact:true}).check();
  await page.getByRole("button",{name:"Close menu and resume",exact:true}).click();
  assert.equal(await page.getByLabel("Move joystick",{exact:true}).isVisible(),false);
  const beforeObserve=(await diagnostics()).player;
  await page.locator('[data-garden-controls]').focus();await page.keyboard.down("w");await page.waitForTimeout(400);await page.keyboard.up("w");
  assert.deepEqual((await diagnostics()).player,beforeObserve);
  await page.screenshot({path:`${output}/desktop-observation.png`});results.captures.push("desktop-observation.png");
  results.checks.push("dawn, dusk and rain views","observation mode keeps camera controls and pauses player movement");
  results.diagnostics=await diagnostics();
  results.errors=opened.errors; results.rendererErrors=opened.rendererErrors;
  assert.deepEqual(opened.errors,[]);assert.deepEqual(opened.rendererErrors,[]);
  results.checks.push("real entry","settings persist into scene","hide/show HUD","day/night render");
  await opened.context.close();
} catch(error) {
  results.error=error.stack;
  for(const c of fixture.browser.contexts()) for(const p of c.pages()) {
    await p.screenshot({path:`${output}/failure.png`}).catch(()=>{});
    results.body=(await p.locator("body").innerText().catch(()=>"")).slice(-7000);
  }
  throw error;
} finally {
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
  await fixture.close();
}
console.log(JSON.stringify(results,null,2));
