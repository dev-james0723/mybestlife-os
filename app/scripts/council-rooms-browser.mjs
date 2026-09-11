/** Browser component tests. Real feature components/styles; API and Next image adapter are test fixtures. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
const cwd = process.cwd();
const fixture = path.join(cwd, '.council-browser-fixture');
const out = path.join(cwd, 'test-results/council-rooms');
await fs.mkdir(fixture, { recursive: true });
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(fixture, 'index.html'), '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
await fs.writeFile(path.join(fixture, 'image.tsx'), `import React from 'react';
export default function Image({src,alt,className,fill,onError}) { return <img src={src} alt={alt} className={className} onError={onError} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}:undefined}/>; }`);
await fs.writeFile(path.join(fixture, 'navigation.ts'), `export const useRouter=()=>({push(){},replace(){}}); export const usePathname=()=>'/en/mind-council'; export const useSearchParams=()=>new URLSearchParams();`);
await fs.writeFile(path.join(fixture, 'entry.tsx'), `import React from 'react';
import {createRoot} from 'react-dom/client';
import {CouncilWorkspace} from '@/components/mind-council/CouncilWorkspace';
import {PRESET_MIND_SKILLS} from '@/lib/mind-council/preset-skills';
import {getMindCouncilUiCopy} from '@/lib/i18n/mind-council-ui';
import '@/app/globals.css';
const ids=['lens-steve-jobs','lens-elon-musk','lens-warren-buffett','lens-beyonce','lens-jeff-bezos'];
createRoot(document.getElementById('root')!).render(<React.StrictMode><main style={{padding:24,fontFamily:'Arial,sans-serif'}}><CouncilWorkspace skills={ids.map(id=>PRESET_MIND_SKILLS.find(s=>s.skillId===id)!)} ui={getMindCouncilUiCopy('en')} locale="en" onChat={()=>{}} onProfile={()=>{}} onCreateAdvisor={()=>{}}/></main></React.StrictMode>);`);
const server = await createServer({ root: fixture, configFile: false, publicDir: path.join(cwd, 'public'),
  resolve: { alias: [ { find: 'next/image', replacement: path.join(fixture, 'image.tsx') }, { find: 'next/navigation', replacement: path.join(fixture, 'navigation.ts') }, { find: '@', replacement: path.join(cwd, 'src') } ] },
  esbuild: { jsx: 'automatic' }, css: { postcss: cwd }, server: { host: '127.0.0.1', port: 3189, strictPort: true, fs: { allow: [cwd] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const failures = [];
page.on('pageerror', (e) => failures.push(e.message));
const viewer = { name: 'Test participant', avatar: null };
const names = ['Steve Jobs', 'Elon Musk', 'Warren Buffett', 'Beyoncé'];
const ids = ['lens-steve-jobs', 'lens-elon-musk', 'lens-warren-buffett', 'lens-beyonce'];
let room = null, messages = [], lastTurn = null, sceneCalls = 0, turnCalls = 0;
const sent = [];
// Clearly synthetic blank fixture, not a generated scene-quality test.
const image = await sharp({ create: { width: 1440, height: 1080, channels: 3, background: '#726452' } }).webp().toBuffer();
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
await page.route('**/api/mind-council/**', async (route) => {
  const req = route.request(); const url = new URL(req.url()); const body = req.method() === 'GET' ? null : req.postDataJSON();
  if (url.pathname.endsWith('/recommend')) return json(route, { recommendedSkillIds: ids, rationale: 'Test recommendation response.' });
  if (url.pathname.endsWith('/rooms')) {
    if (req.method() === 'GET') return json(route, { rooms: room?.is_saved ? [room] : [], nextCursor: null, viewer });
    room = { id: body.id, name: 'Creative direction Council', advisors: body.advisorIds.map(id => ({ id, name: names[ids.indexOf(id)], subtitle: 'Test perspective' })), initial_question: body.question,
      scene_template: 'sunset-library', scene_status: 'idle', scene_version: null, scene_error: null, scene_model: null, is_saved: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    return json(route, { room, viewer }, 201);
  }
  if (url.pathname.endsWith('/scene')) {
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'image/webp', body: image });
    sceneCalls++; room.scene_status = 'ready'; room.scene_version = '11111111-1111-4111-8111-111111111111';
    return json(route, { room });
  }
  if (url.pathname.endsWith('/turn')) {
    turnCalls++; sent.push(body);
    const message = { id: randomUUID(), turn_id: body.requestId, kind: 'user', advisor_id: null, display_name: 'You', content: body.message, step: 0, created_at: new Date().toISOString() };
    const reply = { ...message, id: randomUUID(), kind: 'advisor', advisor_id: ids[0], display_name: 'Steve Jobs', content: 'A fixture reply, not a real-person quotation.', step: 1 };
    messages.push(message, reply); lastTurn = { id: body.requestId, prompt: body.message, exchange: body.exchange, status: 'complete' };
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: [ { type: 'message', message }, { type: 'status', advisorId: ids[0], round: 1 }, { type: 'message', message: reply }, { type: 'done', turnId: body.requestId } ].map(e => JSON.stringify(e)).join('\n') + '\n' });
  }
  if (req.method() === 'PATCH') { room = { ...room, ...body }; return json(route, { room }); }
  return json(route, { room, viewer, messages, lastTurn, busy: false });
});
const dialog = page.getByRole('dialog');
const composer = page.getByRole('textbox', { name: 'Ask your Council. Type @ to choose who replies…' });
async function geometry(label) {
  const v = page.viewportSize(); const b = await dialog.boundingBox(); assert.ok(b, label + ': dialog visible');
  assert.ok(Math.abs(b.x + b.width / 2 - v.width / 2) <= 2, label + ': horizontally centered');
  assert.ok(Math.abs(b.y + b.height / 2 - v.height / 2) <= 2, label + ': vertically centered');
  const c = await composer.boundingBox(); assert.ok(c.y >= 0 && c.y + c.height <= v.height, label + ': composer visible');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': no page horizontal overflow');
  assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), label + ': no room horizontal overflow');
}
try {
  await page.goto('http://127.0.0.1:3189', { waitUntil: 'networkidle', timeout: 90000 });
  await page.getByRole('textbox', { name: 'What would you like to think through?' }).fill('How should I choose a creative direction?');
  await page.getByRole('button', { name: 'Recommend advisors', exact: true }).click();
  await page.getByText('Recommended for your question', { exact: true }).waitFor();
  assert.equal(await page.locator('button[aria-pressed="true"]').count(), 5, 'one active tab and four selected advisors');
  await page.getByRole('button', { name: 'Choose advisors', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: /Jeff Bezos/ }).isDisabled(), true, 'fifth advisor cannot be selected');
  await page.screenshot({ path: path.join(out, 'builder.png'), fullPage: true });
  await page.getByRole('button', { name: 'Run Council', exact: true }).click();
  await dialog.waitFor(); await page.getByRole('img', { name: /^AI-generated scene:/ }).waitFor();
  await page.getByText('A fixture reply, not a real-person quotation.', { exact: true }).waitFor();
  assert.equal(sceneCalls, 1, 'Strict Mode does not generate duplicate scenes'); assert.equal(turnCalls, 1, 'Run Council sends the first question only once');
  await geometry('desktop');
  await composer.fill('@Elon Musk @Beyoncé What do you think of one another?');
  assert.equal(await dialog.locator('header').getByRole('button', { name: '@Elon Musk', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await dialog.locator('header').getByRole('button', { name: '@Beyoncé', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.locator('[aria-label="You are typing"]').waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('[aria-label="You are typing"] > span').first().evaluate(el => getComputedStyle(el).animationName), 'none', 'reduced motion disables the typing pulse');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await composer.waitFor();
  await page.waitForFunction(() => document.querySelector('textarea[aria-label^="Ask your Council"]')?.value === '');
  assert.match(sent.at(-1).message, /@Elon Musk @Beyoncé/);
  await composer.fill('@El'); await page.getByRole('option', { name: 'Elon Musk', exact: true }).waitFor();
  await composer.press('Enter'); assert.equal(await composer.inputValue(), '@Elon Musk ');
  await page.getByRole('button', { name: 'Save room', exact: true }).click();
  await page.getByRole('button', { name: 'Saved', exact: true }).waitFor();
  await page.screenshot({ path: path.join(out, 'room-desktop-fixture.png') });
  for (const [width, height] of [[1024,768],[768,1024],[390,844],[320,568]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(180);
    await geometry(`${width}x${height}`);
    await page.screenshot({ path: path.join(out, `room-${width}x${height}-fixture.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Close room', exact: true }).click();
  await page.getByRole('button', { name: 'Saved rooms', exact: true }).click();
  await page.getByRole('button', { name: 'Open room', exact: true }).click(); await dialog.waitFor();
  await page.waitForTimeout(300);
  assert.equal(sceneCalls, 1, 'saved room reopens the original scene without another generation');
  assert.equal(turnCalls, 2, 'reopening does not resend questions');
  assert.equal(await dialog.getByText('A fixture reply, not a real-person quotation.', { exact: true }).count(), 2, 'conversation restored');
  assert.deepEqual(failures, [], 'no browser runtime errors');
  console.log('PASS: actual component builder, four-advisor cap, centered room, @mentions, typing, keyboard selection, reduced motion, five viewport layouts and saved-room reuse. APIs/images are fixtures; no provider-generation or production test is claimed.');
} finally {
  await browser.close(); await server.close(); await fs.rm(fixture, { recursive: true, force: true });
}
