import type { AppLocale } from "@/lib/i18n/app-locale";
import type {
  AnyPrompt,
  CareerProfile,
  CompiledPromptMeta,
  LocalizedString,
  VaultFile,
} from "@/types/ai-coach";
import {
  buildAttachmentContext,
  buildProfileContext,
} from "./profile-context-builder";
import { getAITool } from "@/lib/ai/tool-registry";
import type { AITool } from "@/types/ai-coach";

export interface CompilePromptArgs {
  prompt: AnyPrompt;
  locale: AppLocale;
  profile: CareerProfile | null;
  variables: Record<string, string>;
  attachments: VaultFile[];
  /** Caller supplies selected AI to compute per-tool meta. */
  tool: AITool;
}

function pickLocalized(map: LocalizedString, locale: string): string {
  return map[locale] || map["en"] || Object.values(map)[0] || "";
}

function getBody(p: AnyPrompt, locale: AppLocale): string {
  if (p.kind === "system") return pickLocalized(p.prompt_i18n, locale);
  return p.prompt_body;
}

/**
 * Substitute [VAR] tokens. Unsubstituted tokens are preserved — the UI
 * flags these so the user can't accidentally dispatch a half-filled prompt.
 */
function substitute(body: string, variables: Record<string, string>): string {
  return body.replaceAll(/\[([A-Z][A-Z0-9_]{1,40})\]/g, (match, name) => {
    const v = variables[name];
    return v != null && v.trim().length > 0 ? v : match;
  });
}

export interface CompiledPrompt {
  text: string;
  meta: CompiledPromptMeta;
  /** Variables that appear in the body but were left unsubstituted. */
  missingVariables: string[];
}

export function compilePrompt(args: CompilePromptArgs): CompiledPrompt {
  const { prompt, locale, profile, variables, attachments, tool } = args;

  const rawBody = getBody(prompt, locale);
  const substituted = substitute(rawBody, variables);

  const profileCtx = buildProfileContext(profile, locale);
  const attachCtx = buildAttachmentContext(attachments, locale);

  const text = [profileCtx, substituted, attachCtx]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");

  const missingVariables: string[] = [];
  substituted.replaceAll(/\[([A-Z][A-Z0-9_]{1,40})\]/g, (_m, name: string) => {
    if (!missingVariables.includes(name)) missingVariables.push(name);
    return _m;
  });

  const meta: CompiledPromptMeta = {
    chars: text.length,
    approxTokens: Math.ceil(text.length / 4),
    urlSupportsPrefill:
      tool === "custom" ? false : getAITool(tool).supportsUrlPrefill,
  };

  return { text, meta, missingVariables };
}

export function getLocalizedTitle(
  prompt: AnyPrompt,
  locale: AppLocale,
): string {
  return prompt.kind === "system"
    ? pickLocalized(prompt.title_i18n, locale)
    : prompt.title;
}

export function getLocalizedDescription(
  prompt: AnyPrompt,
  locale: AppLocale,
): string {
  return prompt.kind === "system"
    ? pickLocalized(prompt.description_i18n, locale)
    : "";
}
