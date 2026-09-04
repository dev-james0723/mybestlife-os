import type { AppLocale } from "@/lib/i18n/app-locale";
import type { IdeaQuickFilterDefinition } from "@/lib/ideas/quick-filters";
import type { KnowledgeQuickFilterDefinition } from "@/lib/knowledge/quick-filters";
import type { OSBuddyShortcutSettings } from "@/lib/os-buddy/os-buddy-shortcuts";
import type { OSBuddyFreeRoamIntensity } from "@/lib/os-buddy/os-buddy-free-roam";
import type { OSBuddyPetId, OSBuddyPosition } from "@/types/os-buddy";
import type {
  BillingCycle,
  ConfidenceLevel,
  FieldSource,
  PricingPlan,
  SoftwareAlternative,
} from "@/types/vault-smart-autofill";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UiTheme = "default" | "astronaut" | "academia" | "forest";
export type ColorMode = "light" | "dark";
export type WidgetDensity = "compact" | "comfortable" | "spacious";
export type FontSizePref = "small" | "medium" | "large";
export type GreetingTone = "friendly" | "motivational" | "minimal" | "poetic";
export type SidebarWidth = "narrow" | "default" | "wide";
export type UiCopyMode = "zh-TW" | "en" | "mixed";
export type CaptureKind = "idea" | "task" | "note" | "goal";
export type IdeaSourceType = "text" | "voice" | "share";
export type QuickSaveDefaultDestination = "review" | "knowledge" | "idea";

export type BlockMinutesOption = 5 | 10 | 15 | 20 | 30;

export type QuickTaskDef = {
  name: string;
  icon: string;
  blocks: number;
  iconClass: string;
  /** Public URL (e.g. Supabase Storage) for Gemini “liquid glass” icon; overrides Lucide when set. */
  iconUrl?: string | null;
  /** Stable key for built-in presets (`/quick-task-icons/preset-{key}.png` + prompt hints). */
  presetKey?: string | null;
};

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  language: AppLocale;
  timezone: string;
  /** Pinned map point for top-bar weather (OpenWeather). Null until onboarding or Settings. */
  weather_lat: number | null;
  weather_lon: number | null;
  /** Optional label; weather still resolves from lat/lon. */
  weather_city: string | null;
  theme: "light" | "dark";
  ui_theme: UiTheme;
  color_mode: ColorMode;
  focus_areas: string[];
  motto: string | null;
  dashboard_cover_url: string | null;
  dashboard_widgets: Json;
  widget_density: WidgetDensity;
  focus_mode: boolean;
  font_size_pref: FontSizePref;
  greeting_tone: GreetingTone;
  accent_color_hex: string | null;
  sidebar_width: SidebarWidth;
  sidebar_mobile_auto_collapse: boolean;
  ui_copy_mode: UiCopyMode;
  onboarding_completed: boolean;
  block_minutes: BlockMinutesOption;
  quick_tasks: QuickTaskDef[] | null;
  knowledge_quick_filters: KnowledgeQuickFilterDefinition[];
  knowledge_command_light_opacity: number;
  idea_quick_filters: IdeaQuickFilterDefinition[];
  /** ISO 4217 (uppercase). Finance display + FX base. */
  display_currency: string;
  quick_save_enabled: boolean;
  quick_save_default_destination: QuickSaveDefaultDestination;
  quick_save_require_review: boolean;
  os_buddy_pet_id: OSBuddyPetId;
  os_buddy_name: string;
  os_buddy_enabled: boolean;
  os_buddy_position: OSBuddyPosition;
  os_buddy_onboarding_completed: boolean;
  os_buddy_interaction_stats: Record<string, unknown>;
  os_buddy_unlocked_pets: OSBuddyPetId[];
  os_buddy_birthday_enabled: boolean;
  os_buddy_birthday_month: number | null;
  os_buddy_birthday_day: number | null;
  os_buddy_birthday_year: number | null;
  os_buddy_birthday_show_age: boolean;
  os_buddy_birthday_reminder_enabled: boolean;
  os_buddy_birthday_timezone: string | null;
  os_buddy_birthday_last_celebrated_on: string | null;
  os_buddy_birthday_last_reminder_on: string | null;
  os_buddy_free_roam_enabled?: boolean;
  os_buddy_free_roam_intensity?: OSBuddyFreeRoamIntensity | null;
  os_buddy_free_roam_return_home?: boolean;
  os_buddy_free_roam_near_home_only?: boolean;
  os_buddy_shortcut_settings: OSBuddyShortcutSettings;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "planning" | "active" | "paused" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  start_date: string | null;
  end_date: string | null;
  color: string | null;
  tags: string[];
  thumbnail_url: string | null;
  thumbnail_style: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectResourceCategory =
  | "article"
  | "video"
  | "podcast"
  | "news"
  | "image"
  | "website"
  | "other";

export type ProjectResource = {
  id: string;
  user_id: string;
  project_id: string;
  category: ProjectResourceCategory;
  title: string;
  url: string;
  source: string | null;
  thumbnail_url: string | null;
  description: string | null;
  is_favorite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TaskStatus = "todo" | "in-progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type CalendarProvider = "local" | "google";

export type Task = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  estimated_blocks: number | null;
  tags: string[];
  source: string | null;
  source_url: string | null;
  reminder_date: string | null;
  /** App-normalized classification; null falls back to a derived category. */
  category: string | null;
  /** True when created/expanded by an AI flow. */
  ai_generated: boolean;
  /** AI suggestion bag (proposed subtasks, reasoning, model used). */
  ai_metadata: Json | null;
  /** Manual / board ordering. Null sorts last. */
  sort_order: number | null;
  /** Day the user intends to work on the task (distinct from due_date). */
  scheduled_date: string | null;
  /** Linked calendar event id when scheduled. */
  calendar_event_id: string | null;
  calendar_provider: CalendarProvider | null;
  created_at: string;
  updated_at: string;
  project?:
    | (Pick<Project, "id" | "name"> & Partial<Pick<Project, "status" | "priority">>)
    | null;
};

