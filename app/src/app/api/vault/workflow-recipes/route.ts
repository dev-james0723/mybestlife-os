import { NextResponse } from "next/server";
import { getVaultRouteContext, parseVaultJson, selectVaultEntries } from "@/app/api/vault/_shared";
import { workflowRecipeRequestSchema, workflowRecipeResponseSchema } from "@/lib/vault/intelligence-schemas";
import { buildWorkflowRecipe } from "@/lib/vault/tool-stack-intelligence";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseVaultJson(request, workflowRecipeRequestSchema);
  if (!parsed.ok) return parsed.response;

  const quota = await consumeVaultAutofillQuota({ supabase, userId: user.id, cost: 2 });
  if (!quota.allowed) {
    return NextResponse.json({ error: "rate_limited", reset: quota.reset.toISOString() }, { status: 429 });
  }

  const entries = await selectVaultEntries(supabase);
  const recipe = buildWorkflowRecipe(entries, parsed.data);
  return NextResponse.json(workflowRecipeResponseSchema.parse(recipe));
}
