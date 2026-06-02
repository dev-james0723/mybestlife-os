import { NextResponse } from "next/server";
import { getVaultRouteContext, selectVaultEntries } from "@/app/api/vault/_shared";
import { defaultToolRecommendationResponseSchema } from "@/lib/vault/intelligence-schemas";
import { buildDefaultToolRecommendations } from "@/lib/vault/tool-stack-intelligence";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";

export const runtime = "nodejs";

export async function POST() {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const quota = await consumeVaultAutofillQuota({ supabase, userId: user.id });
  if (!quota.allowed) {
    return NextResponse.json({ error: "rate_limited", reset: quota.reset.toISOString() }, { status: 429 });
  }

  const entries = await selectVaultEntries(supabase);
  const recommendations = buildDefaultToolRecommendations(entries);
  return NextResponse.json(defaultToolRecommendationResponseSchema.parse(recommendations));
}
