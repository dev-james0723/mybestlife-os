import { NextResponse } from "next/server";
import { getVaultRouteContext, parseVaultJson } from "@/app/api/vault/_shared";
import { workflowRecipeSaveRequestSchema } from "@/lib/vault/intelligence-schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { supabase, user } = await getVaultRouteContext();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseVaultJson(request, workflowRecipeSaveRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { recipe, projectId, goalId } = parsed.data;

  const { data: saved, error } = await supabase
    .from("software_workflow_recipes")
    .insert({
      user_id: user.id,
      name: recipe.name,
      summary: recipe.overview,
      trigger_text: recipe.goal,
      output_text: recipe.steps.at(-1)?.output ?? null,
      project_id: projectId ?? null,
      goal_id: goalId ?? null,
      status: "draft",
      source: "ai",
      metadata: {
        generatedAt: recipe.generatedAt,
        missingCapabilities: recipe.missingCapabilities,
      },
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "save_failed", message: error.message }, { status: 500 });

  const stepRows = recipe.steps.flatMap((step) => {
    const entryIds = step.entryIds.length > 0 ? step.entryIds : [null];
    return entryIds.map((entryId) => ({
      user_id: user.id,
      workflow_recipe_id: saved.id,
      software_vault_entry_id: entryId,
      step_number: step.stepIndex,
      title: step.title,
      instruction: step.instruction,
      expected_output: step.output,
      metadata: { allEntryIds: step.entryIds },
    }));
  });
  if (stepRows.length > 0) {
    const { error: stepError } = await supabase.from("software_workflow_recipe_steps").insert(stepRows);
    if (stepError) return NextResponse.json({ error: "save_steps_failed", message: stepError.message }, { status: 500 });
  }

  const linkRows = recipe.requiredEntryIds.map((entryId) => ({
    user_id: user.id,
    software_vault_entry_id: entryId,
    target_type: "workflow_recipe",
    target_id: saved.id,
    target_label: recipe.name,
    relationship_type: "used_in_recipe",
    role: recipe.goal,
    confidence: "user_confirmed",
    source: "ai_recipe",
    metadata: { recipeName: recipe.name },
  }));
  if (linkRows.length > 0) {
    const { error: linkError } = await supabase.from("software_tool_links").insert(linkRows);
    if (linkError) return NextResponse.json({ error: "save_links_failed", message: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ id: saved.id });
}
