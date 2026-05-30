/**
 * Google Gemini (Generative Language API) for JSON-oriented text calls.
 * Same API key env vars as {@link app/api/daily-planner/schedule-image/route.ts} image generation.
 */

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/** Default for planner / agent-style JSON (override with GEMINI_PLANNER_MODEL or GEMINI_TEXT_MODEL). */
export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";

function uniqueGeminiModelChain(models: string[]): string[] {
  return models.filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);
}

/**
 * Extra models to try after {@link getGeminiPlannerTextModel} when calls fail (404, empty output, …).
 * Avoid unversioned `gemini-1.5-flash` — it often 404s on `v1beta`; Lite / Preview ids stay valid longer.
 * Override with comma-separated `GEMINI_TEXT_FALLBACK_MODELS`.
 */
export const DEFAULT_GEMINI_TEXT_FALLBACK_MODELS: readonly string[] = [
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
];

export function getGeminiTextFallbackModelList(): string[] {
  const raw = process.env.GEMINI_TEXT_FALLBACK_MODELS?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [...DEFAULT_GEMINI_TEXT_FALLBACK_MODELS];
}

export function getGeminiServerApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    undefined
  );
}

/** Planner + other text agents; falls back to GEMINI_TEXT_MODEL then default. */
export function getGeminiPlannerTextModel(): string {
  return (
    process.env.GEMINI_PLANNER_MODEL?.trim() ||
    process.env.GEMINI_TEXT_MODEL?.trim() ||
    DEFAULT_GEMINI_TEXT_MODEL
  );
}

/** Ordered list: configured primary, then {@link getGeminiTextFallbackModelList} (deduped). */
export function getGeminiPlannerTextModelChain(): string[] {
  return uniqueGeminiModelChain([
    getGeminiPlannerTextModel(),
    ...getGeminiTextFallbackModelList(),
  ]);
}

/**
 * Fast structured output — habit builder, routine composer, goal→habits,
 * struggle detection, correlation insight, review-habit summary.
 * Override with `GEMINI_HABITS_FLASH_MODEL`. Default: `gemini-2.5-flash`.
 */
export const DEFAULT_GEMINI_HABITS_FLASH_MODEL = "gemini-2.5-flash";

/** Nuanced prose — weekly review, quarterly narrative, "review this habit" critique.
 *  Override with `GEMINI_HABITS_PRO_MODEL`. Default: `gemini-2.5-pro`. */
export const DEFAULT_GEMINI_HABITS_PRO_MODEL = "gemini-2.5-pro";

const FALLBACK_PRO_MODEL = "gemini-2.5-pro";

export function getGeminiHabitsFlashModel(): string {
  return (
    process.env.GEMINI_HABITS_FLASH_MODEL?.trim() ||
    DEFAULT_GEMINI_HABITS_FLASH_MODEL
  );
}

