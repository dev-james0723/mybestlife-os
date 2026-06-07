import type {
  DailyPlan,
  Goal,
  JapaneseStudySession,
  JournalEntry,
  Project,
  Task,
} from "@/types/database";
import type { BrainGraphData } from "@/lib/brain/compat";

export type AnalyticsPresetRangeKey =
  | "1D"
  | "3D"
  | "7D"
  | "14D"
  | "21D"
  | "30D"
  | "45D"
  | "2M"
  | "90D"
  | "6M"
  | "9M"
  | "1Y"
  | "18M"
  | "2Y"
  | "3Y"
  | "5Y"
  | "10Y";

export type AnalyticsRangeKey = AnalyticsPresetRangeKey | "CUSTOM";

export type AnalyticsRangeSource = "preset" | "custom" | "saved";

export type AnalyticsRangeSelection =
  | { source: "preset"; key: AnalyticsPresetRangeKey }
  | { source: "custom"; startISO: string; endISO: string; label?: string }
  | { source: "saved"; presetId: string; name: string; startISO: string; endISO: string };

export type AnalyticsRangeValidationError =
  | "missing"
  | "invalid"
  | "future_end"
  | "start_after_end"
  | "too_long";

export type AnalyticsRangeValidationResult =
  | { ok: true; startISO: string; endISO: string; days: number }
  | { ok: false; error: AnalyticsRangeValidationError };

export type AnalyticsBucketGranularity = "day" | "week" | "month";

export type AnalyticsRange = {
  key: AnalyticsRangeKey;
  source: AnalyticsRangeSource;
  presetKey?: AnalyticsPresetRangeKey;
  presetId?: string;
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
  key: AnalyticsPresetRangeKey;
  label: string;
  behavior: string;
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
  startISO: string;
  endISO: string;
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
  granularity: AnalyticsBucketGranularity;
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

export type ProjectMomentumTask = {
  id: string;
  title: string;
  status: Task["status"];
  priority: Task["priority"];
  dueDate: string | null;
  dueDateLabel: string;
  completedAt: string | null;
  completedInRange: boolean;
  isOverdue: boolean;
  estimatedBlocks: number | null;
};

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
  tasks: ProjectMomentumTask[];
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
  granularity: AnalyticsBucketGranularity;
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

export type AnalyticsAudioOverview = {
  title: string;
  summary: string;
  transcript: string;
  actionItems: string[];
  chapters: Array<{
    title: string;
    text: string;
  }>;
  audioUrl: string;
  storagePath: string;
  provider: string;
  voiceName?: string;
  durationSeconds: number;
  createdAt: string;
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
  aiContext: AIAnalyticsContext;
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
