/** Real component/style/browser regression. Prices are synthetic fixtures, never account data. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const cwd = process.cwd();
const fixture = await fs.mkdtemp(path.join(cwd, '.vault-cost-browser-'));
const out = path.join(cwd, 'test-results/vault-cost');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(fixture, 'index.html'), '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
await fs.writeFile(path.join(fixture, 'entry.tsx'), `import React, {useState, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {VaultCostDashboard} from '@/components/vault/VaultCostDashboard';
import {useAppStore} from '@/stores/app-store';
import '@/app/globals.css';
const entry=(id,amount,overrides={})=>({id,app_name:'Fixture '+id,status:'Active',cost_type:'Subscription',cost_amount:amount,cost_period:'monthly',cost_currency:'USD',pricing_last_checked_at:'2026-09-10T00:00:00Z',...overrides});
const data=[entry('Studio',2400,{cost_period:'annual'}),entry('Editor',24),entry('Cloud',20),entry('Notes',12),entry('Design',10),entry('Music',6),entry('Drive',4,{app_name:'Fixture exceptionally-long-unbroken-application-name-to-check-small-screen-wrapping'}),entry('HK',156,{cost_currency:'HKD'}),entry('Free',0,{cost_type:'Free'}),entry('Unknown',20,{cost_period:null})];
function App(){
 const [entries,setEntries]=useState(data);
 const [selected,setSelected]=useState('');
 useEffect(()=>{
  window.setCostFixture=(name)=>setEntries(name==='empty'?[]:name==='zero'?[entry('Zero',0)]:name==='usd-only'?data.filter(e=>e.cost_currency==='USD'):data);
  window.setCostLanguage=(language)=>useAppStore.getState().setLanguage(language);
 },[]);
 return <main style={{padding:16,maxWidth:1100,margin:'0 auto',fontFamily:'Arial,sans-serif'}}>
  <p style={{fontSize:12,marginBottom:16}}>Component test fixture. Example prices only, not account data.</p>
  <VaultCostDashboard entries={entries} onSelectEntry={setSelected}/>
  <output data-testid="selected">{selected}</output>
 </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);`);

let server;
let browser;
try {
  server = await createServer({ root: fixture, configFile: false, publicDir: false,
    resolve: { alias: [{ find: '@', replacement: path.join(cwd, 'src') }] },
    esbuild: { jsx: 'automatic' }, css: { postcss: cwd },
    server: { host: '127.0.0.1', port: 3191, strictPort: true, fs: { allow: [cwd] } },
  });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('http://127.0.0.1:3191', { waitUntil: 'networkidle', timeout: 90000 });
  await page.getByRole('heading', { name: 'Estimated monthly cost', exact: true }).waitFor();
  await page.getByRole('button', { name: 'USD', exact: true }).click();
  const chart = page.getByRole('list', { name: 'Monthly cost by app', exact: true });
  assert.match(await page.locator('[aria-live="polite"]').innerText(), /276\.00/, 'annual price is normalized into the USD total');
  assert.equal(await chart.getByRole('listitem').count(), 5, 'five highest-cost rows shown initially');
  const first = chart.getByRole('button').first();
  assert.match(await first.getAttribute('aria-label'), /View Fixture Studio: USD 200\.00\/mo/, 'highest normalized cost comes first');
  await first.focus();
  await first.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-testid="selected"]')?.textContent === 'Studio');
  await page.getByRole('button', { name: 'Show all 7 apps', exact: true }).click();
  assert.equal(await chart.getByRole('listitem').count(), 7, 'expand exposes every app');
  assert.equal(await page.getByRole('button', { name: 'Show fewer', exact: true }).getAttribute('aria-expanded'), 'true');

  async function geometry(label) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': page does not overflow horizontally');
    assert.ok(await page.locator('section').evaluate(el => el.scrollWidth <= el.clientWidth + 1), label + ': card does not overflow horizontally');
    const widths = await chart.locator('li').evaluateAll(items => items.map(el => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(widths.every(Boolean), label + ': all rows fit');
  }
  for (const dark of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
    for (const [width,height] of [[1440,1000],[1024,768],[768,1024],[390,844],[320,568]]) {
      await page.setViewportSize({width,height});
      await page.waitForTimeout(120);
      await geometry((dark?'dark':'light')+' '+width);
      await page.screenshot({path:path.join(out, (dark?'dark':'light')+'-'+width+'-fixture.png'),fullPage:true});
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  const durations = await chart.locator('[style*="width"]').evaluateAll(elements => elements.map(el => getComputedStyle(el).transitionDuration));
  assert.ok(durations.every(value => value === '0s'), 'reduced motion disables animated widths');
  await page.getByRole('button', {name:'Show fewer',exact:true}).click();
  assert.equal(await chart.getByRole('listitem').count(),5);
  await page.getByRole('button',{name:'HKD',exact:true}).click();
  assert.match(await page.locator('[aria-live="polite"]').innerText(),/156\.00/, 'HKD total is independent');
  assert.equal(await chart.getByRole('listitem').count(),1);
  assert.match(await chart.innerText(),/100%/);

  await page.evaluate(() => window.setCostFixture('usd-only'));
  await page.getByRole('button',{name:'HKD',exact:true}).waitFor({state:'detached'});
  assert.match(await page.locator('[aria-live="polite"]').innerText(),/276\.00/, 'removed currency selection falls back to remaining currency');
  await page.evaluate(() => window.setCostLanguage('zh-TW'));
  await page.getByRole('heading',{name:'每月費用估計',exact:true}).waitFor();
  await page.getByRole('list',{name:'各 app 的每月費用',exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'traditional-chinese-320-fixture.png'),fullPage:true});
  await page.evaluate(() => window.setCostLanguage('en'));
  await page.getByRole('heading',{name:'Estimated monthly cost',exact:true}).waitFor();
  await page.evaluate(() => window.setCostFixture('zero'));
  await page.getByRole('button',{name:/^View Fixture Zero:/}).waitFor();
  assert.match(await page.locator('[aria-live="polite"]').innerText(),/0\.00/);
  assert.doesNotMatch(await page.locator('section').innerHTML(),/NaN|Infinity/);
  await page.evaluate(() => window.setCostFixture('empty'));
  await page.getByText('No recurring costs recorded yet',{exact:true}).waitFor();
  assert.equal(await page.getByRole('list').count(),0,'no invented charge in an empty library');
  assert.deepEqual(failures, [], 'no browser runtime errors');
  console.log('PASS: real cost component, normalized totals, currency selection/fallback, expand/collapse, keyboard app selection, reduced motion, English/Traditional Chinese, zero/empty states and ten desktop/tablet/mobile theme layouts. Prices are fixtures; not a production-account walkthrough.');
} finally {
  await browser?.close();
  await server?.close();
  // Only the freshly-created disposable test fixture is removed.
  await fs.rm(fixture,{recursive:true,force:true});
}
