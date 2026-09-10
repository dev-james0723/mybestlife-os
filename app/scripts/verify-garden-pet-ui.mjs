import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {createGardenFixture,base} from "./sky-garden-fixture.mjs";
import {petGlbFixture} from "./garden-pet-glb-fixture.mjs";
const out=process.env.SKY_VERIFY_OUT??"../artifacts/sky-garden/pets",fixture=await createGardenFixture(out),glb=await petGlbFixture(),checks=[];
const id="10000000-0000-4000-8000-000000000001",photo=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=","base64");
try {
 await mkdir(out,{recursive:true});const test=await fixture.open({width:1440,height:900},{deferNavigation:true});const p=test.page;let status=null,requested=0;
 await p.route("**/api/garden/pets",async route=>{
  if(route.request().method()==="POST"){if(route.request().headers()["content-type"]?.includes("application/json")){if(status==="generating"&&requested++>0)status="ready";}else status="generating";return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({id})});}
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({available:true,generationAvailable:true,pets:status?[{id,name:"Fixture Violet",status,progress:status==="ready"?100:60,photoUrl:`${base}/pet-fixture.png`,modelUrl:status==="ready"?`${base}/pet-fixture.glb`:null,message:status==="failed"?"Fixture provider failure":null,createdAt:new Date().toISOString()}]:[]})});
 });
 await p.route("**/pet-fixture.png",r=>r.fulfill({contentType:"image/png",body:photo}));await p.route("**/pet-fixture.glb",r=>r.fulfill({contentType:"model/gltf-binary",body:glb}));
 await p.goto(`${base}/en/garden`);await p.getByRole("button",{name:"Enter Garden",exact:true}).click();await p.getByRole("button",{name:"Garden settings",exact:true}).click();
 await p.getByLabel("Pet name",{exact:true}).fill("Fixture Violet");await p.getByLabel(/Pet photo ·/).setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:photo});
 await p.getByLabel("I own this photo and agree to send it for 3D generation.",{exact:true}).check();await p.getByRole("button",{name:"Create my 3D pet",exact:true}).click();await p.getByText("Creating 3D model… · 60%",{exact:true}).waitFor();
 checks.push("submit photo and immediately display background progress - provider fixture");await p.screenshot({path:`${out}/generating.png`});
 await p.getByRole("button",{name:"Refresh model status",exact:true}).click();await p.getByText("Ready to accompany you",{exact:true}).waitFor();
 await p.getByRole("button",{name:"Preview 3D",exact:true}).click();await p.getByRole("img",{name:/Fixture Violet · 3D preview/}).locator("canvas").waitFor();await p.waitForTimeout(1500);await p.screenshot({path:`${out}/preview.png`});
 await p.getByRole("button",{name:"Bring along",exact:true}).click();assert.equal(await p.getByLabel("Garden companion",{exact:true}).inputValue(),`custom:${id}`);
 await p.getByRole("button",{name:"Close menu and resume",exact:true}).click();await p.waitForTimeout(1800);
 const d=await p.locator("canvas[data-garden-diagnostics]").evaluate(el=>JSON.parse(el.dataset.gardenDiagnostics));assert.equal(d.companion.personal,true);assert.equal(d.companion.loaded,true);
 await p.screenshot({path:`${out}/custom-model-in-world.png`});await p.reload();await p.getByRole("button",{name:"Enter Garden",exact:true}).click();await p.waitForTimeout(1800);assert.equal((await p.locator("canvas[data-garden-diagnostics]").evaluate(el=>JSON.parse(el.dataset.gardenDiagnostics))).companion.personal,true);
 checks.push("load an actual validated GLB in 3D preview and live world","ready companion selection survives reload");
 await p.getByRole("button",{name:"Garden settings",exact:true}).click();status="failed";await p.getByRole("button",{name:"Refresh model status",exact:true}).click();await p.getByText("Could not finish",{exact:true}).waitFor();assert.equal(await p.getByRole("button",{name:"Bring along",exact:true}).count(),0);await p.screenshot({path:`${out}/failed.png`});checks.push("provider failure cannot be selected as ready");
 assert.deepEqual(test.errors,[]);assert.deepEqual(test.rendererErrors,[]);await test.context.close();
 await writeFile(`${out}/results.json`,JSON.stringify({execution:"UI/provider fixtures; real GLB loader and authored fixture animal. No personal photo or external generation job submitted.",checks,passed:true},null,2));
}catch(error){for(const c of fixture.browser.contexts())for(const p of c.pages()){await p.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.txt`,`${error.stack}\n${await p.locator("body").innerText().catch(()=>"")}`);}throw error;}finally{await fixture.close();}
console.log(checks);