export function getGeminiHabitsProModel(): string {
  return (
    process.env.GEMINI_HABITS_PRO_MODEL?.trim() ||
    DEFAULT_GEMINI_HABITS_PRO_MODEL
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractGenerateContentText(data: unknown): string {
  if (!isRecord(data)) return "";
  const promptFeedback = data.promptFeedback;
  if (isRecord(promptFeedback)) {
    const br = promptFeedback.blockReason;
    if (typeof br === "string" && br && br !== "BLOCK_REASON_UNSPECIFIED") {
      throw new Error(`gemini_blocked: ${br}`);
    }
  }
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const first = candidates[0];
  if (!isRecord(first)) return "";
  const fr = first.finishReason;
  if (typeof fr === "string" && /SAFETY|RECITATION|OTHER/i.test(fr)) {
    throw new Error(`gemini_finish: ${fr}`);
  }
  const content = first.content;
  if (!isRecord(content)) return "";
  const parts = content.parts;
  if (!Array.isArray(parts)) return "";
  const texts: string[] = [];
  for (const p of parts) {
    if (!isRecord(p)) continue;
    const t = p.text;
    if (typeof t === "string" && t.length > 0) texts.push(t);
  }
  return texts.join("").trim();
}

/**
 * Google AI Studio / Generative Language API rejects some regions ("User location is not supported").
 * Retrying other model IDs does not help — callers should fall back to local extraction or Vertex AI.
 */
export function isGeminiRegionBlockedHttpResponse(httpStatus: number, bodyText: string): boolean {
  if (httpStatus !== 400) return false;
  const t = bodyText.toLowerCase();
  return (
    t.includes("user location is not supported") ||
    t.includes("location is not supported for the api") ||
    (t.includes("failed_precondition") && t.includes("location") && t.includes("not supported"))
  );
}

/** True if an Error was thrown from our Gemini client and the message indicates region blocking. */
export function isGeminiRegionBlockedErrorMessage(message: string): boolean {
  const t = message.toLowerCase();
  return (
    t.includes("gemini_region_blocked") ||
    isGeminiRegionBlockedHttpResponse(400, message) ||
    (t.includes("failed_precondition") && t.includes("user location"))
  );
}

function shouldRetryGeminiModel(httpStatus: number, bodyText: string): boolean {
  if (httpStatus === 401 || httpStatus === 403) return false;
  if (isGeminiRegionBlockedHttpResponse(httpStatus, bodyText)) return false;
  if (httpStatus === 404) return true;
  const t = bodyText.toLowerCase();
  if (httpStatus === 400) {
    return (
      t.includes("not found") ||
      (t.includes("invalid") && t.includes("model")) ||
      t.includes("is not supported") ||
      t.includes("unsupported")
    );
  }
  return httpStatus >= 500;
}

function shouldTryNextTextModel(
  modelIndex: number,
  chainLength: number,
  msg: string,
): boolean {
  if (modelIndex >= chainLength - 1) return false;
  if (msg.startsWith("gemini_http_")) {
    const m = /^gemini_http_(\d+):([\s\S]*)$/.exec(msg);
    const status = m ? Number(m[1]) : 0;
    const body = m ? m[2] : "";
    return shouldRetryGeminiModel(status, body);
  }
  if (
    msg === "gemini_empty_content" ||
    msg === "gemini_invalid_json_body" ||
    msg === "gemini_invalid_structured_output" ||
    msg.startsWith("gemini_blocked") ||
    msg.startsWith("gemini_finish")
  ) {
    return true;
  }
  return false;
}

async function oneGenerateContentJson(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
}): Promise<string> {
  const { apiKey, model, systemInstruction, userText } = params;
  const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
      },
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`gemini_http_${res.status}: ${rawText.slice(0, 800)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("gemini_invalid_json_body");
  }

  const text = extractGenerateContentText(data);
  if (!text) {
    throw new Error("gemini_empty_content");
  }
  return text;
}

/**
 * Returns model output text (JSON string). Retries down {@link getGeminiPlannerTextModelChain} when a model id fails.
 */
export async function fetchGeminiPlannerJsonText(params: {
  apiKey: string;
  systemInstruction: string;
  userText: string;
}): Promise<{ text: string; modelUsed: string }> {
  const chain = getGeminiPlannerTextModelChain();
  const primary = chain[0] ?? DEFAULT_GEMINI_TEXT_MODEL;

  let lastError = new Error("gemini_unknown");

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!;
    try {
      const text = await oneGenerateContentJson({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        userText: params.userText,
      });
      if (model !== primary && process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] used fallback text model "${model}" (primary "${primary}" failed).`,
        );
      }
      return { text, modelUsed: model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      if (!shouldTryNextTextModel(i, chain.length, msg)) {
        throw lastError;
      }
      const next = chain[i + 1];
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] model "${model}" failed; retrying with "${next ?? "?"}". (${msg.slice(0, 200)})`,
        );
      }
    }
  }

  throw lastError;
}

export type GeminiUserContentPart =
  | { text: string }
  | { fileData: { mimeType: string; fileUri: string } };

async function oneGenerateContentJsonFromUserParts(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userParts: GeminiUserContentPart[];
  timeoutMs?: number;
}): Promise<string> {
  const { apiKey, model, systemInstruction, userParts, timeoutMs = 180_000 } = params;
  const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: userParts }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`gemini_http_${res.status}: ${rawText.slice(0, 800)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("gemini_invalid_json_body");
  }

  const text = extractGenerateContentText(data);
  if (!text) {
    throw new Error("gemini_empty_content");
  }
  return text;
}

