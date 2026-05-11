/**
 * Tiny client-side primitives shared by every bio-lab AI fetcher.
 *
 * The fetcher contract:
 *   - Returns a typed `AIInsightPayload<T>` on success (cached or fresh).
 *   - Throws a typed `BioLabAIError` on non-2xx so callers can branch on
 *     `kind === "rate_limited"` or surface a graceful fallback.
 *   - Never reads from the global window/document directly — language is
 *     always passed in by the caller (which gets it from the app store).
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { AIInsightPayload } from "@/hooks/use-ai-insight";

export type BioLabAIErrorKind =
  | "unauthenticated"
  | "rate_limited"
  | "validation"
  | "server"
  | "network";

function formatBioLabAiErrorMessage(
  kind: BioLabAIErrorKind,
  status: number,
  body: string,
): string {
  const base = `bio_lab_ai_${kind}_${status}`;
  try {
    const j = JSON.parse(body) as { detail?: unknown; error?: unknown };
    if (typeof j.detail === "string" && j.detail.trim()) {
      return `${base}: ${j.detail.trim().slice(0, 400)}`;
    }
    if (typeof j.error === "string" && j.error.trim()) {
      return `${base}: ${j.error.trim().slice(0, 200)}`;
    }
  } catch {
    /* non-JSON body */
  }
  return base;
}

export class BioLabAIError extends Error {
  readonly kind: BioLabAIErrorKind;
  readonly status: number;
  readonly body: string;
  constructor(kind: BioLabAIErrorKind, status: number, body: string) {
    super(formatBioLabAiErrorMessage(kind, status, body));
    this.kind = kind;
    this.status = status;
    this.body = body;
  }
}

function classifyStatus(status: number): BioLabAIErrorKind {
  if (status === 401 || status === 403) return "unauthenticated";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 413) return "validation";
  if (status >= 500) return "server";
  return "server";
}

export type FetchBioLabAIParams<TBody extends Record<string, unknown>> = {
  endpoint: string;
  body: TBody;
  language: AppLocale;
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export async function fetchBioLabAI<TContent>(
  params: FetchBioLabAIParams<Record<string, unknown>>,
): Promise<AIInsightPayload<TContent>> {
  let res: Response;
  try {
    res = await fetch(`/api/ai/bio-lab/${params.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params.body,
        language: params.language,
        forceRefresh: params.forceRefresh ?? false,
      }),
      signal: params.signal,
    });
  } catch (e) {
    throw new BioLabAIError("network", 0, e instanceof Error ? e.message : String(e));
  }

  if (!res.ok) {
    const body = await safeReadText(res);
    throw new BioLabAIError(classifyStatus(res.status), res.status, body);
  }

  return (await res.json()) as AIInsightPayload<TContent>;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
