import { NextResponse } from "next/server";
import { getVaultRouteContext, parseVaultJson, safeCriticalSeverity, selectVaultEntries } from "@/app/api/vault/_shared";
import { overlapAuditRequestSchema, overlapAuditResponseSchema } from "@/lib/vault/intelligence-schemas";
import { buildOverlapAudit } from "@/lib/vault/tool-stack-intelligence";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseVaultJson(request, overlapAuditRequestSchema);
  if (!parsed.ok) return parsed.response;

  const quota = await consumeVaultAutofillQuota({ supabase, userId: user.id });
  if (!quota.allowed) {
    return NextResponse.json({ error: "rate_limited", reset: quota.reset.toISOString() }, { status: 429 });
  }

  const entries = await selectVaultEntries(supabase);
  const audit = buildOverlapAudit(entries);

  if (parsed.data.save) {
    const rows = [...audit.groups, ...audit.missingCapabilities].map((item) => ({
      user_id: user.id,
      title: item.title,
      summary: item.detail,
      severity: safeCriticalSeverity(item.severity),
      group_type: item.action,
      entry_ids: item.relatedEntryIds,
      evidence_json: {
        sources: item.sources,
        estimatedMonthlyUsd: item.estimatedMonthlyUsd ?? null,
        generatedAt: audit.generatedAt,
      },
      recommendations_json: [item.recommendation],
      status: "open",
    }));
    if (rows.length > 0) {
      const { data, error } = await supabase.from("software_overlap_groups").insert(rows).select("id");
      if (error) return NextResponse.json({ error: "save_failed", message: error.message }, { status: 500 });
      audit.savedGroupIds = (data ?? []).map((row: { id: string }) => row.id);
    } else {
      audit.savedGroupIds = [];
    }
  }

  return NextResponse.json(overlapAuditResponseSchema.parse(audit));
}