/**
 * JSON-mode generateContent with multimodal user parts (e.g. YouTube `fileData` + text).
 * Retries down {@link getGeminiPlannerTextModelChain} like {@link fetchGeminiPlannerJsonText}.
 */
export async function fetchGeminiPlannerJsonWithUserParts(params: {
  apiKey: string;
  systemInstruction: string;
  userParts: GeminiUserContentPart[];
  timeoutMs?: number;
}): Promise<{ text: string; modelUsed: string }> {
  const chain = getGeminiPlannerTextModelChain();
  const primary = chain[0] ?? DEFAULT_GEMINI_TEXT_MODEL;

  let lastError = new Error("gemini_unknown");

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!;
    try {
      const text = await oneGenerateContentJsonFromUserParts({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        userParts: params.userParts,
        timeoutMs: params.timeoutMs,
      });
      if (model !== primary && process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] used fallback text model "${model}" (primary "${primary}" failed).`,
        );
      }
      return { text, modelUsed: model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      if (!shouldTryNextTextModel(i, chain.length, msg)) {
        throw lastError;
      }
      const next = chain[i + 1];
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] model "${model}" failed; retrying with "${next ?? "?"}". (${msg.slice(0, 200)})`,
        );
      }
    }
  }

  throw lastError;
}

async function oneGenerateContentPlain(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
  temperature: number;
  maxOutputTokens: number;
}): Promise<string> {
  const { apiKey, model, systemInstruction, contents, temperature, maxOutputTokens } = params;
  const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`gemini_http_${res.status}: ${rawText.slice(0, 800)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("gemini_invalid_json_body");
  }

  const text = extractGenerateContentText(data);
  if (!text) {
    throw new Error("gemini_empty_content");
  }
  return text;
}

/**
 * Multi-turn markdown/plain text (no JSON response schema). Retries down {@link getGeminiPlannerTextModelChain} like planner JSON.
 */
export async function fetchGeminiChatText(params: {
  apiKey: string;
  systemInstruction: string;
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ text: string; modelUsed: string }> {
  const chain = getGeminiPlannerTextModelChain();
  const primary = chain[0] ?? DEFAULT_GEMINI_TEXT_MODEL;
  const temperature = params.temperature ?? 0.45;
  const maxOutputTokens = params.maxOutputTokens ?? 8192;

  let lastError = new Error("gemini_unknown");

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!;
    try {
      const text = await oneGenerateContentPlain({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        contents: params.contents,
        temperature,
        maxOutputTokens,
      });
      if (model !== primary && process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] used fallback text model "${model}" (primary "${primary}" failed).`,
        );
      }
      return { text, modelUsed: model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      if (!shouldTryNextTextModel(i, chain.length, msg)) {
        throw lastError;
      }
      const next = chain[i + 1];
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] model "${model}" failed; retrying with "${next ?? "?"}". (${msg.slice(0, 200)})`,
        );
      }
    }
  }

  throw lastError;
}


// ============================================================
// Habits: structured output (responseSchema) + SSE streaming
// ============================================================

/**
 * Gemini's responseSchema uses an OpenAPI-3 subset, not JSON Schema. We keep
 * the surface loose (`unknown`) here; the habits schemas in
 * `lib/ai/schemas/habits/` export each feature's matching object and are the
 * source of truth.
 */
export type GeminiResponseSchema = Record<string, unknown>;

async function oneGenerateStructured<T>(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
  responseSchema: GeminiResponseSchema;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}): Promise<T> {
  const {
    apiKey,
    model,
    systemInstruction,
    userText,
    responseSchema,
    temperature,
    maxOutputTokens,
    timeoutMs,
  } = params;
  const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`gemini_http_${res.status}: ${rawText.slice(0, 800)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("gemini_invalid_json_body");
  }

  const text = extractGenerateContentText(data);
  if (!text) throw new Error("gemini_empty_content");

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("gemini_invalid_structured_output");
  }
}

