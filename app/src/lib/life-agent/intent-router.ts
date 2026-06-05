import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { LifeAgentIntent } from "@/lib/life-agent/context-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";

export type RouteLifeAgentIntentInput = {
  userMessage: string;
  mode: LifeAgentMode;
};

type Rule = {
  intent: LifeAgentIntent;
  patterns: RegExp[];
  modes?: LifeAgentMode[];
};

const RULES: Rule[] = [
  {
    intent: "open_loop_review",
    patterns: [
      /\bopen\s*loops?\b/i,
      /\bwhat am i missing\b/i,
      /\bwhat('s| is) hanging\b/i,
      /\bunfinished\b/i,
      /\boverdue\b/i,
      /漏了|未完成|懸而未決|open loop/i,
    ],
  },
  {
    intent: "planning",
    patterns: [
      /\bplan my day\b/i,
      /\bplan(ning)?\b/i,
      /\bschedule\b/i,
      /\bprioriti[sz]e\b/i,
      /\bthis week\b/i,
      /規劃|計劃|安排|優先/i,
    ],
    modes: ["orchestrator", "operator"],
  },
  {
    intent: "task_creation",
    patterns: [
      /\b(create|add|new)\s+task\b/i,
      /\bbreak (it|this) down\b/i,
      /\btask(s)?\b/i,
      /創建任務|新增任務|拆解/i,
    ],
    modes: ["operator"],
  },
  {
    intent: "relationship_help",
    patterns: [
      /\brelationship\b/i,
      /\bfriend\b/i,
      /\bfamily\b/i,
      /\bpartner\b/i,
      /\bcolleague\b/i,
      /\bfollow[- ]?up\b/i,
      /人際|關係|朋友|家人/i,
    ],
  },
  {
    intent: "asset_document_help",
    patterns: [
      /\basset(s)?\b/i,
      /\bdocument(s)?\b/i,
      /\bpassport\b/i,
      /\bexpir(e|ing|ation)\b/i,
      /資產|文件|證件|到期/i,
    ],
  },
  {
    intent: "project_strategy",
    patterns: [
      /\bproject(s)?\b/i,
      /\bstrategy\b/i,
      /\broadmap\b/i,
      /\bmilestone\b/i,
      /專案|項目|策略/i,
    ],
  },
  {
    intent: "career_decision",
    patterns: [
      /\bcareer\b/i,
      /\bjob\b/i,
      /\binterview\b/i,
      /\boffer\b/i,
      /職涯|工作|面試/i,
    ],
  },
  {
    intent: "creative_work",
    patterns: [
      /\bcreative\b/i,
      /\bbrainstorm\b/i,
      /\bidea(s)?\b/i,
      /\bwrite\b/i,
      /創意|靈感|腦力激盪/i,
    ],
    modes: ["companion"],
  },
  {
    intent: "health_wellbeing",
    patterns: [
      /\bhealth\b/i,
      /\bsleep\b/i,
      /\benergy\b/i,
      /\bwellbeing\b/i,
      /\bburnout\b/i,
      /健康|睡眠|精力|倦怠/i,
    ],
  },
  {
    intent: "finance",
    patterns: [
      /\bfinance\b/i,
      /\bbudget\b/i,
      /\bmoney\b/i,
      /\bspend(ing)?\b/i,
      /財務|預算|花費|金錢/i,
    ],
  },
  {
    intent: "reflection",
    patterns: [
      /\breflect\b/i,
      /\bjournal\b/i,
      /\bhow do i feel\b/i,
      /\bwhat matters\b/i,
      /\bdirection\b/i,
      /反思|日記|方向|意義/i,
    ],
    modes: ["companion", "mirror"],
  },
  {
    intent: "life_review",
    patterns: [
      /\blife review\b/i,
      /\bbig picture\b/i,
      /\bwhere am i going\b/i,
      /人生回顧|大局/i,
    ],
  },
  {
    intent: "message_drafting",
    patterns: [
      /\bdraft\b/i,
      /\bemail\b/i,
      /\bmessage\b/i,
      /\breply\b/i,
      /草擬|郵件|訊息|回覆/i,
    ],
  },
  {
    intent: "upload_processing",
    patterns: [/\bupload\b/i, /\battach\b/i, /\bfile\b/i, /上傳|附件/i],
  },
];

const MODE_DEFAULT_INTENT: Record<LifeAgentMode, LifeAgentIntent> = {
  companion: "reflection",
  orchestrator: "planning",
  operator: "task_creation",
  mirror: "reflection",
};

/**
 * Deterministic keyword / mode router — no LLM call.
 */
export function routeLifeAgentIntent(input: RouteLifeAgentIntentInput): LifeAgentIntent {
  const text = input.userMessage.trim();
  if (!text) return MODE_DEFAULT_INTENT[input.mode];

  let best: { intent: LifeAgentIntent; score: number } | null = null;

  for (const rule of RULES) {
    if (rule.modes && !rule.modes.includes(input.mode)) continue;
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        const score = pattern.source.length + (rule.modes ? 2 : 0);
        if (!best || score > best.score) {
          best = { intent: rule.intent, score };
        }
      }
    }
  }

  if (best) return best.intent;

  if (/\b(help|think|talk)\b/i.test(text) || /幫|聊|想想/.test(text)) {
    return "general_chat";
  }

  return MODE_DEFAULT_INTENT[input.mode] ?? "unknown";
}

/** Domains likely useful for a given intent (for relevance filtering). */
export function domainsForIntent(intent: LifeAgentIntent): LifeAgentPermissionDomain[] | null {
  switch (intent) {
    case "planning":
      return ["tasks", "projects", "goals", "habits", "about_me"];
    case "open_loop_review":
      return ["tasks", "projects", "goals", "relationships", "documents", "notes"];
    case "relationship_help":
      return ["relationships", "role_models", "journal"];
    case "asset_document_help":
      return ["assets", "documents"];
    case "project_strategy":
      return ["projects", "tasks", "goals", "brain_graph"];
    case "reflection":
    case "life_review":
      return ["journal", "about_me", "bucket_list", "goals", "brain_graph"];
    case "task_creation":
      return ["tasks", "projects", "goals"];
    case "health_wellbeing":
      return ["health", "habits", "journal"];
    case "finance":
      return ["finance"];
    case "career_decision":
      return ["about_me", "goals", "projects", "notes"];
    case "creative_work":
      return ["notes", "knowledge", "bucket_list"];
    case "message_drafting":
      return ["relationships", "notes", "journal"];
    case "upload_processing":
      return ["knowledge", "documents"];
    case "general_chat":
    case "unknown":
      return null;
    default:
      return null;
  }
}

/** Mode widens baseline domains when intent is broad. */
export function domainsForMode(mode: LifeAgentMode): LifeAgentPermissionDomain[] {
  switch (mode) {
    case "orchestrator":
      return ["tasks", "projects", "goals", "habits"];
    case "operator":
      return ["tasks", "projects"];
    case "mirror":
      return ["journal", "about_me", "brain_graph", "goals"];
    case "companion":
    default:
      return ["about_me", "journal", "goals"];
  }
}

export function isDomainRelevantForContext(
  domain: LifeAgentPermissionDomain,
  intent: LifeAgentIntent,
  mode: LifeAgentMode,
): boolean {
  const intentDomains = domainsForIntent(intent);
  if (intentDomains === null) {
    return domainsForMode(mode).includes(domain);
  }
  const modeDomains = domainsForMode(mode);
  return intentDomains.includes(domain) || modeDomains.includes(domain);
}
