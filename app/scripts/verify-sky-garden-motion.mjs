import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {createGardenFixture} from "./sky-garden-fixture.mjs";
const out=process.env.SKY_VERIFY_OUT??"../artifacts/sky-garden/motion",fixture=await createGardenFixture(out),evidence=[];
try {
 await mkdir(out,{recursive:true});const test=await fixture.open({width:1440,height:900},{record:true}),p=test.page;
 await p.getByRole("button",{name:"Enter Garden",exact:true}).click();
 await p.getByRole("button",{name:"Garden settings",exact:true}).click();await p.getByLabel("Time of day",{exact:true}).selectOption("day");await p.getByLabel("Garden weather",{exact:true}).selectOption("clear");await p.getByRole("button",{name:"Close menu and resume",exact:true}).click();
 await p.mouse.move(700,400);await p.mouse.wheel(0,-850);await p.waitForTimeout(700);
 const diag=()=>p.locator("canvas[data-garden-diagnostics]").evaluate(el=>JSON.parse(el.dataset.gardenDiagnostics));
 async function visit(kind,id){await p.getByRole("button",{name:"Map & field notes",exact:true}).click();await p.getByTestId(`garden-destination-${kind}-${id}`).click();await p.waitForFunction(()=>window.__THREE_GAME_TEST_HOOKS__.snapshot().target===null);await p.waitForTimeout(200);}
 async function action(name){await p.getByTestId("garden-action").click();await p.waitForFunction(()=>{const d=window.__THREE_GAME_DIAGNOSTICS__;return d?.motion?.progress>.52&&d.motion.progress<.75;});const d=await diag();evidence.push({action:name,...d.motion});await p.screenshot({path:`${out}/${name}.png`});await p.waitForFunction(()=>window.__THREE_GAME_TEST_HOOKS__.snapshot().action===null);await p.waitForTimeout(160);if(["plant","forage","harvest"].includes(name))assert(d.motion.handError<.14,`${name}: hand miss ${d.motion.handError}`);}
 await visit("bed",0);await action("plant");await action("water");await visit("forage",1);await action("forage");await visit("well","well");await action("refill");await visit("landmark","pond");await action("discover");await visit("shelter","shelter");await action("shelter");
 await visit("bed",0);await p.waitForFunction(()=>window.__THREE_GAME_TEST_HOOKS__.snapshot().beds[0].stage==="ripe");await action("harvest");
 await p.locator('[data-garden-controls]').focus();await p.keyboard.down("w");await p.waitForTimeout(500);await p.screenshot({path:`${out}/walk.png`});await p.keyboard.up("w");await p.waitForTimeout(400);await p.screenshot({path:`${out}/idle.png`});
 const gpu=await p.locator("canvas[data-garden-diagnostics]").evaluate(el=>{const gl=el.getContext("webgl2"),ext=gl?.getExtension("WEBGL_debug_renderer_info");return ext?{renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),vendor:gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)}:null;});
 assert.deepEqual(test.errors,[]);assert.deepEqual(test.rendererErrors,[]);await test.context.close();await writeFile(`${out}/results.json`,JSON.stringify({execution:"real UI actions and unpaused video in local fixture world",evidence,gpu,passed:true},null,2));
}catch(error){for(const c of fixture.browser.contexts())for(const p of c.pages()){await p.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.txt`,error.stack);}throw error;}finally{await fixture.close();}
console.log(evidence);
