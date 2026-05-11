import type { AppLocale } from "@/lib/i18n/app-locale";
import type { PromptCreatorWizardState, PromptTopCategory } from "@/types/prompt";

/**
 * Builds the user message sent to Gemini for wizard synthesis (Phase 4).
 */
export function buildWizardSynthesisUserMessage(
  state: PromptCreatorWizardState,
  locale: AppLocale,
): string {
  const tones = state.toneStyle.filter(Boolean).join(", ") || "(none specified)";
  const vars = state.variables.map((v) => ({
    name: v.name,
    label: v.label,
    required: v.required,
    description: v.description,
    example: v.example,
  }));
  const ex = state.examples
    .filter((e) => e.input.trim() || e.expectedOutput.trim())
    .map((e, i) => ({
      index: i + 1,
      user: e.input.trim(),
      assistant: e.expectedOutput.trim(),
    }));

  return JSON.stringify(
    {
      appLocale: locale,
      goal: state.goal.trim(),
      expertRole: state.expertRole.trim(),
      context: state.context.trim(),
      outputFormat: state.outputFormat.trim(),
      toneStyle: tones,
      variablesAuthorView: vars,
      guardrails: state.guardrails.trim(),
      examples: ex,
    },
    null,
    2,
  );
}

export function wizardSynthesisSystemInstruction(
  topCategories: readonly PromptTopCategory[],
): string {
  const enumLine = topCategories.join(", ");
  return `You are a senior prompt engineer helping a user author a reusable LLM system/user prompt for a personal productivity app.

Your task: read the structured JSON the user sends (goal, expertRole, context, outputFormat, toneStyle, variablesAuthorView, guardrails, examples). Then output ONE JSON object ONLY (no markdown fences) with this exact shape:
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
- Write the prompt so it stands alone: include role, task, output expectations, and constraints from the user's fields.
- If variablesAuthorView is non-empty, the body MUST include a placeholder {name} for every listed name (exact spelling). You may add additional variables only if clearly needed; list every placeholder you introduce in "variables".
- If variablesAuthorView is empty, infer 0–6 high-value variables yourself when the task clearly benefits (otherwise use an empty array and a body without placeholders).
- Reflect toneStyle and guardrails in the prose.
- If examples are provided, weave similar structure or a short few-shot block into the body when it improves reliability.

Rules for "top_category": MUST be exactly one of these literal strings:
${enumLine}

Rules for "tags": 3–8 concise tags, lowercase or kebab-case, no hashtags.

Never include commentary outside the JSON object.`;
}
