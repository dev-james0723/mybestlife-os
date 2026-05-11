/**
 * Quote Library SDK.
 *
 * Stable, typed entry points that other modules (Dashboard, MindClear,
 * Journal, Goals) will consume in their own follow-up sessions. Every
 * function is:
 *   • Client-side safe (wraps fetch to the `/api/quote-library/*` routes).
 *   • RLS-scoped (the server routes pull `auth.uid()` from cookies).
 *   • Non-throwing by default — returns `{ ok: false, error }` shape so
 *     callers never break their page render on an SDK failure.
 *
 * Server-side usage (route handlers, server components): import the
 * repository module instead — `lib/repositories/quotes.ts` — and use the
 * authenticated server client directly.
 */

import type {
  CreateQuoteInput,
  Quote,
  QuoteCategory,
} from "@/types/quote";

export type SdkResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function jsonFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<SdkResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      return { ok: false, error: payload.error ?? `http_${res.status}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network_error",
    };
  }
}

// ============================================================
// Adding quotes from other modules
// ============================================================

export type MindSweepContext = {
  sessionId?: string;
  mood?: string;
  themes?: string[];
};

/**
 * Used by the MindClear page (spec 2.7) when a user taps "Add to Quote
 * Library" on a quote the Inspire AI surfaced mid-session. Accepts free-form
 * text and attributes it to the mind-sweep session so the resulting quote
 * row has `source_module = 'mindclear'` and (optionally) a note pointing at
 * the session.
 */
export async function addQuoteFromMindSweep(input: {
  text: string;
  source_author?: string | null;
  source_context?: string | null;
  personal_note?: string | null;
  mindSweepContext?: MindSweepContext;
}): Promise<SdkResult<{ quote: Quote }>> {
  const body: CreateQuoteInput & { source_module: "mindclear" } = {
    quote_text: input.text,
    source_author: input.source_author ?? null,
    source_context: input.source_context ?? null,
    personal_note:
      input.personal_note ??
      (input.mindSweepContext?.themes?.length
        ? `Surfaced during MindClear: ${input.mindSweepContext.themes.join(", ")}`
        : null),
    source_module: "mindclear",
  };
  return jsonFetch<{ quote: Quote }>("/api/quote-library/quotes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ============================================================
// Daily Inspiration (Dashboard)
// ============================================================

export type FavoriteInspirationItem = {
  quote_id: string;
  quote_text: string;
  source_author: string | null;
  category: QuoteCategory | null;
  emotion_tone: Quote["emotion_tone"];
  is_favorite: boolean;
};

/**
 * Used by the Dashboard's Daily Inspiration card (spec 2.8 Refresh).
 * Returns up to `limit` favorite quotes eligible for surfacing today
 * (preferring ones the user hasn't seen in the last 2 weeks).
 */
export async function getFavoritesForDailyInspiration(options: {
  limit?: number;
} = {}): Promise<SdkResult<FavoriteInspirationItem[]>> {
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
  return jsonFetch<FavoriteInspirationItem[]>(
    `/api/quote-library/daily-inspiration?limit=${limit}`,
    { method: "GET" },
  );
}

// ============================================================
// Inspire Me (Dashboard button)
// ============================================================

export type InspireMeContext = {
  /** Free-form "what's top of mind right now" from the dashboard. */
  focus?: string;
  /** Recent mind-sweep snippets, in order. */
  mindSweepSnippets?: string[];
  /** Short description from the Self Profile (ties to "about me" page). */
  selfProfileSummary?: string;
};

export type InspireMeResult = {
  /** The chosen quote from the user's library (may be null if the library is empty). */
  quote: Quote | null;
  /** 1–2 sentences from the AI on why this quote today. Always present. */
  reason: string;
};

/**
 * Used by the Dashboard "Inspire me" button (spec 2.8). Pulls from the
 * library + recent mind-sweeps + the Self Profile; reaches into the
 * `resonant` RPC for a match, then asks Gemini to produce a short reason.
 */
export async function inspireMe(
  context: InspireMeContext = {},
): Promise<SdkResult<InspireMeResult>> {
  return jsonFetch<InspireMeResult>("/api/quote-library/inspire", {
    method: "POST",
    body: JSON.stringify(context),
  });
}

// ============================================================
// Resonant quotes for Journal
// ============================================================

export type ResonantQuoteMatch = {
  id: string;
  quote_text: string;
  source_author: string | null;
  category: QuoteCategory | null;
  emotion_tone: Quote["emotion_tone"];
  is_favorite: boolean;
  similarity: number;
};

/**
 * Used by the Journal page (spec 2.3). Given the text of a journal entry,
 * returns the top-N most resonant quotes from the user's library via
 * pgvector cosine similarity.
 */
export async function findResonantQuotes(input: {
  journalEntryText: string;
  limit?: number;
  threshold?: number;
}): Promise<SdkResult<ResonantQuoteMatch[]>> {
  const res = await jsonFetch<{ matches: ResonantQuoteMatch[] }>(
    "/api/quote-library/resonant",
    {
      method: "POST",
      body: JSON.stringify({
        text: input.journalEntryText,
        limit: input.limit ?? 3,
        threshold: input.threshold,
      }),
    },
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.matches };
}

// ============================================================
// Quote ↔ Goal linkage
// ============================================================

export async function linkQuoteToGoal(input: {
  quoteId: string;
  goalId: string | null;
}): Promise<SdkResult<{ quote: Quote }>> {
  return jsonFetch<{ quote: Quote }>(
    `/api/quote-library/quotes/${encodeURIComponent(input.quoteId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ linked_goal_id: input.goalId }),
    },
  );
}

export async function getQuotesForGoal(input: {
  goalId: string;
}): Promise<SdkResult<Quote[]>> {
  return jsonFetch<Quote[]>(
    `/api/quote-library/quotes?linked_goal_id=${encodeURIComponent(input.goalId)}`,
    { method: "GET" },
  );
}

// ============================================================
// MindClear contextual quote generation
// ============================================================

export type ContextualQuoteResult = {
  quote_text: string;
  source_author: string | null;
  source_context: string | null;
  reason: string;
  confidence: number;
};

/**
 * Used by the MindClear page to generate a contextually-relevant quote the
 * user hasn't seen before. Backed by Gemini with Google Search grounding
 * so the quote is real + attributed.
 */
export async function generateContextualQuote(input: {
  context: string;
  language?: string;
}): Promise<SdkResult<ContextualQuoteResult>> {
  return jsonFetch<ContextualQuoteResult>(
    "/api/quote-library/contextual",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

// ============================================================
// Surface for type sharing
// ============================================================

export type { Quote } from "@/types/quote";
