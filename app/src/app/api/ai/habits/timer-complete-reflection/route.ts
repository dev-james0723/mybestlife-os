import { NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  TimerCompleteReflectionGeminiSchema,
  parseTimerCompleteReflectionResponse,
  type TimerCompleteReflectionResponse,
} from "@/lib/ai/schemas/habits/secretary";
import { buildTimerCompleteReflectionPrompt } from "@/lib/ai/prompts/habits/secretary";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

const RequestSchema = z.object({
  timerSessionId: z.string().uuid().optional(),
  habitName: z.string().min(1).max(160),
  targetDurationSeconds: z.number().int().positive(),
  actualDurationSeconds: z.number().int().nonnegative(),
  reflectionMood: z
    .enum(["easy", "fine", "too_hard", "bad_timing", "modify_next_time"])
    .optional(),
  language: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const parsed = RequestSchema.safeParse(bodyJson);
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
    const payload = await withInsightCache<TimerCompleteReflectionResponse>({
      ctx,
      kind: "timer_complete_reflection",
      targetKind: "timer_session",
      targetId: input.timerSessionId ?? null,
      cacheInput: input,
      forceRefresh: input.forceRefresh === true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildTimerCompleteReflectionPrompt(ctx.language),
          userText: [
            `Habit or routine: ${input.habitName}`,
            `Target seconds: ${input.targetDurationSeconds}`,
            `Actual seconds: ${input.actualDurationSeconds}`,
            `Reflection mood: ${input.reflectionMood ?? "not_provided"}`,
          ].join("\n"),
          responseSchema: TimerCompleteReflectionGeminiSchema,
          temperature: 0.25,
          maxOutputTokens: 700,
        });
        const validated = parseTimerCompleteReflectionResponse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}
