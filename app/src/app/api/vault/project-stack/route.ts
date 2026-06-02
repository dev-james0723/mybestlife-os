import { NextResponse } from "next/server";
import { getVaultRouteContext, parseVaultJson, selectVaultEntries } from "@/app/api/vault/_shared";
import { projectStackRequestSchema, projectStackResponseSchema } from "@/lib/vault/intelligence-schemas";
import { buildProjectStack } from "@/lib/vault/tool-stack-intelligence";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseVaultJson(request, projectStackRequestSchema);
  if (!parsed.ok) return parsed.response;

  const quota = await consumeVaultAutofillQuota({ supabase, userId: user.id, cost: 2 });
  if (!quota.allowed) {
    return NextResponse.json({ error: "rate_limited", reset: quota.reset.toISOString() }, { status: 429 });
  }

  const entries = await selectVaultEntries(supabase);
  const blueprint = buildProjectStack(entries, parsed.data);

  if (parsed.data.save) {
    const monthly = blueprint.items.reduce((sum, item) => sum + (item.estimatedMonthlyUsd ?? 0), 0);
    const { data: saved, error } = await supabase
      .from("software_stack_blueprints")
      .insert({
        user_id: user.id,
        name: blueprint.name,
        description: parsed.data.description ?? null,
        source_type: "ai_project_stack",
        project_id: parsed.data.targetType === "project" ? parsed.data.targetId ?? null : null,
        goal_id: parsed.data.targetType === "goal" ? parsed.data.targetId ?? null : null,
        status: "draft",
        estimated_monthly_cost_usd: monthly || null,
        rationale: blueprint.rationale,
        setup_order_json: blueprint.setupOrder,
        overlap_warnings_json: blueprint.missingCapabilities,
        sources_json: [{ title: "Software Vault", sourceType: "vault", usedFor: ["project stack"] }],
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: "save_failed", message: error.message }, { status: 500 });
    blueprint.blueprintId = saved.id;

    const itemRows = blueprint.items.map((item, index) => ({
      user_id: user.id,
      stack_blueprint_id: saved.id,
      software_vault_entry_id: item.entryId,
      tool_name: item.appName,
      role_in_stack: item.role,
      is_required: item.fit === "core",
      sort_order: index,
      estimated_monthly_cost_usd: item.estimatedMonthlyUsd ?? null,
      source: item.fit === "missing" ? "ai_missing_capability" : "vault",
      metadata: { fit: item.fit, reason: item.reason },
    }));
    if (itemRows.length > 0) {
      const { error: itemError } = await supabase.from("software_stack_blueprint_items").insert(itemRows);
      if (itemError) return NextResponse.json({ error: "save_items_failed", message: itemError.message }, { status: 500 });
    }

    const linkRows = blueprint.items
      .filter((item) => item.entryId)
      .map((item) => ({
        user_id: user.id,
        software_vault_entry_id: item.entryId,
        target_type: parsed.data.targetType === "custom" ? "stack_blueprint" : parsed.data.targetType,
        target_id: parsed.data.targetId ?? saved.id,
        target_label: parsed.data.targetName,
        relationship_type: "project_stack",
        role: item.role,
        confidence: "user_confirmed",
        source: "ai_project_stack",
        metadata: { stackBlueprintId: saved.id, fit: item.fit },
      }));
    if (linkRows.length > 0) {
      const { error: linkError } = await supabase.from("software_tool_links").insert(linkRows);
      if (linkError) return NextResponse.json({ error: "save_links_failed", message: linkError.message }, { status: 500 });
    }
  }

  return NextResponse.json(projectStackResponseSchema.parse(blueprint));
}
