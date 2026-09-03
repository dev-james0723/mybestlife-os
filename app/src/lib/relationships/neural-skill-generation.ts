import type {
  NeuralSkillContent,
  RoleModelNeuralSkill,
} from "@/types/role-model-intelligence";

export type NeuralSkillGenerationStage = "generate" | "persist";

export type NeuralSkillApiMeta = {
  modelUsed?: string | null;
  researchModelUsed?: string | null;
  generationMode?: "grounded" | "profile_synthesis" | "profile_fallback";
  generatedAt?: string;
};

export type NeuralSkillApiResult = {
  result: NeuralSkillContent;
  meta: NeuralSkillApiMeta | null;
  warning: { code?: string; reason?: string; message?: string } | null;
};

export class NeuralSkillGenerationError extends Error {
  readonly stage: NeuralSkillGenerationStage;
  readonly code: string;
  readonly status: number | null;
  readonly detail: string | null;
  readonly originalError: unknown;

  constructor(args: {
    stage: NeuralSkillGenerationStage;
    code: string;
    message?: string;
    status?: number | null;
    detail?: string | null;
    originalError?: unknown;
  }) {
    super(args.message ?? args.code);
    this.name = "NeuralSkillGenerationError";
    this.stage = args.stage;
    this.code = args.code;
    this.status = args.status ?? null;
    this.detail = args.detail?.slice(0, 500) ?? null;
    this.originalError = args.originalError;
  }
}

type ResponseReader = Pick<Response, "ok" | "status" | "text">;

/** Parse both JSON API errors and gateway/timeout HTML without losing stage. */
export async function readNeuralSkillApiResponse(
  response: ResponseReader,
): Promise<NeuralSkillApiResult> {
  const rawText = await response.text();
  let payload: Record<string, unknown> | null = null;

  if (rawText) {
    try {
      const parsed = JSON.parse(rawText) as unknown;
      if (parsed && typeof parsed === "object") payload = parsed as Record<string, unknown>;
    } catch {
      if (!response.ok) {
        throw new NeuralSkillGenerationError({
          stage: "generate",
          code: `http_${response.status}`,
          status: response.status,
          detail: "The server returned a non-JSON error response.",
        });
      }
    }
  }

  const errorCode = typeof payload?.error === "string" ? payload.error : null;
  const detail = typeof payload?.detail === "string" ? payload.detail : null;
  if (!response.ok) {
    throw new NeuralSkillGenerationError({
      stage: "generate",
      code: errorCode ?? `http_${response.status}`,
      status: response.status,
      detail,
    });
  }

  const result = payload?.result;
  if (!result || typeof result !== "object") {
    throw new NeuralSkillGenerationError({
      stage: "generate",
      code: "missing_result",
      status: response.status,
      detail,
    });
  }

  const meta = payload?.meta && typeof payload.meta === "object"
    ? (payload.meta as NeuralSkillApiMeta)
    : null;
  const warning = payload?.warning && typeof payload.warning === "object"
    ? (payload.warning as NeuralSkillApiResult["warning"])
    : null;

  return { result: result as NeuralSkillContent, meta, warning };
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const value = (error as { code?: unknown }).code;
    if (typeof value === "string" && value) return value;
  }
  return "unknown_error";
}

export function wrapNeuralSkillGenerationError(
  error: unknown,
  stage: NeuralSkillGenerationStage,
): NeuralSkillGenerationError {
  if (error instanceof NeuralSkillGenerationError) return error;
  return new NeuralSkillGenerationError({
    stage,
    code: errorCode(error),
    message: error instanceof Error ? error.message : undefined,
    originalError: error,
  });
}

export function formatNeuralSkillGenerationError(error: unknown): string {
  const failure = wrapNeuralSkillGenerationError(error, "generate");

  if (failure.stage === "persist") {
    if (failure.code === "42P01" || failure.code === "PGRST205") {
      return "The lens was created, but Neural Skill storage is not ready yet.";
    }
    return "The lens was created, but it could not be saved. Please try again.";
  }
  if (failure.code === "unauthenticated") {
    return "Your session expired. Sign in again, then retry Neural Skill generation.";
  }
  if (failure.code === "missing_gemini_api_key") {
    return "Neural Skill generation is not configured on the server yet.";
  }
  if (failure.code === "ai_generation_failed" && failure.detail?.includes("429")) {
    return "The AI provider is out of quota and its fallback could not complete. Please try again later.";
  }
  return "Could not generate the Neural Skill. Please try again.";
}

export function neuralSkillFallbackNotice(modelUsed: string | null | undefined): string | null {
  return modelUsed === "profile-fallback"
    ? "Live AI research was unavailable, so this lens was built cautiously from the saved profile."
    : null;
}

export function mergeNeuralSkillIntoCache(
  current: RoleModelNeuralSkill[] | undefined,
  saved: RoleModelNeuralSkill,
): RoleModelNeuralSkill[] {
  return [
    saved,
    ...(current ?? []).filter((row) => row.role_model_id !== saved.role_model_id),
  ];
}

function bulletSection(title: string, items: string[] | null | undefined): string {
  if (!Array.isArray(items)) return "";
  return items.length ? `${title}:\n${items.map((item) => `- ${item}`).join("\n")}` : "";
}

/** Feed the complete Nuwa synthesis into chat instead of discarding all but its seed. */
export function buildNeuralSkillSystemPrompt(content: NeuralSkillContent): string {
  return [
    content.systemPromptHint,
    content.thinkingStyle ? `Thinking models:\n${content.thinkingStyle}` : "",
    bulletSection("Decision heuristics", content.decisionPrinciples),
    content.communicationStyle ? `Communication DNA:\n${content.communicationStyle}` : "",
    bulletSection("Characteristic questions", content.likelyQuestions),
    bulletSection("Best used for", content.bestFor),
    bulletSection("Do not use for", content.avoidFor),
    bulletSection("Blind spots and honest boundaries", content.blindSpots),
  ]
    .filter(Boolean)
    .join("\n\n");
}