export type TaskSubtask = {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "active" | "completed" | "paused" | "cancelled";
  target_date: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type KeyResult = {
  id: string;
  user_id: string;
  goal_id: string;
  name: string;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyPlanTask = {
  /** Stable id for this planner row (JSON); used for Google Calendar ↔ planner sync. */
  plannerTaskId?: string;
  /** Whether this slot was placed by the user or by Adaptive Plan. Legacy rows omit this. */
  scheduleSource?: "manual" | "adaptive";
  /** Prevents Adaptive Plan from moving this task during a rebalance. */
  locked?: boolean;
  /** Earliest wall-clock start (HH:mm) that Adaptive Plan may choose for this task. */
  earliestStartTime?: string;
  /** Latest wall-clock end (HH:mm) that Adaptive Plan may choose for this task. */
  latestEndTime?: string;
  /** Optional gap in block units before this task, from the previous task end (or plan start). */
  gapBlocks?: number;
  taskName?: string;
  taskId?: string;
  blocks?: number;
  order?: number;
  /** Exact wall-clock start (HH:mm) on plan_date when Google or user set a non-sequential slot. */
  start_time?: string;
  /** Exact wall-clock end (HH:mm); may be on the next calendar day when past midnight. */
  end_time?: string;
  google_calendar_event_id?: string;
  google_calendar_etag?: string;
  google_calendar_updated_at?: string;
};

/** Mode the user last selected for a given planner date. Stored on the daily_plans row. */
export type PlanningMode = "time-block" | "free" | "adaptive";

/**
 * One entry in a Free Planning task list. Free Planning is intentionally untimed — duration
 * is an optional rough estimate, never a scheduled slot.
 */
export type FreePlanTask = {
  /** Stable client-generated id; survives reorders, priority changes, and persists across reloads. */
  id: string;
  title: string;
  /** Coarse priority bucket. `done` is used for the completed column instead of a separate flag. */
  priority: "must" | "should" | "could" | "done";
  /** Position within the priority bucket. */
  order: number;
  notes?: string;
  /** Optional rough effort estimate in minutes. Never a scheduled time. */
  estimatedMinutes?: number;
  /** Optional link to a Tasks-page task. */
  taskId?: string;
};

export type DailyPlan = {
  id: string;
  user_id: string;
  plan_date: string;
  start_time: string;
  end_time: string;
  tasks: DailyPlanTask[];
  /** Free-planning task list. Stored independently of `tasks` so mode-switching never loses data. */
  free_tasks: FreePlanTask[];
  /** Active planning lens for this day. New rows default to `"time-block"`. */
  mode: PlanningMode;
  schedule_image_url: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FocusSessionType =
  | "deep_work"
  | "admin"
  | "learning"
  | "creative"
  | "meeting"
  | "recovery"
  | "personal";

export type FocusSessionStatus =
  | "planned"
  | "running"
  | "paused"
  | "completed"
  | "abandoned";

export type StimulationRisk = "low" | "medium" | "high";
export type PlanQualityRiskLevel = "low" | "medium" | "high";
export type BreakStatus = "good" | "thin" | "missing" | "unknown";

export type FocusPreference = {
  id: string;
  user_id: string;
  low_stimulation_mode_enabled: boolean;
  distraction_gate_enabled: boolean;
  urge_surfing_delay_seconds: number;
  default_focus_minutes: number;
  break_reminder_minutes: number;
  high_stimulation_routes: string[];
  ai_access_requires_intention: boolean;
  show_actual_timeline_overlay: boolean;
  created_at: string;
  updated_at: string;
};

export type PlannerFocusSessionCompletionState =
  | "completed"
  | "partial"
  | "not_completed";

export type PlannerFocusSession = {
  id: string;
  user_id: string;
  daily_plan_id: string | null;
  planner_task_id: string | null;
  task_id: string | null;
  project_id: string | null;
  plan_date: string;
  task_title: string;
  session_type: FocusSessionType;
  status: FocusSessionStatus;
  planned_start_at: string | null;
  planned_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  win_condition: string | null;
  allowed_tools: string[];
  blocked_routes: string[];
  blocked_domains: string[];
  interruption_count: number;
  stimulation_leak_count: number;
  energy_before: number | null;
  energy_after: number | null;
  focus_rating: number | null;
  completion_state: PlannerFocusSessionCompletionState | null;
  completion_note: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannerStimulationEventType =
  | "route_gate"
  | "urge_surfing"
  | "manual_interrupt"
  | "focus_exit_attempt"
  | "ai_access"
  | "high_stimulation_route";

export type StimulationDecision =
  | "returned_to_focus"
  | "continued_intentionally"
  | "captured_and_returned"
  | "abandoned_session";

export type PlannerStimulationEvent = {
  id: string;
  user_id: string;
  focus_session_id: string | null;
  plan_date: string;
  event_type: PlannerStimulationEventType;
  route: string | null;
  domain: string | null;
  decision: StimulationDecision | null;
  reason: string | null;
  delay_seconds: number;
  created_at: string;
};

export type PlanQualityIssueType =
  | "overload"
  | "calendar_conflict"
  | "missing_break"
  | "long_work_run"
  | "context_switching"
  | "high_stimulation"
  | "weak_deep_work_protection";

export type PlanQualityIssueSeverity = "info" | "warning" | "critical";

export type PlanQualityIssue = {
  id: string;
  severity: PlanQualityIssueSeverity;
  type: PlanQualityIssueType;
  title: string;
  description: string;
  affectedPlannerTaskIds: string[];
};

export type PlanQualitySuggestedChangeType =
  | "add_break"
  | "move_task"
  | "merge_admin"
  | "protect_deep_work"
  | "reduce_scope"
  | "convert_to_low_stim";

export type PlanQualitySuggestedChangePatch =
  | {
      action: "add_break";
      afterPlannerTaskId?: string;
      blocks?: number;
      title?: string;
    }
  | {
      action: "move_task";
      plannerTaskId: string;
      targetOrder?: number;
      targetStartTime?: string;
    }
  | {
      action: "merge_admin";
      plannerTaskIds: string[];
    }
  | {
      action: "protect_deep_work";
      plannerTaskId?: string;
      minMinutes?: number;
    }
  | {
      action: "reduce_scope";
      plannerTaskId: string;
      targetBlocks?: number;
    }
  | {
      action: "convert_to_low_stim";
      plannerTaskId: string;
      note?: string;
    };

export type PlanQualitySuggestedChange = {
  id: string;
  type: PlanQualitySuggestedChangeType;
  title: string;
  description: string;
  patch: PlanQualitySuggestedChangePatch;
  safeToAutoApply: boolean;
};

export type DailyPlanQualityReport = {
  id: string;
  user_id: string;
  daily_plan_id: string | null;
  plan_date: string;
  score: number;
  risk_level: PlanQualityRiskLevel;
  summary: string;
  top_issue: string | null;
  focus_target_minutes: number;
  break_status: BreakStatus;
  stimulation_risk: StimulationRisk;
  issues: PlanQualityIssue[];
  suggested_changes: PlanQualitySuggestedChange[];
  source_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type BestFocusWindow = {
  start: string;
  end: string;
  label: string;
};

export type DailyPlanReview = {
  id: string;
  user_id: string;
  daily_plan_id: string | null;
  plan_date: string;
  planned_minutes: number;
  actual_focus_minutes: number;
  deep_work_minutes: number;
  meeting_minutes: number;
  recovery_minutes: number;
  interruption_count: number;
  stimulation_leak_count: number;
  plan_completion_ratio: number;
  plan_accuracy_ratio: number;
  focus_integrity_score: number;
  stimulation_load_score: number;
  recovery_ratio: number;
  best_focus_window: BestFocusWindow | null;
  top_failure_pattern: string | null;
  tomorrow_suggestion: string | null;
  ai_summary: string | null;
  saved_to_journal_entry_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ScheduleTemplate = {
  id: string;
  user_id: string;
  name: string;
  tasks: DailyPlanTask[];
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  content: string | null;
  category: string | null;
  tags: string[];
  is_favorite: boolean;
  status?: string | null;
  note_type?: string | null;
  summary?: string | null;
  ai_tags?: string[];
  manual_tags?: string[];
  ai_suggestions?: Json | null;
  ai_metadata?: Json | null;
  last_processed_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<Project, "id" | "name"> | null;
};

/** @deprecated Use KnowledgeItem from @/types/knowledge instead. */
export type { KnowledgeItem as KnowledgeEntry } from "@/types/knowledge";

export type Idea = {
  id: string;
  user_id: string;
  content: string;
  source_type: IdeaSourceType;
  capture_kind: CaptureKind;
  voice_transcript: string | null;
  linked_project_ids: string[];
  linked_task_ids: string[];
  linked_goal_ids: string[];
  linked_idea_ids: string[];
  status: "captured" | "reviewed" | "archived";
  /** User-chosen bucket for browsing (see `IDEA_CATEGORIES` in lib/ideas/constants). */
  category: string;
  created_at: string;
  updated_at: string;
  // v2 columns — nullable / defaulted; present on all rows after migration
  title: string | null;
  ai_tags: string[];
  manual_tags: string[];
  destinations: string[];
  attachments: Json[];
  ai_suggestions: Json | null;
  processing_step: string | null;
  linked_knowledge_item_ids: string[];
  linked_node_ids: string[];
  related_resource_refs: Json[];
};

export type QuickSaveCaptureStatus = "pending" | "saved" | "discarded" | "failed";
export type QuickSaveCaptureDestination = "knowledge" | "idea";

export type QuickSaveFileRef = {
  name: string;
  mime_type: string | null;
  size: number;
  storage_path: string;
  public_url?: string | null;
};

export type QuickSaveCapture = {
  id: string;
  user_id: string;
  title: string | null;
  text: string | null;
  url: string | null;
  normalized_url: string | null;
  file_refs: QuickSaveFileRef[];
  status: QuickSaveCaptureStatus;
  destination: QuickSaveCaptureDestination | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type JapaneseStudySession = {
  id: string;
  user_id: string;
  session_date: string;
  duration_minutes: number;
  study_type: string | null;
  content: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Journal v2 — structured emotional-processing entry.
 * Replaces the legacy HTML-content + pleasantness/activation map. The TS
 * shape is camelCase; the DB columns are snake_case and mapped in
 * `lib/repositories/journal.ts`.
 */
export type JournalEntry = {
  id: string;
  userId: string;
  entryDate: string; // YYYY-MM-DD
  topic: string;
  quadrant: "RED" | "YELLOW" | "BLUE" | "GREEN";
  primaryEmotion: string;
  secondaryEmotion: string | null;
  intensity: number;
  target: string | null;
  bullets: { items: string[] };
  selfStory: string | null;
  needs: { items: string[] };
  nextTinyStep: string;
  appreciation: string | null;
  topicExtras: Json | null;
  contextFactors: Json | null;
  projectIds: string[];
  taskIds: string[];
  aiOutput: Json | null;
  aiMedia: Json | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Legacy habits shapes, preserved for reference and for any read-only access to
 * the `*_legacy` tables. The canonical Habit / Routine / Completion types now
 * live in `@/lib/habits/types`. Do NOT use these in new code.
 *
 * @deprecated Use the discriminated-union types from `@/lib/habits/types`.
 */
export type HabitLegacy = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: "daily" | "weekly" | "custom";
  target_count: number;
  current_streak: number;
  best_streak: number;
  background_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** @deprecated See {@link HabitLegacy}. */
export type RoutineLegacy = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  habit_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** @deprecated See {@link HabitLegacy}. */
export type HabitLogLegacy = {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  completed: boolean;
  count: number;
  notes: string | null;
  created_at: string;
};

// Re-export the new canonical shapes at their historical names so any
// stragglers still building against `@/types/database` keep compiling.
// New code must import directly from `@/lib/habits/types`.
export type {
  Habit,
  HabitCompletion as HabitLog,
  Routine,
} from "@/lib/habits/types";

export type GratefulThing = {
  id: string;
  user_id: string;
  content: string;
  entry_date: string;
  category: string | null;
  photo_url: string | null;
  thumbnail_url: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type AboutMe = {
  id: string;
  user_id: string;
  instruction_manual: string | null;
  core_values: string | null;
  mission: string | null;
  personality_insights: string | null;
  sections: Json;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SleepLog = {
  id: string;
  user_id: string;
  log_date: string;
  bed_time: string | null;
  wake_time: string | null;
  duration_hours: number | null;
  quality: number | null;
  notes: string | null;
  created_at: string;
};

export type ExerciseLog = {
  id: string;
  user_id: string;
  log_date: string;
  exercise_type: string;
  duration_minutes: number | null;
  intensity: "low" | "medium" | "high";
  notes: string | null;
  created_at: string;
};

export type NutritionLog = {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: string;
  description: string | null;
  calories: number | null;
  notes: string | null;
  created_at: string;
};

export type DailyCheckIn = {
  id: string;
  user_id: string;
  check_date: string;
  mood: number | null;
  energy: number | null;
  notes: string | null;
  created_at: string;
};

// Health dashboard v2 (four pillars + objective metrics + user goals).
// See migrations/20260423000000_health_dashboard_rebuild.sql.

/** Canonical metric type identifiers stored in health_metrics.metric_type. */
export const HEALTH_METRIC_TYPES = [
  "sleep_duration",
  "sleep_deep",
  "sleep_rem",
  "sleep_light",
  "sleep_awake",
  "hrv",
  "rhr",
  "heart_rate",
  "spo2",
  "vo2_max",
  "steps",
  "active_energy",
  "workout_minutes",
  "weight",
  "body_fat",
  "bmi",
  "water_ml",
  "caffeine_mg",
  "alcohol_units",
  "mindful_minutes",
  "menstrual_flow",
] as const;

export type HealthMetricType = (typeof HEALTH_METRIC_TYPES)[number];

export type HealthMetricSource =
  | "apple_health"
  | "manual"
  | "derived"
  | "shortcut"
  | "import";

export type HealthGoalPeriod = "daily" | "weekly" | "monthly";

export type HealthTriggerKey =
  | "work"
  | "coffee"
  | "exercise"
  | "social"
  | "family"
  | "poor_sleep"
  | "weather"
  | "menstrual"
  | "music_practice"
  | "performance"
  | "other";

export type HealthDailyLog = {
  id: string;
  user_id: string;
  log_date: string;
  sleep_quality: number | null;
  energy_level: number | null;
  mood_valence: number | null;
  mood_arousal: number | null;
  stress_level: number | null;
  notes: string | null;
  triggers: string[];
  logged_at: string;
  created_at: string;
  updated_at: string;
};

export type HealthMetric = {
  id: string;
  user_id: string;
  metric_type: HealthMetricType | string;
  value: number;
  unit: string;
  recorded_at: string;
  source: HealthMetricSource;
  metadata: Json | null;
  created_at: string;
};

export type HealthGoal = {
  id: string;
  user_id: string;
  metric_type: HealthMetricType | string;
  target_value: number;
  unit: string;
  period: HealthGoalPeriod;
  created_at: string;
  updated_at: string;
};

export type FinanceAccount = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceCategory = {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  created_at: string;
};

export type FinanceTransaction = {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string | null;
  transaction_date: string;
  receipt_image_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  vision_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceBudget = {
  id: string;
  user_id: string;
  category_id: string;
  period_start: string;
  period_end: string;
  limit_amount: number;
  created_at: string;
  updated_at: string;
};

// Asset row shape lives in `@/types/assets` so the Resources feature owns
// its canonical type. Re-exported here to preserve existing import paths.
export type { Asset } from "./assets";

export type DocumentSourceKind =
  | "manual"
  | "upload"
  | "external_link"
  | "knowledge"
  | "camera_scan";

export type DocumentAiStatus =
  | "not_requested"
  | "skipped"
  | "complete"
  | "failed";

export type Document = {
  id: string;
  user_id: string;
  name: string;
  document_type: string | null;
  expiration_date: string | null;
  file_url: string | null;
  source_kind: DocumentSourceKind;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  ai_status: DocumentAiStatus;
  ai_confidence: number | null;
  ai_metadata: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SoftwareVaultEntry = {
  id: string;
  user_id: string;
  app_name: string;
  website_url: string | null;
  icon_url: string | null;
  category: string | null;
  platforms: string | null;
  use_cases: string | null;
  status: "Testing" | "Active" | "Retired" | "Wishlist";
  priority: "Must-have" | "Nice-to-have" | "Optional";
  cost_type: "Free" | "Freemium" | "Paid" | "Subscription";
  cost_amount: number | null;
  cost_period: string | null;
  why_i_use_it: string | null;
  best_feature: string | null;
  biggest_downside: string | null;
  best_alternative: string | null;
  replaces: string | null;
  tags: string | null;
  default_tool_for: string | null;
  summary: string | null;
  ai_generated_fields: string[];
  pricing_plans: PricingPlan[];
  selected_plan_id: string | null;
  billing_cycle: BillingCycle | null;
  cost_currency: string | null;
  alternative_options: SoftwareAlternative[];
  field_sources: FieldSource[];
  field_confidence: Record<string, ConfidenceLevel>;
  pricing_last_checked_at: string | null;
  is_default_stack: boolean;
  launch_count: number;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Relationship row in the new personal-CRM schema (2026-04-19 redesign).
 *
 * The legacy {name, type, description, contact_info, linked_project_ids}
 * shape lives on in `relationships_legacy` for archival. New code reads
 * and writes this richer shape.
 *
 * `category` and `relationship_strength` are stored as text slugs in the
 * DB (e.g. "professor", "moderate") and translated for display via the
 * i18n layer. See `types/relationship.ts` for the canonical slug unions
 * and narrowing helpers.
 */
export type Relationship = {
  id: string;
  user_id: string;

  person_name: string;
  photo_url: string | null;

  category: string;
  relationship_strength: string;

  email: string | null;
  phone: string | null;
  /** Structured public profiles/websites stored as JSONB. */
  social_links: import("./relationship").RelationshipSocialLink[];

  /** ISO date `YYYY-MM-DD` (no time). */
  last_contact_date: string | null;
  last_interaction_notes: string | null;

  next_action: string | null;
  /** ISO date `YYYY-MM-DD` (no time). */
  next_action_date: string | null;

  commitments_made: string | null;
  preferences_and_details: string | null;
  general_notes: string | null;

  tags: string[];

  linked_project_id: string | null;
  /** Multi-entity links used by the relationship editor. */
  linked_project_ids: string[];
  linked_goal_ids: string[];
  linked_note_ids: string[];
  linked_idea_ids: string[];

  is_favorite: boolean;

  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Relationship Intelligence Hub — child tables (see migration
// 20271001120000_relationship_intelligence_hub). All are user-scoped and
// cascade-delete with their parent `relationships` row.
// ---------------------------------------------------------------------------

/** A captured/logged touchpoint with a person. */
export type RelationshipInteraction = {
  id: string;
  user_id: string;
  relationship_id: string;
  /** ISO date `YYYY-MM-DD`. */
  interaction_date: string;
  /** Slug: meeting | email | message | call | lesson | event | photo_memory | other */
  interaction_type: string;
  raw_note: string;
  summary: string;
  /** AI-extracted structure kept for audit/replay. */
  extracted_json: Json | null;
  created_at: string;
  updated_at: string;
};

/** A tracked commitment ("Promise Keeper"). */
export type RelationshipPromise = {
  id: string;
  user_id: string;
  relationship_id: string;
  promise_text: string;
  /** ISO date `YYYY-MM-DD`. */
  due_date: string | null;
  /** Slug: open | done | overdue | cancelled */
  status: string;
  source_interaction_id: string | null;
  created_at: string;
  updated_at: string;
};

/** A cached AI intelligence report (one per relationship). */
export type RelationshipAiReport = {
  id: string;
  user_id: string;
  relationship_id: string;
  report_json: Json;
  model_used: string | null;
  input_hash: string | null;
  generated_at: string;
  updated_at: string;
};

/** A generated follow-up draft — never auto-sent. */
export type RelationshipMessageDraft = {
  id: string;
  user_id: string;
  relationship_id: string;
  purpose: string;
  tone: string;
  language: string;
  subject: string | null;
  body: string;
  /** Slug: draft | copied | archived */
  status: string;
  created_at: string;
};

/** A memory-layer image (profile / 合照 / business card / screenshot / …). */
export type RelationshipImage = {
  id: string;
  user_id: string;
  relationship_id: string;
  image_url: string;
  /** Slug: profile_photo | shared_photo | event_photo | business_card | screenshot | memory_photo | other */
  image_type: string;
  caption: string | null;
  ai_caption: string | null;
  /** ISO date `YYYY-MM-DD`. */
  event_date: string | null;
  location: string | null;
  related_project_id: string | null;
  is_primary: boolean;
  extracted_json: Json | null;
  created_at: string;
  updated_at: string;
};

export type RoleModel = {
  id: string;
  user_id: string;
  name: string;
  /** @deprecated Use `bio` instead. Kept for legacy rows; new code reads `bio`. */
  description: string | null;
  /** @deprecated Use `photo_url` instead. Kept for legacy rows. */
  image_url: string | null;
  linked_project_ids: string[];
  linked_goal_ids: string[];
  linked_note_ids: string[];
  // ---- Richer profile (added 20260620, see role-model.ts for shape details) ----
  /** Primary portrait. External URL or Supabase Storage path. */
  photo_url: string | null;
  /** Short "why I admire them" hook, displayed under the name. */
  admiration_blurb: string | null;
  /** Long-form biography. Supersedes `description`. */
  bio: string | null;
  /** Single domain tag; see `ROLE_MODEL_SUGGESTED_CATEGORIES`. Free-form. */
  category: string | null;
  /** JSONB array of `RoleModelQuote`. */
  quotes: import("./role-model").RoleModelQuote[];
  /** JSONB array of `RoleModelKeyLesson`. */
  key_lessons: import("./role-model").RoleModelKeyLesson[];
  /** Cross-cutting tags for search / filter. */
  tags: string[];
  /** JSONB array of `RoleModelLink`. */
  links: import("./role-model").RoleModelLink[];
  /** User's private reflections (not AI-generated). */
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type WeeklyReview = {
  id: string;
  user_id: string;
  review_date: string;
  content: string | null;
  highlights: string | null;
  challenges: string | null;
  next_week_focus: string | null;
  created_at: string;
  updated_at: string;
};

export type CareerAsset = {
  id: string;
  user_id: string;
  asset_type: string;
  title: string;
  content: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type CareerVaultCategory =
  | "resume"
  | "cover_letter"
  | "photo"
  | "bio"
  | "portfolio"
  | "credential"
  | "reference"
  | "application";

export type CareerVaultFile = {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  category: CareerVaultCategory;
  tags: string[];
  description: string | null;
  is_starred: boolean;
  is_master: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
};

// ---- Career Vault Phase 3: versions ----

/**
 * Snapshot of a past file revision. The *current* revision is NOT stored here;
 * it's the live row on `career_vault_files`. Version numbers are 1-indexed and
 * dense: row with version_number = N is the content that WAS current when the
 * file's current_version was N.
 */
export type CareerVaultFileVersion = {
  id: string;
  file_id: string;
  user_id: string;
  version_number: number;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  change_note: string | null;
  changed_fields: Record<string, { from: unknown; to: unknown }>;
  created_at: string;
};

// ---- Career Vault Phase 4: bundles, shares, pipeline ----

export type CareerVaultBundleType =
  | "grad_school"
  | "tech_job"
  | "speaking"
  | "funding"
  | "custom";

export type CareerVaultBundle = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  bundle_type: CareerVaultBundleType | null;
  file_order: string[];
  include_cover_page: boolean;
  cover_title: string | null;
  cover_subtitle: string | null;
  cover_recipient: string | null;
  last_exported_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CareerVaultShareType = "single_file" | "bundle";

export type CareerVaultShare = {
  id: string;
  user_id: string;
  share_token: string;
  share_type: CareerVaultShareType;
  file_id: string | null;
  bundle_id: string | null;
  password_salt: string | null;
  password_hash: string | null;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  recipient_label: string | null;
  allow_download: boolean;
  watermark_enabled: boolean;
  is_active: boolean;
  created_at: string;
};

export type ShareAccessAction = "viewed" | "downloaded" | "password_failed";

export type ShareAccessLog = {
  id: string;
  share_id: string;
  accessed_at: string;
  ip_hash: string | null;
  user_agent: string | null;
  action: ShareAccessAction;
};

export type OpportunityStage =
  | "researching"
  | "applied"
  | "phone_screen"
  | "interviewing"
  | "offer"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type CareerOpportunity = {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  location: string | null;
  stage: OpportunityStage;
  job_description: string | null;
  job_url: string | null;
  salary_range: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  attached_file_ids: string[];
  excitement_score: number | null;
  match_score: number | null;
  applied_date: string | null;
  next_action_date: string | null;
  /** Keyed by stage id; value is ISO timestamp when stage was first reached. */
  stage_history: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type OpportunityInteractionType =
  | "note"
  | "email_sent"
  | "email_received"
  | "phone_call"
  | "interview"
  | "offer_received"
  | "feedback";

export type OpportunityInteraction = {
  id: string;
  opportunity_id: string;
  user_id: string;
  interaction_type: OpportunityInteractionType;
  content: string;
  happened_at: string;
  created_at: string;
};

// ---- Career Vault Phase 2: AI Coach ----

/** Free-form highlight entry stored in career_profile.career_highlights. */
export type CareerHighlight = {
  title: string;
  description?: string | null;
  year?: number | null;
};

/** Structured AI diagnosis stored in career_profile.ai_diagnosis. */
export type CareerAiDiagnosis = {
  scores: {
    clarity: number;
    momentum: number;
    positioning: number;
    network: number;
    skill_fit: number;
    risk: number;
  };
  narrative: string;
  main_tension?: string;
  main_risk?: string;
  strengths?: string[];
  gaps?: string[];
  tensions?: {
    a: string;
    b: string;
    explanation: string;
    severity?: string;
  }[];
};

/** One recommended next action stored in career_profile.ai_next_actions. */
export type CareerNextAction = {
  title: string;
  why?: string;
  effort?: string;
  horizon?: string;
};

/** Synthesised work-style profile stored in career_profile.work_style_profile. */
export type CareerWorkStyleProfile = {
  energy_pattern?: string;
  motivation_drivers?: string[];
  decision_style?: string;
  feedback_preference?: string;
  ideal_environment?: string;
  organizational_triggers?: string[];
  communication_preference?: string;
  ai_coaching_style?: string;
};

/** Loose personal-brand asset inventory stored in personal_brand_assets. */
export type PersonalBrandAssets = {
  has?: string[];
  missing?: string[];
  priorities?: string[];
};

export type CareerSetupStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped";

export type CareerBannerStatus =
  | "none"
  | "pending"
  | "generating"
  | "completed"
  | "failed"
  | "fallback";

export type CareerProfile = {
  user_id: string;
  current_role: string | null;
  industry: string | null;
  years_experience: number | null;
  top_skills: string[];
  career_goals: string | null;
  pain_points: string | null;
  target_roles: string[];

  // Phase 5 extensions — all nullable so legacy rows stay valid.
  current_company: string | null;
  location: string | null;
  career_highlights: CareerHighlight[];
  twelve_month_goals: string | null;
  dream_scenario: string | null;
  blockers: string | null;
  target_industries: string[];
  target_locations: string[];
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
  salary_currency: string;
  primary_headshot_id: string | null;
  primary_bio_id: string | null;
  master_resume_id: string | null;
  transition_goal: string | null;
  transition_progress: number | null;

  // AI Career Mirror (WS1) extensions — all nullable/defaulted.
  setup_status: CareerSetupStatus;
  setup_completed_at: string | null;
  setup_answers: Record<string, unknown>;
  completion_score: number | null;
  missing_fields: string[];
  ai_summary: string | null;
  ai_diagnosis: CareerAiDiagnosis | null;
  ai_next_actions: CareerNextAction[];
  ai_reframed_problem: string | null;
  career_identity: string | null;
  career_stage: string | null;
  current_status_summary: string | null;
  motivation_drivers: string[];
  ambition_style: string | null;
  desired_reputation: string | null;
  visibility_goal: string | null;
  personal_brand_strategy: string | null;
  content_strategy_direction: string | null;
  self_reported_personality_type: string | null;
  work_energy_pattern: string | null;
  work_style_profile: CareerWorkStyleProfile | null;
  decision_style: string | null;
  feedback_preference: string | null;
  preferred_mentor_style: string | null;
  ideal_work_environment: string | null;
  culture_fit: string | null;
  organizational_triggers: string[];
  transition_type: string | null;
  transition_timeline: string | null;
  blocker_category: string | null;
  risk_factors: string[];
  career_banner_url: string | null;
  career_banner_prompt: string | null;
  career_banner_style: string | null;
  career_banner_status: CareerBannerStatus;
  career_banner_generated_at: string | null;
  portfolio_links: string[];
  personal_brand_assets: PersonalBrandAssets;

  created_at: string;
  updated_at: string;
};

/** Structured AI review for one week (career_weekly_reviews.review). */
export type CareerWeeklyReview = {
  id: string;
  user_id: string;
  week_start: string;
  review: Record<string, unknown>;
  model_used: string | null;
  created_at: string;
  updated_at: string;
};

/** Saved "what-if" career simulation. */
export type CareerScenario = {
  id: string;
  user_id: string;
  title: string;
  inputs: Record<string, unknown>;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/** Append-only career mirror observation. */
export type CareerMemoryEntry = {
  id: string;
  user_id: string;
  kind: string;
  content: Record<string, unknown>;
  source: string | null;
  created_at: string;
  updated_at: string;
};

/** Generated bundle of prompts for the user. */
export type CareerPromptPack = {
  id: string;
  user_id: string;
  title: string | null;
  prompts: unknown[];
  generated_for: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type AITool =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity"
  | "grok"
  | "custom";

export type UserAIPreferences = {
  user_id: string;
  default_ai: AITool;
  custom_ai_url: string | null;
  custom_ai_name: string | null;
  prompt_language: AppLocale | null;
  auto_copy_to_clipboard: boolean;
  show_prompt_preview: boolean;
  /** Phase 3: how many previous versions to keep (1..1000, default 10). */
  version_retention_limit: number;
  /** Phase 3: opt-in to server-side AI content analysis for smart tags. */
  allow_ai_analysis: boolean;
  created_at: string;
  updated_at: string;
};

export type TtsVoiceMode = "preset" | "reference_clone";
export type TtsProvider = "voxcpm";
export type TtsVoiceProfileStatus = "active" | "archived";

export type UserTtsPreferences = {
  user_id: string;
  provider: TtsProvider;
  voice_mode: TtsVoiceMode;
  preset_id: string;
  active_voice_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UserTtsVoiceProfile = {
  id: string;
  user_id: string;
  label: string;
  kind: "reference_clone";
  reference_storage_path: string;
  reference_transcript: string | null;
  consent_confirmed_at: string;
  sample_duration_seconds: number | null;
  mime_type: string | null;
  status: TtsVoiceProfileStatus;
  created_at: string;
  updated_at: string;
};

export type PromptCategory =
  | "resume"
  | "interview"
  | "discovery"
  | "transition"
  | "growth"
  | "branding"
  | "application"
  | "other";

export type LocalizedString = { [locale: string]: string };

export type SystemPromptTemplate = {
  id: string;
  slug: string;
  category: PromptCategory;
  icon: string;
  title_i18n: LocalizedString;
  description_i18n: LocalizedString;
  prompt_i18n: LocalizedString;
  required_variables: string[];
  optional_variables: string[];
  attachment_categories: CareerVaultCategory[];
  is_premium: boolean;
  sort_order: number;
  created_at: string;
};

export type UserCustomPrompt = {
  id: string;
  user_id: string;
  title: string;
  prompt_body: string;
  icon: string;
  tags: string[];
  attachment_categories: CareerVaultCategory[];
  required_variables: string[];
  optional_variables: string[];
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPromptFavorite = {
  user_id: string;
  template_id: string;
  created_at: string;
};

export type PromptUsageHistory = {
  id: string;
  user_id: string;
  template_id: string | null;
  custom_prompt_id: string | null;
  ai_tool: AITool;
  attached_file_ids: string[];
  used_at: string;
};

export type MarketResearch = {
  id: string;
  user_id: string;
  topic: string;
  analysis: string | null;
  infographic_url: string | null;
  audio_url: string | null;
  linked_project_id: string | null;
  linked_note_ids: string[];
  created_at: string;
  updated_at: string;
};

export type NotificationPreferences = {
  id: string;
  user_id: string;
  task_reminders: boolean;
  daily_summary: boolean;
  study_streak_reminders: boolean;
  created_at: string;
  updated_at: string;
};

export type AnalyticsRangePreset = {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  sort_order: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlantType = "grass" | "sunflower" | "lily" | "orchid" | "apple_tree";
export type PlantVariant = "normal" | "golden" | "rare";
export type GardenItemType = "water" | "fertilizer" | "sunlight" | "rare_seed";

export type UserGarden = {
  id: string;
  user_id: string;
  plant_type: PlantType;
  growth_stage: number;
  growth_points: number;
  streak_days: number;
  last_watered_at: string | null;
  planted_at: string;
  variant: PlantVariant;
  is_wilted: boolean;
};

export type PlantCollectionEntry = {
  id: string;
  user_id: string;
  plant_type: PlantType;
  variant: PlantVariant;
  streak_days: number | null;
  bloom_date: string | null;
  harvested_at: string;
};

export type GardenInventory = {
  id: string;
  user_id: string;
  item_type: GardenItemType;
  quantity: number;
};

export type GardenDailyLog = {
  id: string;
  user_id: string;
  log_date: string;
  chest_claimed: boolean;
  watered: boolean;
  bonus_items: Json | null;
};

// ---- Career Vault Phase 5: Timeline, Network, Insights, Journal ----

export type CareerEventType =
  | "job_started"
  | "job_ended"
  | "promotion"
  | "education_started"
  | "education_completed"
  | "certification_earned"
  | "project_shipped"
  | "award_received"
  | "speaking_event"
  | "publication"
  | "milestone"
  | "custom";

export type CareerEventSourceKind =
  | "file_upload"
  | "opportunity_stage"
  | "bundle_export"
  | null;

export type CareerEvent = {
  id: string;
  user_id: string;
  event_type: CareerEventType;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_ongoing: boolean;
  organization: string | null;
  location: string | null;
  related_file_ids: string[];
  color: string | null;
  icon: string | null;
  auto_generated: boolean;
  source_kind: CareerEventSourceKind;
  source_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NetworkNodeType =
  | "person"
  | "organization"
  | "project"
  | "opportunity";

export type CareerNetworkNode = {
  id: string;
  user_id: string;
  node_type: NetworkNodeType;
  name: string;
  subtitle: string | null;
  description: string | null;
  email: string | null;
  linkedin_url: string | null;
  role_title: string | null;
  industry: string | null;
  website: string | null;
  project_url: string | null;
  project_status: string | null;
  opportunity_id: string | null;
  image_url: string | null;
  tags: string[];
  notes: string | null;
  last_interaction_date: string | null;
  color: string | null;
  size: number;
  created_at: string;
  updated_at: string;
};

export type CareerNetworkEdge = {
  id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  strength: number | null;
  notes: string | null;
  created_at: string;
};

export type DailyInsightSuggestion = {
  id: string;
  title: string;
  rationale: string;
  action: string;
  priority: "high" | "medium" | "low";
  category: "application" | "skill" | "network" | "reflection";
};

export type DailyInsightInteractionStatus = "done" | "dismissed";

export type DailyInsights = {
  id: string;
  user_id: string;
  date: string;
  suggestions: DailyInsightSuggestion[];
  /** { [suggestionId]: { status, at } } */
  interactions: Record<
    string,
    { status: DailyInsightInteractionStatus; at: string }
  >;
  created_at: string;
};

export type DecisionType =
  | "job_offer"
  | "career_pivot"
  | "education"
  | "relocation"
  | "side_project"
  | "mentor_choice"
  | "investment"
  | "custom";

export type DecisionFramework =
  | "pros_cons"
  | "10_10_10"
  | "regret_minimization"
  | "expected_value"
  | "custom";

/** Single option considered in a decision; JSON-serialized into `options`. */
export type DecisionOption = {
  name: string;
  pros: string[];
  cons: string[];
  score: number | null;
  notes?: string | null;
};

export type CareerDecision = {
  id: string;
  user_id: string;
  title: string;
  decision_type: DecisionType | null;
  framework: DecisionFramework | null;
  context: string | null;
  options: DecisionOption[];
  assumptions: string | null;
  decision: string | null;
  expected_outcome: string | null;
  actual_outcome: string | null;
  lessons_learned: string | null;
  decision_quality_score: number | null;
  review_date: string | null;
  decided_at: string;
  review_reminder_date: string | null;
  created_at: string;
  updated_at: string;
};

// ===========================================================================
// AI Knowledge — prompt library + personal prompts (parallel to Career Coach).
// Row types below mirror the SQL columns verbatim (snake_case). Domain-layer
// types live in `@/types/prompt` and convert at the repository boundary.
// ===========================================================================

export type PromptTopCategoryRow =
  | "writing_content"
  | "productivity_planning"
  | "coding_development"
  | "research_analysis"
  | "business_strategy"
  | "learning_education"
  | "career_professional"
  | "life_personal_growth"
  | "arts_creative"
  | "language_learning"
  | "expert_personas"
  | "meta_prompt_engineering";

export type PromptLocalizedJson = { en: string } & {
  [locale: string]: string | undefined;
};

export type PromptVariableJson = {
  name: string;
  label: string | null;
  description: string | null;
  required: boolean;
  example: string | null;
};

export type PromptCategoryRow = {
  id: string;
  slug: string;
  parent_slug: string | null;
  top_category: PromptTopCategoryRow;
  name_i18n: PromptLocalizedJson;
  description_i18n: PromptLocalizedJson | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
};

export type LibraryPromptRow = {
  id: string;
  slug: string;
  title_i18n: PromptLocalizedJson;
  description_i18n: PromptLocalizedJson;
  body: string;
  body_locale: string;
  top_category: PromptTopCategoryRow;
  sub_category_slug: string | null;
  tags: string[];
  variables: PromptVariableJson[];
  icon: string | null;
  is_featured: boolean;
  sort_order: number;
  source_repo: string;
  source_url: string | null;
  source_path: string | null;
  license: string | null;
  attribution: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPromptRow = {
  id: string;
  user_id: string;
  slug: string;
  title_i18n: PromptLocalizedJson;
  description_i18n: PromptLocalizedJson;
  body: string;
  body_locale: string;
  top_category: PromptTopCategoryRow;
  sub_category_slug: string | null;
  tags: string[];
  variables: PromptVariableJson[];
  icon: string | null;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
  forked_from_prompt_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type PromptFavoriteRow = {
  user_id: string;
  library_prompt_id: string;
  created_at: string;
};

export type PromptRunStatusRow =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type PromptRunRow = {
  id: string;
  user_id: string;
  library_prompt_id: string | null;
  custom_prompt_id: string | null;
  provider: string;
  model: string | null;
  variables: Record<string, string>;
  status: PromptRunStatusRow;
  result_snippet: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

export type PromptFolderRow = {
  id: string;
  user_id: string;
  name: string;
  summary: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PromptFolderItemRow = {
  id: string;
  folder_id: string;
  user_id: string;
  library_prompt_id: string | null;
  custom_prompt_id: string | null;
  added_at: string;
};
