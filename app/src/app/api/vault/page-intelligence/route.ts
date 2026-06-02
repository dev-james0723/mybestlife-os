import { NextResponse } from "next/server";
import { getVaultRouteContext, selectVaultEntries } from "@/app/api/vault/_shared";
import { pageIntelligenceResponseSchema } from "@/lib/vault/intelligence-schemas";
import { buildPageIntelligence } from "@/lib/vault/tool-stack-intelligence";

export const runtime = "nodejs";

export async function GET() {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const entries = await selectVaultEntries(supabase);
  return NextResponse.json(pageIntelligenceResponseSchema.parse(buildPageIntelligence(entries)));
}