/**
 * Structured JSON generation with an enforced response schema. Retries through
 * {@link getGeminiTextFallbackModelList} (plus optional `fallbackModel`) when the primary model fails.
 *
 * The caller is responsible for validating the returned object with Zod (at
 * the route-handler boundary) before writing it to Supabase or returning it
 * to the client.
 */
export async function fetchGeminiStructured<T>(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
  responseSchema: GeminiResponseSchema;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  fallbackModel?: string;
}): Promise<{ data: T; modelUsed: string }> {
  const primary = params.model;
  const chain = uniqueGeminiModelChain([
    params.model,
    ...(params.fallbackModel ? [params.fallbackModel] : []),
    ...getGeminiTextFallbackModelList(),
  ]);

  const temperature = params.temperature ?? 0.4;
  const maxOutputTokens = params.maxOutputTokens ?? 4096;
  const timeoutMs = params.timeoutMs ?? 60_000;

  let lastError = new Error("gemini_unknown");

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!;
    try {
      const data = await oneGenerateStructured<T>({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        userText: params.userText,
        responseSchema: params.responseSchema,
        temperature,
        maxOutputTokens,
        timeoutMs,
      });
      if (model !== primary && process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] structured: used fallback "${model}" (primary "${primary}" failed).`,
        );
      }
      return { data, modelUsed: model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      if (!shouldTryNextTextModel(i, chain.length, msg)) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

// ============================================================
// Structured output from multimodal user parts (inline image / PDF)
// ============================================================
//
// Same enforced `responseSchema` contract as {@link fetchGeminiStructured},
// but the user turn carries arbitrary parts — text plus inline base64 image /
// PDF bytes. Used by `/api/ai/assets/autofill` to read receipts, warranties,
// and product photos. Gemini accepts `inlineData` for images and PDFs on the
// 2.5 family.

export type GeminiInlineDataPart = {
  inlineData: { mimeType: string; data: string };
};
export type GeminiStructuredPart = { text: string } | GeminiInlineDataPart;

async function oneGenerateStructuredFromParts<T>(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userParts: GeminiStructuredPart[];
  responseSchema: GeminiResponseSchema;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}): Promise<T> {
  const {
    apiKey,
    model,
    systemInstruction,
    userParts,
    responseSchema,
    temperature,
    maxOutputTokens,
    timeoutMs,
  } = params;
  const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: userParts }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`gemini_http_${res.status}: ${rawText.slice(0, 800)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("gemini_invalid_json_body");
  }

  const text = extractGenerateContentText(data);
  if (!text) throw new Error("gemini_empty_content");

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("gemini_invalid_structured_output");
  }
}

/**
 * Structured JSON generation from multimodal user parts (text + inline
 * image/PDF bytes). Retries through {@link getGeminiTextFallbackModelList}
 * (plus optional `fallbackModel`) on model-unavailable / empty / safety
 * failures, exactly like {@link fetchGeminiStructured}. Validate the result
 * with Zod at the route boundary.
 */
