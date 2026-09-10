import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { createGardenFixture, base } from './sky-garden-fixture.mjs';
const output = '../artifacts/garden-tilt/browser';
await mkdir(output, { recursive: true });
const fixture = await createGardenFixture(output), checks = [], measurements = {};
const snapshot = p => p.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.snapshot());
const speed = async p => { const s = await snapshot(p); return Math.hypot(s.player.vx, s.player.vz); };
const status = p => p.locator('[data-tilt-access]').getAttribute('data-tilt-access');
const untilStatus = async (p, expected) => {
  await p.waitForFunction(value => { const el = document.querySelector('[data-tilt-access]'); return el?.getAttribute('data-tilt-access') === value || el?.getAttribute('data-tilt-status') === value; }, expected);
};
async function enableTilt(p, resume = true) {
  await p.getByRole('button', { name: 'Garden settings', exact: true }).click();
  await p.getByRole('switch', { name: 'Phone tilt controls', exact: true }).click();
  if (resume) await p.getByRole('button', { name: 'Close menu and resume', exact: true }).click();
}
async function openCase(mode = 'granted', viewport = { width: 390, height: 844 }, locale = 'en') {
  const test = await fixture.open(viewport, { touch: true, deferNavigation: true, locale });
  await test.context.addInitScript(mode => {
    window.__tiltPermission = [];
    window.__tiltSensor = { alpha: 0, beta: 45, gamma: 0, angle: 0, running: false };
    if (mode === 'unsupported') Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined });
    else if (mode !== 'native') {
      DeviceOrientationEvent.requestPermission = () => {
        window.__tiltPermission.push({ kind: 'orientation', active: navigator.userActivation.isActive });
        return mode === 'pending' ? new Promise(resolve => window.__resolveTiltPermission = resolve) : Promise.resolve(mode === 'denied' ? 'denied' : 'granted');
      };
      DeviceMotionEvent.requestPermission = () => {
        window.__tiltPermission.push({ kind: 'motion', active: navigator.userActivation.isActive });
        return Promise.resolve('granted');
      };
    }
    if (mode === 'insecure') Object.defineProperty(window, 'isSecureContext', { value: false });
    if (mode !== 'native') {
      Object.defineProperty(screen.orientation, 'angle', { get: () => window.__tiltSensor.angle });
      window.setInterval(() => {
        const s = window.__tiltSensor;
        if (s.running) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: s.beta, gamma: s.gamma, alpha: s.alpha }));
      }, 20);
    }
  }, mode);
  await test.page.goto(`${base}/${locale === 'zh-TW' ? 'zh-hk' : locale}/garden`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await test.page.locator('[data-garden-enter]:enabled').waitFor({ timeout: 60000 });
  await test.page.locator('[data-garden-enter]').click();
  await test.page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('hero-asset'));
  return test;
}
const setSensor = (p, changes) => p.evaluate(changes => Object.assign(window.__tiltSensor, changes), changes);
async function checkErrors(test) { assert.deepEqual(test.errors, []); assert.deepEqual(test.rendererErrors, []); }
try {
  const test = await openCase(); const p = test.page;
  assert.equal(await status(p), 'off');
  assert.equal(await p.locator('[data-tilt-compact]').count(), 0);
  assert(await p.getByRole('button', { name: 'Move joystick', exact: true }).isVisible());
  await p.screenshot({ path: `${output}/phone-default-joystick.png` });
  const defaultPosition = (await snapshot(p)).player;
  const defaultStick = await p.getByRole('button', { name: 'Move joystick', exact: true }).boundingBox();
  await p.mouse.move(defaultStick.x + defaultStick.width / 2, defaultStick.y + defaultStick.height / 2);
  await p.mouse.down(); await p.mouse.move(defaultStick.x + defaultStick.width / 2 + 25, defaultStick.y + defaultStick.height / 2);
  await p.waitForTimeout(300); await p.mouse.up();
  const defaultMoved = (await snapshot(p)).player;
  assert(Math.hypot(defaultMoved.x - defaultPosition.x, defaultMoved.z - defaultPosition.z) > 0.2);
  await p.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('hero-asset'));
  checks.push('joystick is visible, moves the character by default, and no tilt HUD appears until settings opt-in');
  await enableTilt(p);
  await setSensor(p, { running: true });
  await untilStatus(p, 'ready');
  assert((await p.evaluate(() => window.__tiltPermission)).every(p => p.active), 'both requests use the button activation');
  assert.equal(await speed(p), 0);
  checks.push('explicit opt-in; both permission calls stay in the user gesture; calibrated grip is stationary');
  await setSensor(p, { beta: 44 }); await p.waitForTimeout(650);
  measurements.oneDegreeSpeed = await speed(p);
  assert(measurements.oneDegreeSpeed > 0.08 && measurements.oneDegreeSpeed < 0.35);
  await setSensor(p, { beta: 40 }); await p.waitForTimeout(400);
  measurements.fiveDegreeSpeed = await speed(p);
  await setSensor(p, { beta: 27 }); await p.waitForTimeout(350);
  measurements.eighteenDegreeSpeed = await speed(p);
  assert(measurements.fiveDegreeSpeed > measurements.oneDegreeSpeed * 3);
  assert(measurements.eighteenDegreeSpeed > measurements.fiveDegreeSpeed * 2);
  await p.screenshot({ path: `${output}/phone-tilt-running.png` });
  checks.push('one-degree movement reaches the real character; increasing lean increases actual velocity');
  await setSensor(p, { beta: 45 }); await p.waitForTimeout(700); assert((await speed(p)) < 0.02);
  // Joystick overrides tilt even when deliberately held centered.
  await setSensor(p, { beta: 35 }); await p.waitForTimeout(250);
  const joystick = await p.getByRole('button', { name: 'Move joystick', exact: true }).boundingBox();
  await p.mouse.move(joystick.x + joystick.width / 2, joystick.y + joystick.height / 2); await p.mouse.down();
  await p.waitForTimeout(600); assert((await speed(p)) < 0.03); await p.mouse.up();
  await p.waitForTimeout(300); assert((await speed(p)) > 0.8);
  checks.push('neutral stops; touching centered joystick takes over and releasing returns control');
  await p.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await snapshot(p); await setSensor(p, { beta: 20 }); await p.waitForTimeout(250);
  assert.deepEqual((await snapshot(p)).player, paused.player);
  await p.getByRole('button', { name: 'Close menu and resume', exact: true }).click();
  await untilStatus(p, 'ready'); await p.waitForTimeout(550); assert((await speed(p)) < 0.02);
  await p.getByRole('button', { name: 'Garden settings', exact: true }).click();
  await p.getByLabel('Tilt sensitivity', { exact: true }).selectOption('sensitive');
  await p.screenshot({ path: `${output}/phone-tilt-settings.png` });
  await p.getByRole('button', { name: 'Close menu and resume', exact: true }).click();
  await untilStatus(p, 'ready'); await setSensor(p, { beta: 19.5 }); await p.waitForTimeout(550);
  measurements.halfDegreeSensitiveSpeed = await speed(p); assert(measurements.halfDegreeSensitiveSpeed > 0.05);
  checks.push('pause prevents movement; resume recalibrates the new grip; sensitive mode moves at half a degree');
  await p.getByRole('button', { name: 'Recenter tilt', exact: true }).click();
  await untilStatus(p, 'ready'); await p.waitForTimeout(450); assert((await speed(p)) < 0.02);
  await setSensor(p, { beta: 10 }); await p.waitForTimeout(250); await setSensor(p, { running: false });
  await untilStatus(p, 'stale'); await p.waitForTimeout(600); assert((await speed(p)) < 0.02);
  checks.push('recenter stops movement; stale sensor stream stops the character');
  await p.setViewportSize({ width: 844, height: 390 });
  await setSensor(p, { beta: 0, gamma: -45, angle: 90, running: true });
  await p.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  await untilStatus(p, 'ready'); await p.waitForTimeout(250);
  await setSensor(p, { gamma: -40 }); await p.waitForTimeout(400); assert((await speed(p)) > 0.5);
  await p.screenshot({ path: `${output}/landscape-tilt-running.png` });
  const controls = await p.locator('[data-tilt-compact] button').evaluateAll(buttons => buttons.map(b => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
  assert(controls.every(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= 845 && b.y + b.h <= 390 && b.w >= 44 && b.h >= 44));
  checks.push('screen rotation recalibrates; landscape forward tilt works; controls fit with 44px targets');
  await p.getByRole('button', { name: 'Garden settings', exact: true }).click();
  await p.getByLabel('Joystick position', { exact: true }).selectOption('right');
  await p.getByRole('button', { name: 'Close menu and resume', exact: true }).click();
  await untilStatus(p, 'ready');
  await p.screenshot({ path: `${output}/landscape-right-joystick.png` });
  const rightControl = await p.getByRole('button', { name: 'Recenter tilt', exact: true }).boundingBox();
  assert(rightControl.x + rightControl.width <= 844 && rightControl.y + rightControl.height <= 390);
  checks.push('right-handed joystick and tilt controls both fit in landscape');
  await p.getByRole('button', { name: 'Garden settings', exact: true }).click();
  await p.getByRole('switch', { name: 'Phone tilt controls', exact: true }).uncheck();
  await p.getByRole('button', { name: 'Close menu and resume', exact: true }).click();
  await p.waitForTimeout(600); assert.equal(await status(p), 'off'); assert((await speed(p)) < 0.02);
  await p.reload(); await p.locator('[data-garden-enter]:enabled').click(); assert.equal(await status(p), 'off');
  await p.getByRole('button', { name: 'Garden settings', exact: true }).click();
  assert.equal(await p.getByLabel('Tilt sensitivity', { exact: true }).inputValue(), 'sensitive');
  checks.push('disable removes active tilt; reload stays opt-in and retains sensitivity only');
  await checkErrors(test); await test.context.close();

  for (const [mode, expected] of [['denied', 'denied'], ['unsupported', 'unavailable'], ['insecure', 'insecure'], ['no-data', 'unavailable']]) {
    const t = await openCase(mode);
    await enableTilt(t.page, false);
    await untilStatus(t.page, expected); assert.equal(await speed(t.page), 0);
    await checkErrors(t); await t.context.close(); checks.push(`${mode}: clear fallback and no movement`);
  }
  const pending = await openCase('pending');
  await enableTilt(pending.page, false);
  await pending.page.getByRole('switch', { name: 'Phone tilt controls', exact: true }).uncheck();
  await pending.page.evaluate(() => window.__resolveTiltPermission('granted'));
  await setSensor(pending.page, { running: true, beta: 10 }); await pending.page.waitForTimeout(600);
  assert.equal(await status(pending.page), 'off'); assert.equal(await speed(pending.page), 0);
  checks.push('cancelled permission cannot enable tilt after a late grant'); await checkErrors(pending); await pending.context.close();

  const native = await openCase('native');
  await native.page.evaluate(() => { window.__trustedTiltEvents = 0; window.addEventListener('deviceorientation', e => { if (e.isTrusted) window.__trustedTiltEvents++; }); });
  const cdp = await native.context.newCDPSession(native.page);
  await enableTilt(native.page);
  for (let i = 0; i < 18; i++) {
    await cdp.send('DeviceOrientation.setDeviceOrientationOverride', { alpha: 0, beta: 45 + (i % 2) * 0.1, gamma: 0 });
    await native.page.waitForTimeout(50);
  }
  await untilStatus(native.page, 'ready');
  for (let i = 0; i < 8; i++) { await cdp.send('DeviceOrientation.setDeviceOrientationOverride', { alpha: 0, beta: 40 + (i % 2) * 0.1, gamma: 0 }); await native.page.waitForTimeout(50); }
  assert((await speed(native.page)) > 0.5);
  for (let i = 0; i < 14; i++) { await cdp.send('DeviceOrientation.setDeviceOrientationOverride', { alpha: 60, beta: 40 + (i % 2) * 0.1, gamma: 0 }); await native.page.waitForTimeout(50); }
  const turned = (await snapshot(native.page)).player;
  const ix = turned.vx * Math.cos(0.65) - turned.vz * Math.sin(0.65);
  const iz = turned.vx * Math.sin(0.65) + turned.vz * Math.cos(0.65);
  measurements.nativeHeadingDegrees = Math.atan2(-ix, -iz) * 180 / Math.PI;
  assert(Math.abs(measurements.nativeHeadingDegrees - 60) < 1, 'third-axis heading turns the actual character path by 60 degrees');
  measurements.trustedBrowserEvents = await native.page.evaluate(() => window.__trustedTiltEvents);
  assert(measurements.trustedBrowserEvents > 0);
  checks.push('Chrome native CDP orientation emulation emits trusted events; third-axis yaw turns the actual character path by 60 degrees');
  await checkErrors(native); await native.context.close();

  const chinese = await openCase('granted', { width: 375, height: 812 }, 'zh-TW');
  await chinese.page.getByRole('button', { name: '花園設定', exact: true }).click();
  await chinese.page.getByRole('switch', { name: '手機傾斜控制', exact: true }).check();
  await setSensor(chinese.page, { running: true });
  await chinese.page.getByLabel('傾斜靈敏度', { exact: true }).selectOption('sensitive');
  await chinese.page.screenshot({ path: `${output}/phone-settings-zh.png` });
  await chinese.page.getByRole('button', { name: '關閉選單並繼續', exact: true }).click();
  await untilStatus(chinese.page, 'ready');
  await checkErrors(chinese); await chinese.context.close();
  checks.push('Traditional Chinese settings switch, sensitivity and calibration work at 375px');
  await writeFile(`${output}/results.json`, JSON.stringify({ passed: true, testedAt: new Date().toISOString(), execution: 'Local optimized Next build; isolated account data; synthetic permission/sensor branches plus native Chrome CDP orientation emulation. No physical phone test.', checks, measurements }, null, 2));
  console.log(JSON.stringify({ checks, measurements }, null, 2));
} catch (error) {
  for (const context of fixture.browser.contexts()) for (const p of context.pages()) {
    await p.screenshot({ path: `${output}/failure.png` }).catch(() => {});
    await writeFile(`${output}/failure.txt`, `${error.stack}\n${await p.locator('body').innerText().catch(() => '')}`);
  }
  throw error;
} finally { await fixture.close(); }
