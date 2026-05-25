/**
 * POST /api/career/asset-audit
 *
 * Body: { locale? }
 *
 * Audits the user's career_vault_files + profile for personal-brand asset gaps,
 * writes the result to career_profile.personal_brand_assets, and returns
 * { ok, audit }.
 */

import { NextResponse } from "next/server";
import type { CareerProfile } from "@/types/database";
import { auditAssetGap } from "@/lib/career-mirror/ai/asset-audit";
import {
  requireUser,
  readJsonBody,
  resolveLocale,
  aiFailure,
} from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const locale = await resolveLocale(supabase, user.id, parsed.body);

  const [{ data: profile }, { data: files }] = await Promise.all([
    supabase
      .from("career_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("career_vault_files")
      .select("category, filename, description")
      .eq("user_id", user.id),
  ]);

  const vaultFiles = ((files as Array<{
    category: string;
    filename: string;
    description: string | null;
  }> | null) ?? []).map((f) => ({
    category: f.category,
    filename: f.filename,
    description: f.description,
  }));

  try {
    const { data: audit } = await auditAssetGap({
      vaultFiles,
      profile: (profile as CareerProfile | null) ?? {},
      locale,
    });

    await supabase
      .from("career_profile")
      .upsert(
        {
          user_id: user.id,
          personal_brand_assets: audit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    return NextResponse.json({ ok: true, audit });
  } catch (e) {
    return aiFailure(e);
  }
}
