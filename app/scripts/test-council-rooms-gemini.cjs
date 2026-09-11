const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const sharp = require('sharp');

// Run the actual helper and room image adapter, with only HTTP and unrelated
// text/auth ports replaced. No live API requests or real credentials are used.
function loadTs(relative, dependencies = {}, globals = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const { outputText, diagnostics = [] } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  assert.deepEqual(diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  const localRequire = (id) => {
    if (Object.hasOwn(dependencies, id)) return dependencies[id];
    if (id === 'sharp') return sharp;
    throw new Error(`Unexpected test dependency: ${id}`);
  };
  new Function('require', 'module', 'exports', 'process', 'fetch', 'console', outputText)(
    localRequire, module, module.exports, { env: globals.env || {} },
    globals.fetch || (() => { throw new Error('Unexpected network request'); }),
    { warn() {} },
  );
  return module.exports;
}

const errors = loadTs('src/lib/ai/gemini-errors.ts');
const fakeImage = Buffer.alloc(96, 7);
const inlinePart = (bytes = fakeImage, mimeType = 'image/png') => ({ inlineData: { data: bytes.toString('base64'), mimeType } });
const imageResponse = (parts = [inlinePart()]) => Response.json({ candidates: [{ content: { parts } }] });
const signal = () => new AbortController().signal;
const baseParams = () => ({ apiKey: 'synthetic-gemini-key', prompt: 'A council room', modelChain: ['gemini-3.1-flash-image'] });

function harness(env = { GEMINI_API_KEY: 'synthetic-gemini-key' }, responder = () => imageResponse()) {
  const requests = [];
  const helperCalls = [];
  const fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return responder(url, init, requests.length);
  };
  const helper = loadTs('src/lib/ai/gemini-image-generate.ts', { '@/lib/ai/gemini-errors': errors }, { fetch });
  class CouncilHttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }
  const unused = () => { throw new Error('Unexpected text/auth dependency'); };
  const room = loadTs('src/lib/mind-council/room-providers.ts', {
    '@/lib/ai/gemini-text': {
      getGeminiServerApiKey: () => env.GEMINI_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || undefined,
      getGeminiPlannerTextModel: unused,
    },
    '@/lib/ai/gemini-image-generate': {
      generateGeminiInlineImage: (params) => { helperCalls.push(params); return helper.generateGeminiInlineImage(params); },
    },
    './skill-runtime': { buildMindLensSystemInstruction: unused },
    './load-bundled-skill': { buildBundledLensSystemInstruction: unused, readBundledSkillMarkdown: unused },
    '@/lib/i18n/gemini-locale': { localeToGeminiLanguage: unused },
    './room-contract': { isRecord: (v) => v !== null && typeof v === 'object', meetingContext: unused },
    './room-server': { CouncilHttpError },
  }, { env, fetch });
  return { helper, room, requests, helperCalls };
}

async function pngFixture() {
  return sharp({ create: { width: 20, height: 10, channels: 3, background: '#bcb6a9' } }).png().toBuffer();
}

test('rooms use the shared Gemini helper even when legacy OpenAI settings exist', async () => {
  const png = await pngFixture();
  const h = harness({ GEMINI_API_KEY: 'synthetic-gemini-key', OPENAI_API_KEY: 'synthetic-unused-key',
    MIND_COUNCIL_IMAGE_PROVIDER: 'openai', MIND_COUNCIL_OPENAI_IMAGE_MODEL: 'unused-model' }, () => imageResponse([inlinePart(png)]));
  const abortSignal = signal();
  const result = await h.room.generateCouncilScene('Keep the selected advisors and seated back-view.', abortSignal);
  assert.equal(h.helperCalls.length, 1);
  assert.deepEqual(h.helperCalls[0].modelChain, ['gemini-3.1-flash-image']);
  assert.equal(h.helperCalls[0].signal, abortSignal);
  assert.equal(h.helperCalls[0].maxInlineDataLength, 32_000_000);
  assert.equal(h.requests.length, 1);
  const request = h.requests[0];
  assert.equal(new URL(request.url).hostname, 'generativelanguage.googleapis.com');
  assert.equal(new URL(request.url).search, '');
  assert.equal(request.init.headers['x-goog-api-key'], 'synthetic-gemini-key');
  assert.equal(request.init.signal, abortSignal);
  assert.equal(JSON.parse(request.init.body).generationConfig.imageConfig.aspectRatio, '4:3');
  assert.equal(result.model, 'gemini-3.1-flash-image');
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1440);
  assert.equal(metadata.height, 1080);
  // A 2:1 source is contained, not cropped, in the 4:3 saved scene.
  const raw = await sharp(result.bytes).raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => [...raw.data.subarray((y * raw.info.width + x) * raw.info.channels, (y * raw.info.width + x) * raw.info.channels + 3)];
  const top = at(720, 5), middle = at(720, 540);
  assert.ok(top.every((v) => v < 60));
  assert.ok(middle.every((v) => v > 140));
});

