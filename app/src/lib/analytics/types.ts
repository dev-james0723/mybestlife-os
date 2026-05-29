import type {
  DailyPlan,
  Goal,
  JapaneseStudySession,
  JournalEntry,
  Project,
  Task,
} from "@/types/database";
import type { BrainGraphData } from "@/lib/brain/compat";

export type AnalyticsRangeKey =
  | "3D"
  | "7D"
  | "30D"
  | "2M"
  | "90D"
  | "6M"
  | "1Y"
  | "5Y"
  | "10Y";

export type AnalyticsRange = {
  key: AnalyticsRangeKey;
  label: string;
  behavior: string;
  days: number;
  start: Date;
  end: Date;
  startISO: string;
  endISO: string;
  previousStart: Date;
  previousEnd: Date;
  previousStartISO: string;
  previousEndISO: string;
  isLongRangePlaceholder: boolean;
};

export type AnalyticsRangeOption = {
  key: AnalyticsRangeKey;
  label: string;
  behavior: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type PulseScoreKey =
  | "completion_momentum"
  | "focus_consistency"
  | "emotional_load"
  | "system_coherence";

export type PulseTrendDirection = "up" | "down" | "steady";

export type LifePulseScore = {
  key: PulseScoreKey;
  label: string;
  score: number;
  trend: PulseTrendDirection;
  trendValue: number;
  trendLabel: string;
  interpretation: string;
  signal: string;
  tone: "positive" | "watch" | "neutral" | "load";
};

export type MomentumWavePoint = {
  date: string;
  label: string;
  completedTasks: number;
  plannedItems: number;
  overduePressure: number;
  studyMinutes: number;
  studyBlocks: number;
  journalIntensity: number | null;
  activityScore: number;
};

export type MomentumWave = {
  points: MomentumWavePoint[];
  interpretation: string;
  hasData: boolean;
};

export type DomainKey =
  | "execution"
  | "career"
  | "knowledge"
  | "health"
  | "finance"
  | "relationships"
  | "creativity"
  | "reflection";

export type DomainRadarPoint = {
  key: DomainKey;
  domain: string;
  score: number;
  confidence: "low" | "medium" | "high";
  signal: string;
};

export type DomainRadar = {
  points: DomainRadarPoint[];
  interpretation: string;
};

export type ProjectMomentumState =
  | "accelerating"
  | "steady"
  | "quiet"
  | "stuck"
  | "overloaded"
  | "ready_to_finish";

export type ProjectMomentumCard = {
  id: string;
  name: string;
  status: Project["status"];
  priority: Project["priority"];
  linkedTasksCount: number;
  completedInRange: number;
  overdueTasks: number;
  openTasks: number;
  plannedMentions: number;
  progressPercent: number;
  lastMeaningfulActivity: string | null;
  lastMeaningfulActivityLabel: string;
  state: ProjectMomentumState;
  stateLabel: string;
  interpretation: string;
};

export type ProjectMomentumMap = {
  projects: ProjectMomentumCard[];
  stateCounts: Record<ProjectMomentumState, number>;
  interpretation: string;
};

export type EmotionQuadrant = JournalEntry["quadrant"];

export type EmotionExecutionBucket = {
  key: string;
  label: string;
  startISO: string;
  endISO: string;
  averageIntensity: number | null;
  dominantQuadrant: EmotionQuadrant | null;
  completedTasks: number;
  plannedItems: number;
  dailyPlanActive: boolean;
  loadScore: number;
  executionScore: number;
};

export type EmotionExecution = {
  buckets: EmotionExecutionBucket[];
  interpretation: string;
  hasJournalData: boolean;
  hasExecutionData: boolean;
  granularity: "day" | "week";
};

export type BrainDomainHealth = {
  domain: string;
  nodes: number;
  degree: number;
};

export type BrainHealth = {
  totalNodes: number;
  totalEdges: number;
  orphanRate: number;
  orphanCount: number;
  averageDegree: number;
  isolatedDomains: string[];
  topConnectedDomains: BrainDomainHealth[];
  suggestedMissingConnections: string[];
  interpretation: string;
  hasBrainData: boolean;
};

export type AIAnalyticsInsight = {
  summary: string;
  progress: string[];
  blindSpots: string[];
  hiddenPattern: string;
  nextBestMove: string;
  stopDoing: string;
  protect: string;
  confidence: "low" | "medium" | "high";
};

export type AnalyticsTotals = {
  completedTasks: number;
  completedTasksPrevious: number;
  plannedItems: number;
  overdueTasks: number;
  studyMinutes: number;
  journalEntries: number;
  activeProjects: number;
  activeGoals: number;
  linkedTaskRatio: number;
  projectGoalLinkRatio: number;
};

export type LifeAnalyticsInput = {
  range: AnalyticsRange;
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  journalEntries: JournalEntry[];
  studySessions: JapaneseStudySession[];
  dailyPlans: DailyPlan[];
  brainGraph: BrainGraphData | null;
};

export type LifeAnalytics = {
  range: AnalyticsRange;
  generatedAt: string;
  statusSummary: string;
  pulseScores: LifePulseScore[];
  totals: AnalyticsTotals;
  momentumWave: MomentumWave;
  domainRadar: DomainRadar;
  projectMomentum: ProjectMomentumMap;
  emotionExecution: EmotionExecution;
  brainHealth: BrainHealth;
  aiInsight: AIAnalyticsInsight;
};

export type AIAnalyticsContext = {
  range: Pick<AnalyticsRange, "key" | "label" | "startISO" | "endISO" | "days">;
  pulseScores: LifePulseScore[];
  totals: AnalyticsTotals;
  projectMomentum: {
    stateCounts: Record<ProjectMomentumState, number>;
    stuckProjects: number;
    overloadedProjects: number;
    movingProjects: number;
  };
  emotionExecution: Pick<
    EmotionExecution,
    "hasJournalData" | "hasExecutionData" | "interpretation"
  >;
  brainHealth: BrainHealth;
  domainRadar: DomainRadar;
};
