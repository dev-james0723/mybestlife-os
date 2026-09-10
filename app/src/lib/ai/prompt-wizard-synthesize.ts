import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  extractVariableNames,
  type PromptTopCategory,
  type PromptVariable,
} from "@/types/prompt";

export type PromptWizardSynthesisInput = {
  goalOrRoughPrompt: string;
  context: string;
  outputFormat: string;
  toneStyle: string[];
};

/** Builds the user message from the three answers visible in the current UI. */
export function buildWizardSynthesisUserMessage(
  state: PromptWizardSynthesisInput,
  locale: AppLocale,
): string {
  const tones = state.toneStyle.filter(Boolean).join(", ") || "(none specified)";

  return JSON.stringify(
    {
      appLocale: locale,
      goalOrRoughPrompt: state.goalOrRoughPrompt.trim(),
      context: state.context.trim(),
      outputFormat: state.outputFormat.trim(),
      toneStyle: tones,
    },
    null,
    2,
  );
}

/**
 * Keeps saved variable metadata aligned with a user-edited prompt body.
 * Metadata from synthesis is preserved only for placeholders that still
 * exist; newly typed placeholders receive safe defaults.
 */
export function reconcilePromptVariables(
  body: string,
  suggested: readonly PromptVariable[],
): PromptVariable[] {
  const suggestedByName = new Map(
    suggested.map((variable) => [variable.name.trim(), variable] as const),
  );

  return extractVariableNames(body).map((name) => {
    const match = suggestedByName.get(name);
    return {
      name,
      label: match?.label?.trim() || null,
      description: match?.description?.trim() || null,
      required: match?.required ?? true,
      example: match?.example?.trim() || null,
    };
  });
}

export function wizardSynthesisSystemInstruction(
  topCategories: readonly PromptTopCategory[],
): string {
  const enumLine = topCategories.join(", ");
  return `You are a senior prompt engineer helping a user improve or author a reusable LLM prompt for a personal productivity app.

Your task: read the short structured JSON the user sends (goalOrRoughPrompt, context, outputFormat, toneStyle). The first field may be either a plain-language outcome or an existing rough prompt. If it is a rough prompt, preserve its intent while making it clearer, more reliable, and reusable. Then output ONE JSON object ONLY (no markdown fences) with this exact shape:
{
  "title": "short human title for the prompt card",
  "description": "one-line summary of what the prompt does",
  "body": "the full prompt text the downstream model will see. Use clear sections where helpful. For every dynamic input the end user will fill in at run time, use single-brace placeholders like {topic} matching [a-zA-Z_][a-zA-Z0-9_]* only.",
  "variables": [
    {
      "name": "topic",
      "label": "Topic",
      "description": "what the user should enter",
      "required": true,
      "example": "optional short example"
    }
  ],
  "tags": ["lowercase-or-kebab", "max-twelve-items"],
  "top_category": "one-of-enum"
}

Rules for "body":
- Write the prompt so it stands alone: include a useful role, task, output expectations, and the user's visible constraints when they improve the result.
- Infer 0–6 high-value variables when the task clearly benefits; list every placeholder you introduce in "variables". Otherwise, use an empty array and a body without placeholders.
- Reflect the requested output format and tone without adding needless boilerplate.
- Never copy the surrounding JSON labels into the final body.

Rules for "top_category": MUST be exactly one of these literal strings:
${enumLine}

Rules for "tags": 3–8 concise tags, lowercase or kebab-case, no hashtags.

Never include commentary outside the JSON object.`;
}