test('rooms support the existing Google key alias and trim the model override', async () => {
  const png = await pngFixture();
  const h = harness({ GEMINI_API_KEY: ' ', GOOGLE_GENERATIVE_AI_API_KEY: ' synthetic-alias ',
    MIND_COUNCIL_GEMINI_IMAGE_MODEL: ' gemini-override-image ' }, () => imageResponse([inlinePart(png)]));
  const result = await h.room.generateCouncilScene('Scene', signal());
  assert.equal(h.requests[0].init.headers['x-goog-api-key'], 'synthetic-alias');
  assert.match(h.requests[0].url, /\/gemini-override-image:generateContent$/);
  assert.equal(result.model, 'gemini-override-image');
});

for (const env of [{}, { OPENAI_API_KEY: 'synthetic-unused-key', MIND_COUNCIL_IMAGE_PROVIDER: 'openai' }]) {
  test(`missing Gemini key fails preflight without HTTP (${Object.keys(env).length ? 'legacy settings' : 'empty settings'})`, async () => {
    const h = harness(env);
    assert.throws(() => h.room.requireSceneProvider(), (e) => e.status === 503 && /GEMINI_API_KEY/.test(e.message));
    await assert.rejects(h.room.generateCouncilScene('Scene', signal()), (e) => e.status === 503);
    assert.equal(h.requests.length, 0);
    assert.equal(h.helperCalls.length, 0);
  });
}

test('shared helper leaves imageConfig absent for existing callers without scene controls', async () => {
  const h = harness();
  const result = await h.helper.generateGeminiInlineImage(baseParams());
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(h.requests[0].init.body).generationConfig, { responseModalities: ['TEXT', 'IMAGE'] });
});

test('shared helper retains explicitly requested Gemini model fallback for other callers', async () => {
  const h = harness(undefined, (_url, _init, attempt) => attempt === 1
    ? Response.json({ error: { message: 'temporarily unavailable' } }, { status: 503 }) : imageResponse());
  const result = await h.helper.generateGeminiInlineImage({ ...baseParams(), modelChain: ['first-model', 'second-model'] });
  assert.equal(result.ok, true);
  assert.equal(result.image.modelUsed, 'second-model');
  assert.equal(h.requests.length, 2);
});

for (const status of [400, 403, 404, 429, 503]) {
  test(`room HTTP ${status} makes one Gemini attempt, never calls an alternate provider/model`, async () => {
    const h = harness(undefined, () => Response.json({ error: { code: status, message: 'synthetic provider error' } }, { status }));
    await assert.rejects(h.room.generateCouncilScene('Scene', signal()), (e) => e.status === (status === 429 ? 429 : 502));
    assert.equal(h.requests.length, 1);
    assert.match(h.requests[0].url, /generativelanguage\.googleapis\.com/);
  });
}

test('non-JSON 429 errors retain their status and do not leak provider text into the room', async () => {
  const h = harness(undefined, () => new Response('synthetic private upstream details', { status: 429 }));
  await assert.rejects(h.room.generateCouncilScene('Scene', signal()), (e) =>
    e.status === 429 && /Gemini/.test(e.message) && !/upstream details/.test(e.message));
  assert.equal(h.requests.length, 1);
});

