/**
 * Pure aggregators for the Career Command Center dashboard. All functions
 * operate on plain objects fetched by React Query hooks so they're easy to
 * unit-test and cheap to run client-side.
 */
import type {
  CareerNetworkNode,
  CareerOpportunity,
  CareerVaultFile,
  OpportunityStage,
} from "@/types/database";

export type WarmthTier = "hot" | "warm" | "cooling" | "cold" | "unknown";

/**
 * Categorize a network node's relationship warmth based on its most recent
 * interaction. "unknown" means we don't have any interaction on file yet.
 */
export function computeWarmth(
  lastInteractionDate: string | null | undefined,
  now: Date = new Date(),
): WarmthTier {
  if (!lastInteractionDate) return "unknown";
  const then = new Date(lastInteractionDate + "T00:00:00");
  const days = Math.floor((now.getTime() - then.getTime()) / (86_400_000));
  if (days < 0) return "hot";
  if (days <= 30) return "hot";
  if (days <= 90) return "warm";
  if (days <= 180) return "cooling";
  return "cold";
}

export function daysSince(
  isoDateOrTimestamp: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!isoDateOrTimestamp) return null;
  const then = new Date(isoDateOrTimestamp);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

/**
 * Find relationships worth re-kindling — strong (≥4) but cold/cooling (>90
 * days without interaction). Returns at most `limit` entries, coldest first.
 */
export function coldRelationships(
  nodes: CareerNetworkNode[],
  limit = 5,
  now: Date = new Date(),
): Array<CareerNetworkNode & { warmth: WarmthTier; daysSinceContact: number | null }> {
  return nodes
    .filter((n) => n.node_type === "person")
    .filter((n) => (n.size ?? 1) >= 4 || true) // strength ~ size fallback
    .map((n) => {
      const warmth = computeWarmth(n.last_interaction_date, now);
      const days = daysSince(
        n.last_interaction_date
          ? n.last_interaction_date + "T00:00:00"
          : null,
        now,
      );
      return { ...n, warmth, daysSinceContact: days };
    })
    .filter((n) => n.warmth === "cold" || n.warmth === "cooling")
    .sort(
      (a, b) =>
        (b.daysSinceContact ?? Infinity) - (a.daysSinceContact ?? Infinity),
    )
    .slice(0, limit);
}

/**
 * Opportunities that deserve today's attention: next_action_date is today or
 * in the past, or an interview is within the next 7 days.
 */
export function upcomingOpportunities(
  opps: CareerOpportunity[],
  now: Date = new Date(),
): CareerOpportunity[] {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const soon = new Date(todayStart.getTime() + 7 * 86_400_000);
  return opps
    .filter((o) => {
      if (!o.next_action_date) return false;
      const when = new Date(o.next_action_date + "T00:00:00");
      return when <= soon;
    })
    .sort((a, b) => {
      const aT = a.next_action_date ?? "9999";
      const bT = b.next_action_date ?? "9999";
      return aT.localeCompare(bT);
    })
    .slice(0, 10);
}

export function countByStage(
  opps: CareerOpportunity[],
): Record<OpportunityStage, number> {
  const counts: Record<OpportunityStage, number> = {
    researching: 0,
    applied: 0,
    phone_screen: 0,
    interviewing: 0,
    offer: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
  };
  for (const o of opps) counts[o.stage] += 1;
  return counts;
}

const ACTIVE_STAGES: OpportunityStage[] = [
  "applied",
  "phone_screen",
  "interviewing",
  "offer",
];

export function countActiveApplications(opps: CareerOpportunity[]): number {
  return opps.filter((o) => ACTIVE_STAGES.includes(o.stage)).length;
}

export function countOffers(opps: CareerOpportunity[]): number {
  return opps.filter((o) => o.stage === "offer" || o.stage === "accepted")
    .length;
}

export function countActiveInterviews(opps: CareerOpportunity[]): number {
  return opps.filter(
    (o) => o.stage === "phone_screen" || o.stage === "interviewing",
  ).length;
}

/**
 * Lazy "skills gap" — pull the most-mentioned phrases from active
 * opportunities' job descriptions. Not a real NLP pipeline; just surface
 * words the user sees repeatedly and might not have listed in their profile.
 */
export function skillsGap(
  opps: CareerOpportunity[],
  currentSkills: string[] = [],
  limit = 3,
): string[] {
  const ownSkills = new Set(
    currentSkills.map((s) => s.toLowerCase().trim()).filter(Boolean),
  );
  const counts = new Map<string, number>();

  const pattern = /\b([A-Z][A-Za-z0-9+#.]{1,19})\b/g;
  for (const o of opps) {
    if (!ACTIVE_STAGES.includes(o.stage) && o.stage !== "researching") continue;
    const desc = `${o.job_description ?? ""} ${o.role_title ?? ""}`;
    const matches = desc.match(pattern);
    if (!matches) continue;
    const seen = new Set<string>();
    for (const raw of matches) {
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (ownSkills.has(key)) continue;
      if (STOPWORDS.has(key)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

const STOPWORDS = new Set(
  [
    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "our",
    "we",
    "this",
    "that",
    "will",
    "work",
    "team",
    "role",
    "ability",
    "skills",
    "experience",
    "years",
    "year",
    "strong",
    "must",
    "nice",
    "plus",
    "required",
    "preferred",
    "us",
    "a",
    "an",
    "in",
    "on",
    "to",
    "of",
    "are",
    "is",
    "be",
    "or",
    "as",
    "by",
    "at",
    "from",
  ].map((w) => w.toLowerCase()),
);

export function countFilesByCategory(
  files: CareerVaultFile[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of files) {
    const cat = f.category ?? "other";
    out[cat] = (out[cat] ?? 0) + 1;
  }
  return out;
}

/**
 * Given a profile's `transition_progress` OR derive from signals:
 *   applications in pipeline (up to 10) + offers (up to 2) + profile completeness
 * weighted into a rough 0–100 score. Used when the user hasn't manually set a
 * transition goal yet.
 */
export function deriveTransitionProgress(params: {
  manualProgress: number | null | undefined;
  activeApps: number;
  offers: number;
  profileCompletenessPct: number;
}): number {
  if (
    params.manualProgress !== null &&
    params.manualProgress !== undefined &&
    Number.isFinite(params.manualProgress)
  ) {
    return Math.max(0, Math.min(100, Math.round(params.manualProgress)));
  }
  const appsScore = Math.min(params.activeApps, 10) * 4; // up to 40
  const offersScore = Math.min(params.offers, 2) * 20; // up to 40
  const profileScore = Math.round(params.profileCompletenessPct * 0.2); // up to 20
  return Math.max(0, Math.min(100, appsScore + offersScore + profileScore));
}
