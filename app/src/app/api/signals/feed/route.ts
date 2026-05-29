import { NextResponse } from "next/server";

import { aggregateCandidates } from "@/lib/signals/providers";
import type { SignalProviderRequest } from "@/lib/signals/providers/types";

export const runtime = "nodejs";
// News is shared/public; cache the candidate pool briefly at the platform edge.
export const revalidate = 900;

const OVERALL_TIMEOUT_MS = 8000;

/**
 * GET /api/signals/feed
 *
 * Runs the live, free, source-grounded providers (Google News RSS + Hacker
 * News) server-side, normalizes + dedupes, and returns the shared candidate
 * pool. It does NOT rank or personalize — that happens client-side against the
 * user's (RLS-scoped, local) Life OS context so no personal data is sent here.
 *
 * Query params: topics (csv), city, region, countryCode, lang.
 *
 * Always responds 200 with a `status` field so the client can degrade to demo
 * data gracefully (never a hard failure for a news widget).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topicsParam = searchParams.get("topics") ?? "";
  const topics = topicsParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const city = searchParams.get("city") ?? undefined;
  const region = searchParams.get("region") ?? undefined;
  const countryCode = searchParams.get("countryCode") ?? undefined;
  const lang = searchParams.get("lang") ?? "en";
  const includeVideo = searchParams.get("video") === "1";
  const includeMarkets = searchParams.get("markets") === "1";
  const customRssFeeds = (searchParams.get("rss") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OVERALL_TIMEOUT_MS);

  const req: SignalProviderRequest = {
    topics,
    location: city || region ? { city, region, countryCode } : undefined,
    lang,
    limit: 30,
    includeVideo,
    includeMarkets,
    customRssFeeds,
    signal: controller.signal,
  };

  try {
    const result = await aggregateCandidates(req);
    return NextResponse.json(
      {
        status: "ok",
        items: result.items,
        generatedAt: new Date().toISOString(),
        providers: {
          tried: result.providersTried,
          succeeded: result.providersSucceeded,
          failed: result.providersFailed.length,
        },
      },
      { headers: { "Cache-Control": "public, max-age=900, stale-while-revalidate=1800" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        items: [],
        message: err instanceof Error ? err.message : "Signals feed failed",
      },
      { status: 200 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
