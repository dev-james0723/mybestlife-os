import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productResearchApplyRequestSchema } from "@/lib/vault/intelligence-schemas";
import type { ConfidenceLevel, FieldSource } from "@/types/vault-smart-autofill";

export const runtime = "nodejs";

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(asString).filter(Boolean).join(", ");
  return "";
}

function trim(v: unknown): string {
  return asString(v).trim();
}

function safeCostAmount(v: unknown): number | null {
  const raw = trim(v);
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function buildServerVaultPayload(fields: Record<string, unknown>, options?: { partial?: boolean }) {
  const now = new Date().toISOString();
  const keys = Object.keys(fields).filter((key) => trim(fields[key]) !== "");
  const fieldConfidence = Object.fromEntries(
    keys.map((key) => [key, "user_confirmed" satisfies ConfidenceLevel]),
  ) as Record<string, ConfidenceLevel>;
  const fieldSources: FieldSource[] = keys.map((field) => ({
    field,
    source_type: "user_input",
    confidence: "user_confirmed",
    fetched_at: now,
  }));
  const payload = {
    app_name: trim(fields.app_name),
    website_url: trim(fields.website_url) || null,
    icon_url: trim(fields.icon_url) || null,
    category: trim(fields.category) || null,
    platforms: trim(fields.platforms) || null,
    use_cases: trim(fields.use_cases) || null,
    status: (trim(fields.status) || "Testing") as "Testing" | "Active" | "Retired" | "Wishlist",
    priority: (trim(fields.priority) || "Nice-to-have") as "Must-have" | "Nice-to-have" | "Optional",
    cost_type: (trim(fields.cost_type) || "Free") as "Free" | "Freemium" | "Paid" | "Subscription",
    cost_amount: safeCostAmount(fields.cost_amount),
    cost_period: trim(fields.cost_period) || null,
    why_i_use_it: trim(fields.why_i_use_it) || null,
    best_feature: trim(fields.best_feature) || null,
    biggest_downside: trim(fields.biggest_downside) || null,
    best_alternative: trim(fields.best_alternative) || null,
    replaces: trim(fields.replaces) || null,
    tags: trim(fields.tags) || null,
    default_tool_for: trim(fields.default_tool_for) || null,
    summary: trim(fields.summary) || null,
    ai_generated_fields: keys,
    field_confidence: fieldConfidence,
    field_sources: fieldSources,
    pricing_last_checked_at: now,
  };
  if (!options?.partial) return payload;
  const out: Record<string, unknown> = {
    ai_generated_fields: keys,
    field_confidence: fieldConfidence,
    field_sources: fieldSources,
    pricing_last_checked_at: now,
  };
  for (const key of keys) {
    if (key in payload) out[key] = payload[key as keyof typeof payload];
  }
  return out;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = productResearchApplyRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const req = parsed.data;
  const createPayload = buildServerVaultPayload(req.fields);
  if (!trim(req.fields.app_name)) {
    return NextResponse.json({ error: "missing_app_name" }, { status: 400 });
  }

  if (req.existingVaultEntryId) {
    const patch = buildServerVaultPayload(req.fields, { partial: true });
    const { data, error } = await supabase
      .from("software_vault")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", req.existingVaultEntryId)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id, action: "updated" });
  }

  if (!req.createNewEntry) {
    return NextResponse.json({ error: "missing_target" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("software_vault")
    .insert({ ...createPayload, user_id: user.id })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "create_failed", message: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, action: "created" });
}