for (const response of [
  { promptFeedback: { blockReason: 'SAFETY' } },
  { candidates: [{ content: { parts: [{ text: 'No image was generated.' }] } }] },
]) {
  test(`refusal or empty image preserves explicit failure (${response.promptFeedback ? 'refusal' : 'text-only'})`, async () => {
    const h = harness(undefined, () => Response.json(response));
    await assert.rejects(h.room.generateCouncilScene('Scene', signal()), (e) => e.status === 502 && /No substitute/.test(e.message));
    assert.equal(h.requests.length, 1);
  });
}

test('shared helper skips intermediate thought images and returns the final image only', async () => {
  const final = Buffer.alloc(100, 42);
  const h = harness(undefined, () => imageResponse([{ thought: true, ...inlinePart() }, inlinePart(final)]));
  const result = await h.helper.generateGeminiInlineImage(baseParams());
  assert.equal(result.ok, true);
  assert.deepEqual(result.image.imageBytes, final);
});

test('thought-only output is not treated as a usable final scene', async () => {
  const h = harness(undefined, () => imageResponse([{ thought: true, ...inlinePart() }]));
  const result = await h.helper.generateGeminiInlineImage(baseParams());
  assert.equal(result.ok, false);
  assert.equal(result.lastFailure.message, 'no_inline_image');
});

test('shared helper still supports snake_case inline image responses', async () => {
  const h = harness(undefined, () => imageResponse([{ inline_data: { data: fakeImage.toString('base64'), mime_type: 'image/webp' } }]));
  const result = await h.helper.generateGeminiInlineImage(baseParams());
  assert.equal(result.ok, true);
  assert.equal(result.image.mimeType, 'image/webp');
  assert.deepEqual(result.image.imageBytes, fakeImage);
});

test('optional encoded-size limit rejects oversized images before decoding', async () => {
  const h = harness();
  const result = await h.helper.generateGeminiInlineImage({ ...baseParams(), maxInlineDataLength: 100 });
  assert.equal(result.ok, false);
  assert.equal(result.lastFailure.message, 'inline_image_too_large');
});

test('non-image inline data cannot be stored as a room scene', async () => {
  const h = harness(undefined, () => imageResponse([inlinePart(fakeImage, 'text/plain')]));
  await assert.rejects(h.room.generateCouncilScene('Scene', signal()), (e) => e.status === 502 && /did not return an image/.test(e.message));
});

test('already-cancelled room request makes no network call', async () => {
  const h = harness();
  const controller = new AbortController();
  const reason = new Error('synthetic stop');
  controller.abort(reason);
  await assert.rejects(h.room.generateCouncilScene('Scene', controller.signal), (e) => e === reason);
  assert.equal(h.requests.length, 0);
});

test('cancellation during fetch escapes the helper without trying another model', async () => {
  const controller = new AbortController();
  const reason = new Error('synthetic stop');
  const h = harness(undefined, (_url, init) => {
    assert.equal(init.signal, controller.signal);
    controller.abort(reason);
    throw reason;
  });
  await assert.rejects(h.helper.generateGeminiInlineImage({ ...baseParams(), modelChain: ['first', 'second'], signal: controller.signal }), (e) => e === reason);
  assert.equal(h.requests.length, 1);
});

test('cancellation while reading the response does not return a completed image', async () => {
  const controller = new AbortController();
  const reason = new Error('synthetic stop');
  const h = harness(undefined, () => ({ ok: true, status: 200, text: async () => {
    controller.abort(reason);
    return JSON.stringify({ candidates: [{ content: { parts: [inlinePart()] } }] });
  } }));
  await assert.rejects(h.helper.generateGeminiInlineImage({ ...baseParams(), signal: controller.signal }), (e) => e === reason);
  assert.equal(h.requests.length, 1);
});

for (const name of ['AbortError', 'TimeoutError']) {
  test(`${name} propagates without spending on fallback models`, async () => {
    const reason = new DOMException('synthetic interruption', name);
    const h = harness(undefined, () => { throw reason; });
    await assert.rejects(h.helper.generateGeminiInlineImage({ ...baseParams(), modelChain: ['first', 'second'] }), (e) => e === reason);
    assert.equal(h.requests.length, 1);
  });
}
