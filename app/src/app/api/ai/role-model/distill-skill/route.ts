/**
 * POST /api/ai/role-model/distill-skill
 *
 * Distills a Role Model into a Mind Council–compatible "Neural Skill" (an
 * interpretive thinking lens). The route only GENERATES the lens content; the
 * client persists it to `role_model_neural_skills` (so it survives across
 * devices and powers "Talk To {name}" deep links + the Mind Council library).
 *
 * Request: { roleModelId, context }
 * Response: { result: NeuralSkillContent, meta: { modelUsed, generatedAt } }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import { errorResponse, getApiKeyOrFail, requireAuthedContext } from "../../habits/_shared";
import {
  NeuralSkillContentZ,
  NeuralSkillGeminiSchema,
  buildDistillPrompt,
  parseInsightContext,
} from "../_shared-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const roleModelId =
    typeof bodyJson.roleModelId === "string" ? bodyJson.roleModelId.trim() : "";
  if (!roleModelId) {
    return NextResponse.json({ error: "missing_role_model_id" }, { status: 400 });
  }

  const context = parseInsightContext(bodyJson.context);
  if (!context) {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const { apiKey } = apiKeyRes;

  try {
    const { data, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: buildDistillPrompt(context, ctx.language),
      userText: `Distill "${context.roleModel.name}" into a Neural Skill.`,
      responseSchema: NeuralSkillGeminiSchema,
      temperature: 0.5,
      maxOutputTokens: 3072,
      timeoutMs: 50_000,
      fallbackModel: getGeminiHabitsFlashModel(),
    });

    const parsed = NeuralSkillContentZ.safeParse(data);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[role-model/distill-skill] zod failed:", parsed.error.flatten());
      }
      throw new Error("gemini_invalid_structured_output");
    }

    // Belt-and-suspenders: enforce the impersonation guardrail server-side.
    const content = parsed.data;
    if (!/never claim to be/i.test(content.systemPromptHint)) {
      content.systemPromptHint = `${content.systemPromptHint} Never claim to be ${context.roleModel.name}; you are an interpretive lens only.`;
    }

    return NextResponse.json({
      result: content,
      meta: { modelUsed, generatedAt: new Date().toISOString() },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
