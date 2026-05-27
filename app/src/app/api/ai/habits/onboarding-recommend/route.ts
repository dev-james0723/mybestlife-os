import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  OnboardingRecommendGeminiSchema,
  OnboardingRecommendRequestSchema,
  parseOnboardingRecommendResponse,
  type OnboardingRecommendResponse,
} from "@/lib/ai/schemas/habits/secretary";
import { buildOnboardingRecommendPrompt } from "@/lib/ai/prompts/habits/secretary";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const parsed = OnboardingRecommendRequestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<OnboardingRecommendResponse>({
      ctx,
      kind: "onboarding_recommend",
      cacheInput: {
        improvementArea: input.improvementArea,
        supportNeed: input.supportNeed,
        realisticTime: input.realisticTime,
        effort: input.effort,
        blocker: input.blocker,
      },
      forceRefresh: input.forceRefresh === true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildOnboardingRecommendPrompt(ctx.language),
          userText: [
            `Improve: ${input.improvementArea}`,
            `Support needed: ${input.supportNeed}`,
            `Realistic timing: ${input.realisticTime}`,
            `Honest effort: ${input.effort}`,
            `Common blocker: ${input.blocker}`,
          ].join("\n"),
          responseSchema: OnboardingRecommendGeminiSchema,
          temperature: 0.35,
          maxOutputTokens: 2400,
        });
        const validated = parseOnboardingRecommendResponse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
