import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import ts from "typescript";

// Render the exact browser instruments offline, then exercise their real Web Audio lifecycle.
const out = process.env.GARDEN_AUDIO_OUT ?? "../artifacts/garden-v2/audio-1";
await mkdir(out, { recursive: true });
const compiled = ts.transpileModule(await readFile("src/lib/garden/audio.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage(); const errors = [];
page.on("pageerror", e => errors.push(e.message));
try {
  await page.setContent('<button id="unlock">Play garden soundtrack</button>');
  await page.addScriptTag({ type: "module", content: `${compiled}\nwindow.gardenAudioModule = { GardenAudioGraph, GardenAudio, gardenScoreStep, GARDEN_TEMPO, normalizeGardenMix, defaultGardenMix };` });
  await page.waitForFunction(() => !!window.gardenAudioModule);
  const renders = [];
  for (const [name, night, seconds, cues, muted] of [
    ["a-little-more-green-day", false, 105, false, false],
    ["a-little-more-green-evening", true, 105, false, false],
    ["garden-sound-effects", false, 48, true, false],
    ["muted-mix", false, 3, false, true],
  ]) {
    const result = await page.evaluate(async ({ night, seconds, cues, muted }) => {
      const { GardenAudioGraph, gardenScoreStep, GARDEN_TEMPO } = window.gardenAudioModule;
      const ctx = new OfflineAudioContext(2, 44100 * seconds, 44100), graph = new GardenAudioGraph(ctx);
      graph.mix({ sound: !muted, music: cues ? 0 : 0.55, effects: 0.7, ambience: cues ? 0 : 0.4 });
      if (!cues) {
        graph.startAmbience(0);
        for (let step = 0; step < 256; step++) {
          const at = 0.4 + step * 30 / GARDEN_TEMPO; if (at >= seconds) break;
          gardenScoreStep(step, night, true).forEach(note => graph.note(note, at));
          if (step % 72 === 24) graph.bird(at, night);
        }
      } else ["step-grass", "step-grass", "step-path", "flutter", "plant-grass", "plant-flower", "shelter-open", "rainwater", "buddy", "plant", "water", "refill", "harvest", "forage", "discover", "dash", "trail-start", "trail-stop", "trail-failed", "trail-won", "deliver", "open", "confirm", "cancel"].forEach((cue, i) => graph.cue(cue, 0.4 + i * 1.75));
      if (!muted) { graph.master.gain.setValueAtTime(0, 0); graph.master.gain.linearRampToValueAtTime(0.8, 0.35); graph.master.gain.setValueAtTime(0.8, seconds - 2); graph.master.gain.linearRampToValueAtTime(0, seconds - 0.1); }
      const buffer = await ctx.startRendering(), channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
      let peak = 0, energy = 0, maxDelta = 0;
      const wav = new ArrayBuffer(44 + buffer.length * 4), view = new DataView(wav);
      const text = (at, value) => [...value].forEach((letter, i) => view.setUint8(at + i, letter.charCodeAt(0)));
      text(0, "RIFF"); view.setUint32(4, wav.byteLength - 8, true); text(8, "WAVE"); text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true); view.setUint32(24, 44100, true); view.setUint32(28, 176400, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, buffer.length * 4, true);
      for (let i = 0; i < buffer.length; i++) for (let c = 0; c < 2; c++) {
        const value = channels[c][i]; if (!Number.isFinite(value)) throw new Error("Non-finite audio sample");
        peak = Math.max(peak, Math.abs(value)); energy += value * value;
        if (i) maxDelta = Math.max(maxDelta, Math.abs(value - channels[c][i - 1]));
        view.setInt16(44 + i * 4 + c * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
      }
      const bytes = new Uint8Array(wav); let binary = "";
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      graph.dispose(); return { wav: btoa(binary), peak, rms: Math.sqrt(energy / (buffer.length * 2)), maxDelta, seconds, sampleRate: 44100, channels: 2 };
    }, { night, seconds, cues, muted });
    const { wav, ...metrics } = result;
    assert(metrics.peak < 0.9, `${name}: headroom`); assert(muted ? metrics.peak === 0 : metrics.rms > 0.002, `${name}: expected audible/muted output`);
    await writeFile(`${out}/${name}.wav`, Buffer.from(wav, "base64")); renders.push({ name, ...metrics });
  }
  await page.evaluate(() => {
    const Native = AudioContext; window.audioContexts = [];
    window.AudioContext = class extends Native { constructor(...args) { super(...args); window.audioContexts.push(this); } };
    const { GardenAudio, defaultGardenMix } = window.gardenAudioModule;
    window.musicPlayer = new GardenAudio(); window.musicPlayer.configure({ ...defaultGardenMix, sound: true }, false); window.musicPlayer.setPlaying(true);
    document.querySelector("button").onclick = () => window.musicPlayer.unlock("buddy");
  });
  assert.equal(await page.evaluate(() => window.audioContexts.length), 0, "no AudioContext before user gesture");
  await page.click("button"); await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.audioContexts[0].state), "running");
  await page.evaluate(() => window.musicPlayer.setPlaying(false)); await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.audioContexts[0].state), "suspended", "pause suspends audio and hardware work");
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.musicPlayer.setPlaying(true)); await page.click("button"); await page.waitForTimeout(80); await page.evaluate(() => window.musicPlayer.setPlaying(false)); await page.waitForTimeout(100); }
  assert.equal(await page.evaluate(() => window.audioContexts.length), 1, "restarts reuse one context");
  await page.evaluate(() => { window.musicPlayer.setPlaying(true); window.musicPlayer.configure({ ...window.gardenAudioModule.defaultGardenMix, sound: true }, false); });
  await page.click("button"); await page.evaluate(() => window.musicPlayer.configure({ ...window.gardenAudioModule.defaultGardenMix, sound: false }, false)); await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.audioContexts[0].state), "suspended", "mute wins over pending resume");
  await page.evaluate(() => { window.musicPlayer.configure({ ...window.gardenAudioModule.defaultGardenMix, sound: true }, false); window.musicPlayer.unlock(); window.musicPlayer.dispose(); }); await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => window.audioContexts[0].state), "closed", "unmount disposes even during resume");
  assert.deepEqual(errors, []);
  await writeFile(`${out}/audio-results.json`, JSON.stringify({ state: "original synthesized music rendered by the actual browser instruments; isolated lifecycle verification", renders, lifecycle: "gesture unlock, pause, repeated resume, mute/resume race, dispose/resume race passed", errors }, null, 2));
  console.log(JSON.stringify({ renders, lifecycle: "passed" }, null, 2));
} finally { await browser.close(); }
