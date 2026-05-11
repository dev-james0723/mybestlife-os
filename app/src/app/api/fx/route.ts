import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FxRatesPayload } from "@/lib/fx/types";

export const runtime = "nodejs";

const FRANKFURTER = "https://api.frankfurter.app/latest";

function isIso4217(value: string): boolean {
  return /^[A-Za-z]{3}$/.test(value);
}

/**
 * Proxies Frankfurter latest rates for `from` (base) currency.
 * Authenticated only. Cached at the edge for one hour.
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawFrom = searchParams.get("from") ?? "USD";
  const from = rawFrom.trim().toUpperCase();
  if (!isIso4217(from)) {
    return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
  }

  const upstream = await fetch(`${FRANKFURTER}?from=${encodeURIComponent(from)}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);

  if (!upstream || !upstream.ok) {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  const body = (await upstream.json()) as Omit<FxRatesPayload, "fetchedAt">;
  if (
    typeof body.base !== "string" ||
    typeof body.rates !== "object" ||
    body.rates === null ||
    Array.isArray(body.rates)
  ) {
    return NextResponse.json({ error: "invalid_upstream" }, { status: 502 });
  }

  const payload: FxRatesPayload = {
    ...body,
    base: body.base.toUpperCase(),
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=3600",
    },
  });
}
