import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productResearchSaveRequestSchema } from "@/lib/vault/intelligence-schemas";

export const runtime = "nodejs";

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

  const parsed = productResearchSaveRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { report, request: originalRequest, existingVaultEntryId } = parsed.data;
  const entryId = existingVaultEntryId ?? originalRequest.existingVaultEntryId ?? null;

  const { data, error } = await supabase
    .from("software_product_research_reports")
    .insert({
      user_id: user.id,
      software_vault_entry_id: entryId,
      product_name: report.productName,
      target_url: originalRequest.targetUrl ?? null,
      category: originalRequest.category ?? null,
      settings_json: originalRequest.settings ?? {},
      report_json: report,
      sources_json: report.sources,
      icon_logo_json: report.iconLogo ?? null,
      manual_illustration_prompt: report.manualIllustrationPrompt ?? null,
      manual_illustration_url: null,
      model_used: report.modelUsed ?? null,
      generated_at: report.generatedAt,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "save_failed", message: error.message }, { status: 500 });
  }

  if (entryId && report.iconLogo?.imageUrl) {
    await supabase.from("software_brand_assets").insert({
      user_id: user.id,
      software_vault_entry_id: entryId,
      product_name: report.productName,
      asset_type: report.iconLogo.sourceType === "favicon" ? "favicon" : "icon",
      image_url: report.iconLogo.imageUrl,
      source_url: report.iconLogo.sourceUrl,
      source_type: report.iconLogo.sourceType,
      confidence: report.iconLogo.confidence,
      is_primary: false,
    });
  }

  return NextResponse.json({ id: data.id });
}