export async function fetchGeminiStructuredFromParts<T>(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userParts: GeminiStructuredPart[];
  responseSchema: GeminiResponseSchema;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  fallbackModel?: string;
}): Promise<{ data: T; modelUsed: string }> {
  const primary = params.model;
  const chain = uniqueGeminiModelChain([
    params.model,
    ...(params.fallbackModel ? [params.fallbackModel] : []),
    ...getGeminiTextFallbackModelList(),
  ]);

  const temperature = params.temperature ?? 0.3;
  const maxOutputTokens = params.maxOutputTokens ?? 2048;
  const timeoutMs = params.timeoutMs ?? 60_000;

  let lastError = new Error("gemini_unknown");

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!;
    try {
      const data = await oneGenerateStructuredFromParts<T>({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        userParts: params.userParts,
        responseSchema: params.responseSchema,
        temperature,
        maxOutputTokens,
        timeoutMs,
      });
      if (model !== primary && process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] structured(parts): used fallback "${model}" (primary "${primary}" failed).`,
        );
      }
      return { data, modelUsed: model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (!shouldTryNextTextModel(i, chain.length, lastError.message)) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

// ============================================================
// Grounded research (googleSearch tool, plain text output)
// ============================================================
//
// Gemini's `googleSearch` tool gives the model live web results, but it can
// NOT be combined with `responseSchema` / `responseMimeType: application/json`
// in the same call — the API returns 400. Routes that need both grounded
// facts and structured output run a TWO-CALL pattern:
//
//   1. `fetchGeminiGroundedText` — gather facts from the web (free-form text).
//   2. `fetchGeminiStructured`  — extract a typed JSON object from the
//      research notes (no tools, just `responseSchema`).
//
// Used by: `/api/ai/role-model/autofill`.

async function oneGenerateContentGrounded(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}): Promise<string> {
  const {
    apiKey,
    model,
    systemInstruction,
    userText,
    temperature,
    maxOutputTokens,
    timeoutMs,
  } = params;
  const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`gemini_http_${res.status}: ${rawText.slice(0, 800)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("gemini_invalid_json_body");
  }

  const text = extractGenerateContentText(data);
  if (!text) throw new Error("gemini_empty_content");
  return text;
}

/**
 * Plain-text generation with Gemini's `google_search` tool enabled. Use as
 * the FIRST call in a research-then-extract pipeline; pass the returned
 * text into {@link fetchGeminiStructured} for typed JSON.
 *
 * Retries with the supplied `fallbackModel` on the same conditions as the
 * structured helper (model unavailable, empty content, safety blocks).
 */
export async function fetchGeminiGroundedText(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  fallbackModel?: string;
}): Promise<{ text: string; modelUsed: string }> {
  const primary = params.model;
  const fallback = params.fallbackModel ?? FALLBACK_PRO_MODEL;
  const chain = [primary, fallback].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );

  const temperature = params.temperature ?? 0.5;
  const maxOutputTokens = params.maxOutputTokens ?? 4096;
  const timeoutMs = params.timeoutMs ?? 60_000;

  let lastError = new Error("gemini_unknown");

  for (const model of chain) {
    try {
      const text = await oneGenerateContentGrounded({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        userText: params.userText,
        temperature,
        maxOutputTokens,
        timeoutMs,
      });
      if (model !== primary && process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] grounded: used fallback "${model}" (primary "${primary}" failed).`,
        );
      }
      return { text, modelUsed: model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      const isPrimary = model === primary;
      const hasAlt = chain.length > 1;

      if (!isPrimary || !hasAlt) throw lastError;

      if (msg.startsWith("gemini_http_")) {
        const m = /^gemini_http_(\d+):([\s\S]*)$/.exec(msg);
        const status = m ? Number(m[1]) : 0;
        const body = m ? m[2] : "";
        if (shouldRetryGeminiModel(status, body)) continue;
        throw lastError;
      }

      if (
        msg === "gemini_empty_content" ||
        msg === "gemini_invalid_json_body" ||
        msg.startsWith("gemini_blocked") ||
        msg.startsWith("gemini_finish")
      ) {
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Streaming plain-text generation via Gemini's SSE endpoint
 * (`:streamGenerateContent?alt=sse`). Invokes `onToken` for each incremental
 * chunk and resolves with the fully-assembled text once the stream ends.
 *
 * Used for weekly review, quarterly narrative, and "review this habit"
 * critiques. Callers that want to pipe tokens to the browser should wrap this
 * in a `ReadableStream`/`TextEncoderStream` inside their route handler.
 */
export async function streamGeminiText(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
  onToken?: (delta: string) => void;
  signal?: AbortSignal;
  temperature?: number;
  maxOutputTokens?: number;
  fallbackModel?: string;
}): Promise<{ text: string; modelUsed: string }> {
  const primary = params.model;
  const fallback = params.fallbackModel ?? FALLBACK_PRO_MODEL;
  const chain = [primary, fallback].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );

  const temperature = params.temperature ?? 0.6;
  const maxOutputTokens = params.maxOutputTokens ?? 8192;

  let lastError = new Error("gemini_unknown");

  for (const model of chain) {
    try {
      const text = await oneStreamGenerateContent({
        apiKey: params.apiKey,
        model,
        systemInstruction: params.systemInstruction,
        userText: params.userText,
        temperature,
        maxOutputTokens,
        onToken: params.onToken,
        signal: params.signal,
      });
      if (model !== primary && process.env.NODE_ENV !== "production") {
        console.warn(
          `[gemini] stream: used fallback "${model}" (primary "${primary}" failed).`,
        );
      }
      return { text, modelUsed: model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      const isPrimary = model === primary;
      const hasAlt = chain.length > 1;

      if (!isPrimary || !hasAlt) throw lastError;

      if (msg.startsWith("gemini_stream_started")) throw lastError;
      if (msg.startsWith("gemini_http_")) {
        const m = /^gemini_http_(\d+):([\s\S]*)$/.exec(msg);
        const status = m ? Number(m[1]) : 0;
        const body = m ? m[2] : "";
        if (shouldRetryGeminiModel(status, body)) continue;
        throw lastError;
      }
      if (
        msg === "gemini_empty_content" ||
        msg.startsWith("gemini_blocked") ||
        msg.startsWith("gemini_finish")
      ) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError;
}

async function oneStreamGenerateContent(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
  temperature: number;
  maxOutputTokens: number;
  onToken?: (delta: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const {
    apiKey,
    model,
    systemInstruction,
    userText,
    temperature,
    maxOutputTokens,
    onToken,
    signal,
  } = params;

  const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(
    model,
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { temperature, maxOutputTokens },
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`gemini_http_${res.status}: ${bodyText.slice(0, 800)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let firstTokenSeen = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);

        const dataLines = frame
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("data:"));

        for (const line of dataLines) {
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let parsed: unknown;
          try {
            parsed = JSON.parse(payload) as unknown;
          } catch {
            continue;
          }

          if (isRecord(parsed)) {
            const pf = parsed.promptFeedback;
            if (isRecord(pf)) {
              const br = pf.blockReason;
              if (
                typeof br === "string" &&
                br &&
                br !== "BLOCK_REASON_UNSPECIFIED"
              ) {
                throw new Error(`gemini_blocked: ${br}`);
              }
            }
            const candidates = parsed.candidates;
            if (
              Array.isArray(candidates) &&
              candidates[0] &&
              isRecord(candidates[0])
            ) {
              const cand = candidates[0];
              const fr = cand.finishReason;
              if (
                typeof fr === "string" &&
                /SAFETY|RECITATION|OTHER/i.test(fr)
              ) {
                throw new Error(`gemini_finish: ${fr}`);
              }
              const content = cand.content;
              if (isRecord(content) && Array.isArray(content.parts)) {
                for (const p of content.parts) {
                  if (isRecord(p) && typeof p.text === "string" && p.text) {
                    fullText += p.text;
                    if (onToken) onToken(p.text);
                    if (!firstTokenSeen) firstTokenSeen = true;
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    if (firstTokenSeen) {
      const orig = e instanceof Error ? e.message : String(e);
      throw new Error(`gemini_stream_started: ${orig}`);
    }
    throw e;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // no-op
    }
  }

  if (!fullText) throw new Error("gemini_empty_content");
  return fullText;
}
