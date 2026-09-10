import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGardenFixture } from './sky-garden-fixture.mjs';
const out='../artifacts/garden-contact-fix';
await mkdir(out,{recursive:true});
const fixture=await createGardenFixture(out), results=[];
try {
 for(const mobile of [false,true]) {
  const test=await fixture.open(mobile?{width:390,height:844}:{width:1440,height:900},{touch:mobile,account:mobile?'B':'A'});
  const p=test.page, mode=mobile?'phone':'desktop';
  await p.getByRole('button',{name:'Enter Garden',exact:true}).click();
  await p.getByRole('button',{name:'Garden settings',exact:true}).click();
  await p.getByLabel('Time of day',{exact:true}).selectOption('day');
  await p.getByLabel('Garden weather',{exact:true}).selectOption('clear');
  await p.getByRole('button',{name:'Close menu and resume',exact:true}).click();
  async function visitBed(){
   await p.getByRole('button',{name:'Map & field notes',exact:true}).click();
   await p.getByTestId('garden-destination-bed-0').click();
   await p.waitForFunction(()=>window.__THREE_GAME_TEST_HOOKS__.snapshot().target===null);
  }
  await visitBed();
  await p.mouse.move(mobile?190:760,mobile?330:430); await p.mouse.wheel(0,-650);
  for(let i=0;i<4;i++)await p.getByRole('button',{name:'Zoom in',exact:true}).click();
  await p.locator('[data-garden-controls]').focus();
  if(mobile){
   const b=await p.getByRole('button',{name:'Move joystick',exact:true}).boundingBox();
   assert(b); await p.mouse.move(b.x+b.width/2,b.y+b.height/2); await p.mouse.down();
   const yaw=await p.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__.camera.yaw);
   await p.mouse.move(b.x+b.width/2+Math.sin(yaw)*b.width*.4,b.y+b.height/2-Math.cos(yaw)*b.height*.4);
  }else{await p.keyboard.down('w');await p.keyboard.down('d');await p.keyboard.down('Shift');}
  const samples=[];
  for(let i=0;i<8;i++){
   await p.waitForTimeout(60);
   const s=await p.evaluate(()=>window.__THREE_GAME_TEST_HOOKS__.snapshot());
   const b=s.beds[0],dx=Math.max(0,Math.abs(s.player.x-b.x)-.985),dz=Math.max(0,Math.abs(s.player.z-b.z)-.785);
   assert(Math.hypot(dx,dz)>=.459,'feet entered the raised bed');samples.push(s.player);
  }
  assert(samples.at(-1).z<6.06&&samples.at(-1).z>6.04,'movement did not reach the front timber boundary');
  if(mobile) await p.mouse.up(); else {await p.keyboard.up('w');await p.keyboard.up('d');await p.keyboard.up('Shift');}
  await p.screenshot({path:`${out}/${mode}-bed-contact.png`});
  await visitBed();
  for(const name of ['plant','water']){
   await p.getByTestId('garden-action').click();
   await p.waitForFunction(()=>{const m=window.__THREE_GAME_DIAGNOSTICS__?.motion;return m?.progress>.48&&m.progress<.75;});
   const d=await p.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__);
   assert.equal(d.motion.action,name,'unexpected gardening action');
   if(name==='plant')assert(d.motion.handError<.14,`plant hand miss ${d.motion.handError}`);
   await p.screenshot({path:`${out}/${mode}-${name}.png`});
   results.push({mode,action:name,motion:d.motion});
   await p.waitForFunction(()=>window.__THREE_GAME_TEST_HOOKS__.snapshot().action===null);
  }
  await p.locator('[data-garden-controls]').focus();
  const yaw=await p.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__.camera.yaw);
  await p.keyboard.down('q');
  await p.waitForFunction(start=>window.__THREE_GAME_DIAGNOSTICS__.camera.yaw>start+Math.PI,yaw);
  await p.keyboard.up('q');
  await p.screenshot({path:`${out}/${mode}-shoulders.png`});
  results.push({mode,collisionSamples:samples.length,errors:test.errors,rendererErrors:test.rendererErrors});
  assert.deepEqual(test.errors,[]);assert.deepEqual(test.rendererErrors,[]);
  await test.context.close();
 }
 await writeFile(`${out}/ui-validation.json`,JSON.stringify({state:'passed',execution:'local isolated fixture, actual map/keyboard/pointer controls; phone viewport is emulation',results},null,2));
 console.log('PASS desktop and phone contact, planting, watering and shoulder captures');
} catch(error){
 for(const c of fixture.browser.contexts())for(const p of c.pages()){
  await p.screenshot({path:`${out}/failure.png`}).catch(()=>{});
  await writeFile(`${out}/failure.txt`,String(error.stack));
 }
 throw error;
} finally {await fixture.close();}
