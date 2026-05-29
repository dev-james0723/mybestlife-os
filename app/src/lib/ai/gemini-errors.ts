/**
 * Parse Google Generative Language API error bodies for user-facing messages.
 */

export type ParsedGeminiFailure = {
  code?: number;
  status?: string;
  message?: string;
  quotaModel?: string;
  limitZero?: boolean;
  prepayCreditsDepleted?: boolean;
};

export function parseGeminiFailureBody(raw: string): ParsedGeminiFailure {
  try {
    const j = JSON.parse(raw) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
        details?: unknown[];
      };
    };
    const e = j.error;
    if (!e) return {};

    let quotaModel: string | undefined;
    for (const d of Array.isArray(e.details) ? e.details : []) {
      if (typeof d !== "object" || d === null) continue;
      const rec = d as Record<string, unknown>;
      if (rec["@type"] !== "type.googleapis.com/google.rpc.QuotaFailure") continue;
      const violations = rec.violations;
      if (!Array.isArray(violations)) continue;
      for (const v of violations) {
        if (typeof v !== "object" || v === null) continue;
        const vr = v as Record<string, unknown>;
        const dims = vr.quotaDimensions;
        if (typeof dims === "object" && dims !== null && typeof (dims as Record<string, unknown>).model === "string") {
          quotaModel = (dims as Record<string, string>).model;
          break;
        }
      }
      if (quotaModel) break;
    }

    const msg = e.message ?? "";
    const prepayCreditsDepleted =
      /prepayment credits are depleted/i.test(msg) ||
      (/billing#prepay/i.test(msg) && e.code === 429);

    return {
      code: e.code,
      status: e.status,
      message: msg,
      quotaModel,
      limitZero: /\blimit:\s*0\b/i.test(msg),
      prepayCreditsDepleted,
    };
  } catch {
    return {};
  }
}

export function isGeminiPrepayCreditsDepleted(httpStatus: number, bodyText: string): boolean {
  if (httpStatus !== 429) return false;
  return parseGeminiFailureBody(bodyText).prepayCreditsDepleted === true;
}

export function isGeminiQuotaExhausted(httpStatus: number, bodyText: string): boolean {
  const fail = parseGeminiFailureBody(bodyText);
  return (
    httpStatus === 429 ||
    fail.status === "RESOURCE_EXHAUSTED" ||
    fail.prepayCreditsDepleted === true
  );
}

/** Short message for API responses / stored cardVisual.error (no secrets). */
export function formatGeminiBillingUserMessage(fail: ParsedGeminiFailure, modelsTried?: string[]): string {
  if (fail.prepayCreditsDepleted) {
    return (
      "Gemini prepayment credits are depleted for this API key. " +
      "Top up at Google AI Studio (https://aistudio.google.com/) → your project → Billing, " +
      "or create a new API key from a project with active credits, then update GEMINI_API_KEY on Vercel."
    );
  }
  if (fail.limitZero) {
    const qm = fail.quotaModel ? ` (${fail.quotaModel})` : "";
    return (
      `Gemini image quota limit is 0${qm}. Enable billing on the Google Cloud project for this API key, ` +
      "or switch to a key with image generation access."
    );
  }
  const tried = modelsTried?.length ? ` Models tried: ${modelsTried.join(", ")}.` : "";
  return (
    (fail.message?.slice(0, 240) || "Gemini quota or rate limit exceeded.") +
    tried +
    " See https://ai.google.dev/gemini-api/docs/rate-limits"
  );
}

/** Detect prepay / quota errors inside gemini_http_* thrown messages from gemini-text.ts */
export function parseGeminiErrorMessage(message: string): ParsedGeminiFailure {
  const m = /^gemini_http_(\d+):([\s\S]*)$/.exec(message);
  if (!m) return { message };
  return parseGeminiFailureBody(m[2] ?? "");
}

export function isGeminiBillingErrorMessage(message: string): boolean {
  const fail = parseGeminiErrorMessage(message);
  return Boolean(fail.prepayCreditsDepleted) || fail.status === "RESOURCE_EXHAUSTED";
}
