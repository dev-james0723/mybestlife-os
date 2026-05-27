import type { createServerSupabaseClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const HOURLY_LIMIT = 20;

/** Start of the current hour in ISO form — matches Postgres TIMESTAMPTZ comparisons. */
function currentWindowStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

/**
 * Checks and increments the user's vault autofill usage for the current hour.
 * Returns `{ allowed: true }` when below the cap, or `{ allowed: false, reset }`
 * when the user should back off. Uses an upsert + increment so the counter is
 * atomic enough for our ~20/h ceiling without a server-side function.
 */
export async function consumeVaultAutofillQuota(params: {
  supabase: Supabase;
  userId: string;
  /** Credits consumed (default 1). Grounded autofill uses 2. */
  cost?: number;
}): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const cost = Math.max(1, Math.floor(params.cost ?? 1));
  const windowStart = currentWindowStart();
  const reset = new Date(new Date(windowStart).getTime() + 60 * 60 * 1000);

  const { data: existing } = await params.supabase
    .from("vault_autofill_rate_limit")
    .select("count")
    .eq("user_id", params.userId)
    .eq("window_start", windowStart)
    .maybeSingle();

  const current = existing?.count ?? 0;
  if (current + cost > HOURLY_LIMIT) {
    return { allowed: false, remaining: Math.max(0, HOURLY_LIMIT - current), reset };
  }

  const nextCount = current + cost;
  if (existing) {
    await params.supabase
      .from("vault_autofill_rate_limit")
      .update({ count: nextCount, updated_at: new Date().toISOString() })
      .eq("user_id", params.userId)
      .eq("window_start", windowStart);
  } else {
    await params.supabase.from("vault_autofill_rate_limit").insert({
      user_id: params.userId,
      window_start: windowStart,
      count: 1,
    });
  }

  return { allowed: true, remaining: HOURLY_LIMIT - nextCount, reset };
}
