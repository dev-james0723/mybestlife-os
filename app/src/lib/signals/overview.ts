/**
 * Signals — AI overview (source-grounded, §16).
 *
 * Rules enforced here:
 *  - NEVER headline-only. An overview is built only from the source's own
 *    snippet/description. If that text is insufficient, we show the honest
 *    "Overview limited — open source for full details." string.
 *  - Deterministic by default: the overview defaults to the source snippet.
 *    Gemini is an OPT-IN, cached enhancement that only summarizes items which
 *    already carry substantive source text (see `/api/signals/overview`).
 *  - The overview is stored on `aiOverview` (separate from `summary`/headline).
 *  - Degrades gracefully: with Gemini off/over quota, the snippet stands in.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { SignalItem } from "./types";

/** Min chars of real source prose before an overview is worth summarizing. */
export const OVERVIEW_MIN_SNIPPET_CHARS = 48;

const LIMITED: Record<string, string> = {
  en: "Overview limited — open source for full details.",
  "zh-TW": "概要有限 — 開啟來源以了解完整內容。",
};

export function overviewLimitedText(lang: AppLocale | string): string {
  return LIMITED[lang as string] ?? LIMITED.en;
}

/** Placeholder the normalizer uses when a feed gives no snippet. */
function isPlaceholderSnippet(snippet: string | undefined): boolean {
  if (!snippet) return true;
  const s = snippet.trim().toLowerCase();
  return s.length === 0 || s.startsWith("summary limited");
}

/** True when the snippet is real source prose worth sending to Gemini. */
export function isOverviewWorthyText(snippet: string | undefined): boolean {
  if (isPlaceholderSnippet(snippet)) return false;
  return (snippet as string).trim().length >= OVERVIEW_MIN_SNIPPET_CHARS;
}

function clamp(text: string, max = 320): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Deterministic, source-grounded overview with NO network call. Uses the real
 * source snippet when present; otherwise the honest "Overview limited" string.
 */
export function buildDeterministicOverview(
  signal: Pick<SignalItem, "summary" | "headline">,
  lang: AppLocale | string,
): { text: string; grounded: boolean } {
  if (!isPlaceholderSnippet(signal.summary)) {
    return { text: clamp(signal.summary), grounded: true };
  }
  // Last resort: headline-only line so cards are never empty (user still opens source).
  const headline = signal.headline?.trim();
  if (headline && headline.length >= 16) {
    return { text: clamp(headline, 220), grounded: false };
  }
  return { text: overviewLimitedText(lang), grounded: false };
}

/** Attach a deterministic overview to a signal (idempotent; never overwrites a richer one). */
export function withDeterministicOverview(
  signal: SignalItem,
  lang: AppLocale | string,
): SignalItem {
  if (signal.aiOverview) return signal;
  const { text, grounded } = buildDeterministicOverview(signal, lang);
  return { ...signal, aiOverview: text, aiOverviewGrounded: grounded };
}

// ── Client → server overview enhancement (best-effort, cached per day) ──

export type OverviewRequestItem = {
  id: string;
  headline: string;
  snippet: string;
  topic: string;
  sourceName: string;
};

export type OverviewResult = { id: string; overview: string; grounded: boolean };

const CLIENT_CACHE_KEY = "mylifeos.signals.overviews.v1";

type ClientCache = { day: string; lang: string; byId: Record<string, OverviewResult> };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readClientCache(lang: string): Record<string, OverviewResult> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CLIENT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ClientCache;
    if (parsed.day !== today() || parsed.lang !== lang) return {};
    return parsed.byId ?? {};
  } catch {
    return {};
  }
}

function writeClientCache(lang: string, byId: Record<string, OverviewResult>): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ClientCache = { day: today(), lang, byId };
    window.localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // non-fatal
  }
}

/**
 * Best-effort AI overviews for a few hero items. Returns a map of id → result.
 * Cached per day in localStorage so re-opens are instant and cost nothing.
 * NEVER throws — on any failure the caller keeps the deterministic overview.
 */
export async function fetchSignalOverviews(
  items: OverviewRequestItem[],
  lang: AppLocale | string,
): Promise<Record<string, OverviewResult>> {
  const langKey = String(lang);
  const cached = readClientCache(langKey);
  const need = items.filter((i) => !cached[i.id] && isOverviewWorthyText(i.snippet));
  if (need.length === 0) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch("/api/signals/overview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: need, lang: langKey }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return cached;
    const data = (await res.json()) as { overviews?: OverviewResult[] };
    const merged = { ...cached };
    for (const o of data.overviews ?? []) {
      if (o && o.id && o.overview) merged[o.id] = o;
    }
    writeClientCache(langKey, merged);
    return merged;
  } catch {
    return cached;
  }
}
