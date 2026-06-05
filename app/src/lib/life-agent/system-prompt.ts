import type { LifeAgentContextPacket } from "@/lib/life-agent/context-types";
import { truncateContextText } from "@/lib/life-agent/prompt-budget";
import { getLifeAgentCharacterById } from "@/lib/life-agent/character-presets";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { LifeAgentProfile } from "@/types/life-agent";

const LOCALE_INSTRUCTION: Record<string, string> = {
  en: "Respond in English.",
  "zh-TW": "請使用繁體中文回覆。",
  "zh-CN": "请使用简体中文回复。",
  ja: "日本語で返信してください。",
  ko: "한국어로 답변하세요.",
  fr: "Répondez en français.",
  it: "Rispondi in italiano.",
  es: "Responde en español.",
  vi: "Trả lời bằng tiếng Việt.",
};

export type BuildLifeAgentSystemPromptInput = {
  mode: LifeAgentMode;
  profile: LifeAgentProfile | null;
  characterId: string;
  contextPacket: LifeAgentContextPacket;
  locale: AppLocale;
};

function modeBehaviorBlock(mode: LifeAgentMode): string {
  switch (mode) {
    case "companion":
      return `MODE: Companion
- Prioritize emotional clarity, reflection, and gentle check-ins.
- Do not rush to task lists unless the user asks.`;
    case "orchestrator":
      return `MODE: Orchestrator
- Help coordinate projects, priorities, and the week ahead.
- Offer clear sequencing and tradeoffs.`;
    case "operator":
      return `MODE: Operator
- Bias toward concrete next steps, drafts, and breakdowns.
- Keep lists short and actionable.`;
    case "mirror":
      return `MODE: Mirror
- Reflect patterns, values, and direction with thoughtful questions.
- Less fixing, more seeing.`;
    default:
      return `MODE: Companion`;
  }
}

function characterToneBlock(characterId: string, profile: LifeAgentProfile | null): string {
  const preset = getLifeAgentCharacterById(characterId);
  const name = profile?.custom_name?.trim() || preset?.name || "Companion";
  const hint = preset?.systemToneHint ?? "Warm, clear, and honest.";
  return `CHARACTER: ${name} (${preset?.archetype ?? "Life Companion"})
Tone guidance: ${hint}
Slider hints (0–100): warmth ${profile?.warmth ?? preset?.warmth ?? 70}, directness ${profile?.directness ?? preset?.directness ?? 50}, creativity ${profile?.creativity ?? preset?.creativity ?? 50}, strategy ${profile?.strategic_depth ?? preset?.strategicDepth ?? 50}, execution ${profile?.execution_energy ?? preset?.executionEnergy ?? 50}, gentleness ${profile?.emotional_gentleness ?? preset?.emotionalGentleness ?? 70}.`;
}

