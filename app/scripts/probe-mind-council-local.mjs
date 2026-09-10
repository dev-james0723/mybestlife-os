import { chromium } from 'playwright';
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const c=await b.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
await c.addCookies([{name:'mylifeos_dev_bypass',value:'1',url:'http://127.0.0.1:3114'}]);
const p=await c.newPage();
const errors=[]; const responses=[];
p.on('pageerror',e=>errors.push(e.message));
p.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,600))});
p.on('response',r=>{if(r.url().includes('127.0.0.1:3114'))responses.push([new URL(r.url()).pathname,r.status()])});
await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.route('**/api/mind-council/recommend',r=>r.fulfill({status:200,contentType:'application/json',body:'{"recommendedSkillIds":[],"rationale":""}'}));
try {
 await p.goto('http://127.0.0.1:3114/en/mind-council',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(8000);
 console.log(JSON.stringify({errors,responses,state:await p.evaluate(()=>({state:document.readyState,scripts:document.scripts.length,buttons:document.querySelectorAll('button').length}))},null,2));
 await p.getByRole('button',{name:'Add a council member',exact:true}).click({timeout:10000});
 await p.waitForTimeout(1000);
 console.log('dialogs',await p.getByRole('dialog').count());
 console.log((await p.locator('body').innerText()).slice(-900));
} finally {await b.close()}
