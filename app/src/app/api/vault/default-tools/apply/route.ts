import { NextResponse } from "next/server";
import { getVaultRouteContext, parseVaultJson } from "@/app/api/vault/_shared";
import { defaultToolApplyRequestSchema } from "@/lib/vault/intelligence-schemas";

export const runtime = "nodejs";

function jobKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "default_job";
}

export async function POST(request: Request) {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseVaultJson(request, defaultToolApplyRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { recommendation, exceptions } = parsed.data;

  const { data, error } = await supabase
    .from("software_default_tool_rules")
    .insert({
      user_id: user.id,
      software_vault_entry_id: recommendation.recommendedEntryId,
      job_key: jobKey(recommendation.job),
      job_label: recommendation.job,
      scope_type: "global",
      priority: 100,
      is_active: true,
      reason: recommendation.reason,
      source: "ai",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "save_failed", message: error.message }, { status: 500 });

  const { error: updateError } = await supabase
    .from("software_vault")
    .update({
      is_default_stack: true,
      default_tool_for: recommendation.job,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recommendation.recommendedEntryId)
    .eq("user_id", user.id);
  if (updateError) return NextResponse.json({ error: "update_failed", message: updateError.message }, { status: 500 });

  return NextResponse.json({ id: data.id, exceptions: exceptions ?? [] });
}
