import { createClient } from "@/lib/supabase/client";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { DailyInsights } from "@/types/database";

export type GenerateInsightsResult =
  | { ok: true; data: DailyInsights; cached: boolean }
  | { ok: false; error: string; status: number };

/**
 * Invokes the `generate-daily-insights` edge function with the user's bearer
 * token. The function is idempotent per (user, date) — calling it twice in
 * one day simply returns the cached row.
 */
export async function generateDailyInsights(options?: {
  force?: boolean;
}): Promise<GenerateInsightsResult> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseKey();
  if (!url || !anonKey) {
    return { ok: false, status: 500, error: "server_misconfigured" };
  }

  const supabase = createClient();
  const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
  if (sessErr || !sessionData.session) {
    return { ok: false, status: 401, error: "not_authenticated" };
  }

  const endpoint = `${url.replace(/\/$/, "")}/functions/v1/generate-daily-insights`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ force: !!options?.force }),
    });
  } catch {
    return { ok: false, status: 0, error: "network" };
  }

  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (res.ok && body.insights) {
    return {
      ok: true,
      data: body.insights as DailyInsights,
      cached: !!body.cached,
    };
  }

  return {
    ok: false,
    status: res.status,
    error: typeof body.error === "string" ? body.error : "unknown",
  };
}
