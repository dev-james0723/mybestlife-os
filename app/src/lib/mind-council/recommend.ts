import type { MindCouncilRecommendResponse } from "./types";

type Rule = {
  keywords: string[];
  skillIds: string[];
};

/**
 * Lightweight keyword router — deterministic, privacy-friendly, no model call.
 */
const RULES: Rule[] = [
  {
    keywords: ["invest", "portfolio", "stock", "market", "moat", "valuation", "risk", "capital"],
    skillIds: ["lens-warren-buffett", "lens-charlie-munger", "lens-ray-dalio"],
  },
  {
    keywords: ["product", "launch", "startup", "ship", "mvp", "iteration", "scale", "engineering"],
    skillIds: ["lens-steve-jobs", "lens-elon-musk", "lens-sam-altman", "lens-jeff-bezos"],
  },
  {
    keywords: ["music", "concert", "album", "performance", "stage", "dance", "rhythm", "creative"],
    skillIds: ["lens-beyonce", "lens-michael-jackson", "lens-glenn-gould", "lens-lang-lang", "lens-leonard-bernstein"],
  },
  {
    keywords: ["sport", "training", "team", "game", "discipline", "practice", "endurance", "focus"],
    skillIds: ["lens-kobe-bryant", "lens-lebron-james", "lens-serena-williams"],
  },
  {
    keywords: ["lead", "speech", "team", "vision", "crisis", "negotiate", "coalition", "policy"],
    skillIds: ["lens-barack-obama", "lens-nelson-mandela", "lens-winston-churchill"],
  },
  {
    keywords: ["science", "experiment", "physics", "biology", "theory", "evidence", "research"],
    skillIds: ["lens-albert-einstein", "lens-richard-feynman", "lens-charles-darwin"],
  },
  {
    keywords: ["meaning", "stoic", "anxiety", "purpose", "values", "mindful", "peace", "philosophy"],
    skillIds: ["lens-marcus-aurelius", "lens-thich-nhat-hanh", "lens-friedrich-nietzsche", "lens-virginia-woolf"],
  },
];

const DEFAULT_ORDER = [
  "lens-steve-jobs",
  "lens-warren-buffett",
  "lens-albert-einstein",
  "lens-marcus-aurelius",
  "lens-beyonce",
];

function normalize(q: string): string {
  return q.trim().toLowerCase();
}

export function recommendMindSkills(query: string): MindCouncilRecommendResponse {
  const q = normalize(query);
  if (!q) {
    return {
      recommendedSkillIds: DEFAULT_ORDER,
      rationaleKey: "empty",
      rationale: "No topic yet — here is a balanced default council to start from.",
    };
  }

  const scores = new Map<string, number>();
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (q.includes(kw)) {
        for (const id of rule.skillIds) {
          scores.set(id, (scores.get(id) ?? 0) + 1);
        }
      }
    }
  }

  if (scores.size === 0) {
    return {
      recommendedSkillIds: DEFAULT_ORDER,
      rationaleKey: "default",
      rationale: "No strong keyword match — suggesting a versatile mix of builder, investor, scientist, and inner-life lenses.",
    };
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const merged: string[] = [];
  for (const id of ranked) {
    if (!merged.includes(id)) merged.push(id);
  }
  for (const id of DEFAULT_ORDER) {
    if (merged.length >= 5) break;
    if (!merged.includes(id)) merged.push(id);
  }

  return {
    recommendedSkillIds: merged.slice(0, 5),
    rationaleKey: "matched",
    rationale: "Matched your wording to advisor families (investing, building, arts, sports, leadership, science, or inner life) and ranked the closest lenses first.",
  };
}
