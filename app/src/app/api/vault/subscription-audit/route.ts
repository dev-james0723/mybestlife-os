import { NextResponse } from "next/server";
import { getVaultRouteContext, parseVaultJson, selectVaultEntries } from "@/app/api/vault/_shared";
import { subscriptionAuditRequestSchema, subscriptionAuditResponseSchema } from "@/lib/vault/intelligence-schemas";
import { buildSubscriptionAudit } from "@/lib/vault/tool-stack-intelligence";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";

export const runtime = "nodejs";

function dbRecommendation(action: string) {
  if (action === "cancel_review") return "cancel_review";
  if (action === "downgrade_review") return "downgrade_review";
  if (action === "use_free_tier_review") return "use_free_tier";
  if (action === "keep") return "keep";
  return "review";
}

export async function POST(request: Request) {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseVaultJson(request, subscriptionAuditRequestSchema);
  if (!parsed.ok) return parsed.response;

  const quota = await consumeVaultAutofillQuota({ supabase, userId: user.id });
  if (!quota.allowed) {
    return NextResponse.json({ error: "rate_limited", reset: quota.reset.toISOString() }, { status: 429 });
  }

  const entries = await selectVaultEntries(supabase);
  const audit = buildSubscriptionAudit(entries);

  if (parsed.data.save) {
    const rows = audit.reviews
      .filter((review) => review.relatedEntryIds.length > 0)
      .map((review) => ({
        user_id: user.id,
        software_vault_entry_id: review.relatedEntryIds[0]!,
        review_type: review.action,
        recommendation: dbRecommendation(review.action),
        reason: review.detail,
        monthly_cost_usd: review.estimatedMonthlyUsd ?? null,
        pricing_confidence: "unknown",
        pricing_source_url: review.sources.find((source) => source.url)?.url ?? null,
        usage_summary: "Derived from launch_count, last_opened_at, default stack, and saved role fields.",
        dependency_summary: review.recommendation,
        status: "open",
        metadata: {
          title: review.title,
          sources: review.sources,
          generatedAt: audit.generatedAt,
        },
      }));
    if (rows.length > 0) {
      const { data, error } = await supabase.from("software_subscription_reviews").insert(rows).select("id");
      if (error) return NextResponse.json({ error: "save_failed", message: error.message }, { status: 500 });
      audit.savedReviewIds = (data ?? []).map((row: { id: string }) => row.id);
    } else {
      audit.savedReviewIds = [];
    }
  }

  return NextResponse.json(subscriptionAuditResponseSchema.parse(audit));
}
