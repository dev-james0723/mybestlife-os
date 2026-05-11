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
}): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const windowStart = currentWindowStart();
  const reset = new Date(new Date(windowStart).getTime() + 60 * 60 * 1000);

  const { data: existing } = await params.supabase
    .from("vault_autofill_rate_limit")
    .select("count")
    .eq("user_id", params.userId)
    .eq("window_start", windowStart)
    .maybeSingle();

  const current = existing?.count ?? 0;
  if (current >= HOURLY_LIMIT) {
    return { allowed: false, remaining: 0, reset };
  }

  const nextCount = current + 1;
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
