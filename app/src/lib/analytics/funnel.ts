import type {
  CareerOpportunity,
  OpportunityStage,
} from "@/types/database";

/** Canonical funnel order used for bar charts and stage-time calculations. */
export const FUNNEL_STAGES: OpportunityStage[] = [
  "researching",
  "applied",
  "phone_screen",
  "interviewing",
  "offer",
  "accepted",
];

export type FunnelEntry = { stage: OpportunityStage; count: number };

/**
 * Cumulative funnel — how many opportunities reached AT LEAST this stage.
 * Using cumulative counts makes the resulting chart monotonically non-increasing
 * regardless of how many opportunities are currently sitting in later states.
 */
export function computeFunnel(opps: CareerOpportunity[]): FunnelEntry[] {
  const stageIndex = new Map(FUNNEL_STAGES.map((s, i) => [s, i]));
  const maxReached: number[] = FUNNEL_STAGES.map(() => 0);
  for (const o of opps) {
    const currentIdx = stageIndex.get(o.stage);
    if (currentIdx !== undefined) {
      for (let i = 0; i <= currentIdx; i += 1) maxReached[i] += 1;
    }
    for (const stage of Object.keys(o.stage_history ?? {})) {
      const idx = stageIndex.get(stage as OpportunityStage);
      if (idx === undefined) continue;
      for (let i = 0; i <= idx; i += 1) maxReached[i] += 1;
    }
  }
  // Deduplicate opps that both had a stage_history AND a current stage.
  // Simpler approach: re-compute as max-reached stage per opp, increment once.
  const resultCounts = FUNNEL_STAGES.map(() => 0);
  for (const o of opps) {
    let best = -1;
    const currentIdx = stageIndex.get(o.stage);
    if (currentIdx !== undefined) best = currentIdx;
    for (const stage of Object.keys(o.stage_history ?? {})) {
      const idx = stageIndex.get(stage as OpportunityStage);
      if (idx !== undefined && idx > best) best = idx;
    }
    if (best < 0) continue;
    for (let i = 0; i <= best; i += 1) resultCounts[i] += 1;
  }
  return FUNNEL_STAGES.map((stage, i) => ({ stage, count: resultCounts[i] }));
}

/**
 * Median days spent in each pipeline stage before advancing. Ignores stages a
 * user hasn't moved beyond yet.
 */
export function computeStageTimes(
  opps: CareerOpportunity[],
): Array<{ stage: OpportunityStage; medianDays: number; samples: number }> {
  const samplesByStage: Record<string, number[]> = {};
  for (const stage of FUNNEL_STAGES) samplesByStage[stage] = [];

  for (const o of opps) {
    const history = o.stage_history ?? {};
    const keys = FUNNEL_STAGES.filter(
      (s) => history[s] != null,
    ) as OpportunityStage[];
    for (let i = 0; i < keys.length - 1; i += 1) {
      const from = keys[i];
      const to = keys[i + 1];
      const fromT = new Date(history[from]!).getTime();
      const toT = new Date(history[to]!).getTime();
      if (!Number.isFinite(fromT) || !Number.isFinite(toT)) continue;
      const days = Math.max(0, Math.round((toT - fromT) / 86_400_000));
      samplesByStage[from].push(days);
    }
  }

  const median = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  return FUNNEL_STAGES.map((stage) => ({
    stage,
    medianDays: median(samplesByStage[stage]),
    samples: samplesByStage[stage].length,
  }));
}

/**
 * Given opportunities and vault files, compute per-resume response rates.
 * "Interview" counts any stage ≥ phone_screen. Bumps unknown-version into an
 * "unassigned" bucket so users see its total volume.
 */
export function computeResumeResponseRates(
  opps: CareerOpportunity[],
  resumeIdToLabel: Map<string, string>,
): Array<{
  resumeId: string;
  label: string;
  applications: number;
  interviews: number;
  rate: number;
}> {
  const INTERVIEWING_STAGES: OpportunityStage[] = [
    "phone_screen",
    "interviewing",
    "offer",
    "accepted",
  ];
  const byResume = new Map<
    string,
    { applications: number; interviews: number }
  >();

  const bump = (id: string, didInterview: boolean) => {
    const entry = byResume.get(id) ?? { applications: 0, interviews: 0 };
    entry.applications += 1;
    if (didInterview) entry.interviews += 1;
    byResume.set(id, entry);
  };

  for (const o of opps) {
    const attached = o.attached_file_ids ?? [];
    const resumeIds = attached.filter((id) => resumeIdToLabel.has(id));
    const reached = INTERVIEWING_STAGES.includes(o.stage);
    if (resumeIds.length === 0) {
      bump("__unassigned__", reached);
    } else {
      for (const id of resumeIds) bump(id, reached);
    }
  }

  return Array.from(byResume.entries())
    .map(([resumeId, v]) => ({
      resumeId,
      label:
        resumeId === "__unassigned__"
          ? "— unassigned —"
          : resumeIdToLabel.get(resumeId) ?? resumeId,
      applications: v.applications,
      interviews: v.interviews,
      rate: v.applications > 0
        ? Math.round((v.interviews / v.applications) * 100)
        : 0,
    }))
    .sort((a, b) => b.applications - a.applications);
}