function formatContextPacket(packet: LifeAgentContextPacket): string {
  const lines: string[] = [];
  lines.push(`Intent (router): ${packet.intent}`);

  if (packet.identityContext) {
    lines.push("\n### Identity");
    if (packet.identityContext.aboutMe) lines.push(packet.identityContext.aboutMe);
    if (packet.identityContext.coreValues?.length) {
      lines.push(`Values: ${packet.identityContext.coreValues.join(", ")}`);
    }
    if (packet.identityContext.longTermGoals?.length) {
      lines.push(`Goals: ${packet.identityContext.longTermGoals.join("; ")}`);
    }
    if (packet.identityContext.knownPreferences?.length) {
      lines.push(`Preferences: ${packet.identityContext.knownPreferences.join(" | ")}`);
    }
  }

  const life = packet.activeLifeContext;
  if (life) {
    if (life.activeProjects?.length) {
      lines.push("\n### Active projects");
      for (const p of life.activeProjects) {
        lines.push(`- ${p.name} (${p.status}, ${p.priority})${p.summary ? `: ${p.summary}` : ""}`);
      }
    }
    if (life.urgentTasks?.length) {
      lines.push("\n### Urgent / open tasks");
      for (const t of life.urgentTasks) {
        lines.push(
          `- ${t.title} [${t.priority}]${t.dueDate ? ` due ${t.dueDate}` : ""}${t.isOverdue ? " OVERDUE" : ""}`,
        );
      }
    }
    if (life.upcomingDeadlines?.length) {
      lines.push("\n### Upcoming deadlines");
      for (const d of life.upcomingDeadlines) {
        lines.push(`- ${d.date}: ${d.title} (${d.kind})`);
      }
    }
    if (life.openLoops?.length) {
      lines.push("\n### Open loops");
      for (const o of life.openLoops.slice(0, 12)) {
        lines.push(`- [${o.kind}] ${o.title}${o.detail ? ` — ${o.detail}` : ""}`);
      }
    }
    if (life.recentNotes?.length) {
      lines.push("\n### Recent notes");
      for (const n of life.recentNotes) {
        lines.push(`- ${n.title}: ${n.excerpt}`);
      }
    }
  }

  if (packet.peopleContext) {
    if (packet.peopleContext.relevantRelationships.length) {
      lines.push("\n### Relationships");
      for (const r of packet.peopleContext.relevantRelationships) {
        lines.push(
          `- ${r.name} (${r.category})${r.nextAction ? ` → next: ${r.nextAction}` : ""}`,
        );
      }
    }
    if (packet.peopleContext.openPromises.length) {
      lines.push("\n### Open promises");
      for (const p of packet.peopleContext.openPromises) {
        lines.push(`- ${p.personName}: ${p.promise}`);
      }
    }
  }

  if (packet.resourceContext) {
    if (packet.resourceContext.relevantAssets.length) {
      lines.push("\n### Assets");
      for (const a of packet.resourceContext.relevantAssets) {
        lines.push(`- ${a.name}${a.category ? ` (${a.category})` : ""}`);
      }
    }
    if (packet.resourceContext.relevantDocuments.length) {
      lines.push("\n### Documents");
      for (const d of packet.resourceContext.relevantDocuments) {
        lines.push(
          `- ${d.name}${d.expirationDate ? ` expires ${d.expirationDate}` : ""}`,
        );
      }
    }
    if (packet.resourceContext.financeSummary) {
      const f = packet.resourceContext.financeSummary;
      lines.push(
        `\n### Finance (summary only)\nAccounts: ${f.accountCount}; recent spend ~${f.recentSpendTotal} ${f.currencyHint}`,
      );
    }
  }

  if (packet.reflectionContext) {
    lines.push("\n### Reflection signals");
    if (packet.reflectionContext.recentJournalThemes.length) {
      lines.push(`Journal: ${packet.reflectionContext.recentJournalThemes.join("; ")}`);
    }
    if (packet.reflectionContext.bucketListThemes.length) {
      lines.push(`Bucket list: ${packet.reflectionContext.bucketListThemes.join("; ")}`);
    }
  }

  if (packet.brainContext) {
    lines.push("\n### Brain graph (high-signal links)");
    if (packet.brainContext.patternSummary) lines.push(packet.brainContext.patternSummary);
    for (const e of packet.brainContext.relevantEdges.slice(0, 10)) {
      lines.push(`- ${e.sourceLabel} —${e.relationshipType}→ ${e.targetLabel}`);
    }
  }

  if (packet.omittedDomains.length) {
    lines.push("\n### Domains NOT included (do not claim you saw them)");
    for (const o of packet.omittedDomains) {
      lines.push(`- ${o.domain}: ${o.reason}`);
    }
  }

  if (packet.memoryUsed.length) {
    lines.push("\n### Citation index (use when stating FACTs)");
    for (const m of packet.memoryUsed.slice(0, 24)) {
      lines.push(`- [${m.sourceType}:${m.sourceId}] ${m.title}`);
    }
  }

  return lines.join("\n");
}

/**
 * Modular system prompt for the Life Companion orchestrator.
 */
export function buildLifeAgentSystemPrompt(input: BuildLifeAgentSystemPromptInput): string {
  const localeLine = LOCALE_INSTRUCTION[input.locale] ?? LOCALE_INSTRUCTION.en;
  const contextText = truncateContextText(formatContextPacket(input.contextPacket));

  return `You are the user's Life Companion inside My Best Life OS.

You are not a generic chatbot.
You are a warm, emotionally intelligent AI companion and life orchestrator.

Your job is to help the user:
- understand themselves
- organize their life
- remember important context
- make better decisions
- act with clarity
- protect their energy
- turn scattered information into coherent next steps

You must be warm but not fake.
You must be useful but not robotic.
You must be honest but not harsh.
You must never pretend to know something you do not know.
You must distinguish memory, inference, and suggestion.

## Safety (non-negotiable)
${input.contextPacket.safetyNotes.map((n) => `- ${n}`).join("\n")}
- Never claim you created, updated, deleted, sent, scheduled, or published anything unless the user explicitly confirmed and the action actually succeeded.
- You may SUGGEST actions via suggestedActions — they become review cards the user must confirm before anything runs.
- Do not invent private facts. If data is missing, say so.
- Label epistemic status when helpful: FACT (from context), MEMORY (user-confirmed), INFERENCE, SUGGESTION.
- Not professional medical, legal, or financial advice. Encourage professionals for crisis or clinical needs.

${characterToneBlock(input.characterId, input.profile)}

${modeBehaviorBlock(input.mode)}

## User context (permission-scoped Life OS snapshot)
${contextText}

## Action preview rules
- Put concrete next steps in suggestedActions when helpful (max 4).
- Allowed types: create_task, create_note, create_project, update_relationship_next_action, save_journal_entry, create_life_agent_memory, draft_message.
- Each action needs a short title, description, and payload with the fields needed to create/update (e.g. task title, note body, relationship_id + next_action).
- draft_message saves a draft only — never claim you sent anything.
- Never say "I've created…" or "Done!" — only "I can suggest…" or offer previews for the user to confirm.

## Response format
${localeLine}
Return JSON only (handled by API schema):
- reply: markdown string for the user
- suggestedActions: array (may be empty)

Keep reply focused (roughly 120–400 words unless the user asks for more).`;
}
