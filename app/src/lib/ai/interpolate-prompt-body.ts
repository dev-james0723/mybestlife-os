import { extractVariableNames, type PromptVariable } from "@/types/prompt";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Substitutes `{name}` placeholders in `body` with values from `values`.
 * Longer names are applied first so `topic` does not truncate `topic_id`.
 */
export function interpolatePromptBody(
  body: string,
  values: Record<string, string>,
): string {
  const names = Object.keys(values).sort((a, b) => b.length - a.length);
  let out = body;
  for (const name of names) {
    const re = new RegExp(`\\{${escapeRegex(name)}\\}`, "g");
    out = out.replace(re, values[name] ?? "");
  }
  return out;
}

/** Returns names declared on the prompt, or names inferred from `{x}` in the body. */
export function effectiveVariableSpecs(
  declared: PromptVariable[],
  body: string,
): PromptVariable[] {
  if (declared.length > 0) return declared;
  return extractVariableNames(body).map((name) => ({
    name,
    label: null,
    description: null,
    required: true,
    example: null,
  }));
}

export function validateVariableValues(
  specs: PromptVariable[],
  values: Record<string, string>,
): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  for (const v of specs) {
    if (!v.required) continue;
    const raw = values[v.name];
    if (raw === undefined || raw.trim() === "") {
      missing.push(v.name);
    }
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}
