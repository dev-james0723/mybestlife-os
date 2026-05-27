/**
 * Domain types for the Habits & Routine page.
 *
 * Discriminated unions on the client side mirror CHECK constraints in the
 * 20260418_habits_rebuild migration. Narrow at the Supabase boundary (in the
 * repositories) and at the Gemini boundary (via Zod in `lib/ai/schemas/habits/`);
 * never let raw DB rows or LLM output leak into UI code without passing through
 * a parser.
 */

// ============================================================
// Habit type + frequency
// ============================================================

export type HabitType = "checkbox" | "counter" | "duration" | "negative";

/** Time-of-day bucket for the Today view. */
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Discriminated by `kind`. Stored in Postgres as JSONB; the DB check constraint
 * only validates the outer `kind`, so additional fields are validated by Zod
 * at the repository boundary.
 */
export type HabitFrequency =
  | { kind: "daily" }
  | { kind: "weekly_count"; count: number }
  | { kind: "weekdays"; days: readonly Weekday[] }
  | { kind: "every_n_days"; n: number };

// ============================================================
// Core entities
// ============================================================

/**
 * A habit as stored in the `habits` table. Note:
 *   * `target_value` semantics depend on `type` — counter = target count per
 *     cycle; duration = target seconds; checkbox / negative = ignored.
 *   * Streaks are NEVER stored on this row. Use the streak functions in
 *     `lib/habits/streak.ts` against `HabitCompletion[]`.
 */
export type Habit = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: HabitType;
  target_value: number | null;
  frequency: HabitFrequency;
  time_of_day: TimeOfDay;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HabitCompletionStatus = "done" | "skipped";

export type HabitCompletion = {
  id: string;
  user_id: string;
  habit_id: string;
  /** ISO `YYYY-MM-DD`. */
  completion_date: string;
  status: HabitCompletionStatus;
  value: number | null;
  note: string | null;
  /** ISO 8601 timestamp. */
  completed_at: string;
};

export type StreakFreeze = {
  id: string;
  user_id: string;
  habit_id: string;
  freeze_date: string;
  reason: string | null;
  created_at: string;
};

// ============================================================
// Tags + links
// ============================================================

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
};

export type HabitTag = {
  habit_id: string;
  tag_id: string;
  user_id: string;
};

/**
 * Polymorphic link from a habit to another domain entity. No FK on target_id
 * in the DB — validity is enforced at the application layer.
 */
export type HabitLinkKind =
  | "goal"
  | "knowledge"
  | "project"
  | "task"
  | "timeline"
  | "calendar_event"
  | "career_profile"
  | "ai_knowledge"
  | "planner_block"
  | "health_metric"
  | "journal_pattern";

export type HabitLink = {
  id: string;
  user_id: string;
  habit_id: string;
  target_kind: HabitLinkKind;
  target_id: string;
  created_at: string;
};

// ============================================================
// Routines
// ============================================================

export type Routine = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  time_of_day: TimeOfDay;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Standalone step — no FK to habits. */
export type RoutineStep = {
  id: string;
  user_id: string;
  routine_id: string;
  position: number;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
};

export type RoutineCompletion = {
  id: string;
  user_id: string;
  routine_id: string;
  completion_date: string;
  completed_step_ids: string[];
  completed_at: string;
};

/** Convenience combined shape for the Today view. */
export type RoutineWithSteps = Routine & { steps: RoutineStep[] };

// ============================================================
// AI visuals, persistent timers, and reflections
// ============================================================

export type HabitVisualKind = "habit" | "routine";

export type HabitVisual = {
  id: string;
  user_id: string;
  habit_id: string | null;
  routine_id: string | null;
  kind: HabitVisualKind;
  visual_prompt: string;
  image_url: string;
  storage_path: string | null;
  model_used: string | null;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type TimerSessionStatus =
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export type TimerSession = {
  id: string;
  user_id: string;
  habit_id: string | null;
  routine_id: string | null;
  routine_step_id: string | null;
  started_at: string;
  target_duration_seconds: number;
  paused_at: string | null;
  total_paused_seconds: number;
  status: TimerSessionStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HabitReflectionMood =
  | "easy"
  | "fine"
  | "too_hard"
  | "bad_timing"
  | "modify_next_time";

export type HabitReflection = {
  id: string;
  user_id: string;
  habit_id: string | null;
  routine_id: string | null;
  timer_session_id: string | null;
  reflection_date: string;
  mood: HabitReflectionMood | null;
  note: string | null;
  created_at: string;
};

// ============================================================
// Reminders
// ============================================================

export type ReminderChannel = "in_app" | "push" | "both";

export type Reminder = {
  id: string;
  user_id: string;
  habit_id: string | null;
  routine_id: string | null;
  /** `HH:MM` wall-clock, user's profile timezone. */
  time_of_day: string;
  /** Empty = every day. */
  days_of_week: readonly Weekday[];
  channel: ReminderChannel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// ============================================================
// AI insights cache
// ============================================================

export type AIInsightKind =
  | "habit_builder"
  | "routine_composer"
  | "goal_to_habits"
  | "weekly_review"
  | "struggle_detection"
  | "review_habit"
  | "correlation_insight"
  | "quarterly_narrative"
  | "secretary_brief"
  | "onboarding_recommend"
  | "cross_page_suggestions"
  | "timer_complete_reflection"
  // ----- Bio Lab AI features (see lib/ai/bio-lab/) -----
  // Names mirror BIO_LAB_AI_INSIGHT_KINDS in lib/ai/bio-lab/insight-kinds.ts.
  // Both files MUST stay in sync; one is the runtime guard, the other is
  // the type-level union the cache helpers consume.
  | "bio_lab_state_inference"
  | "bio_lab_mind_label"
  | "bio_lab_mind_triage"
  | "bio_lab_focus_recommendation"
  | "bio_lab_reset_sequence"
  | "bio_lab_weekly_insight";

export type AIInsight = {
  id: string;
  user_id: string;
  kind: AIInsightKind;
  target_kind: string | null;
  target_id: string | null;
  input_hash: string;
  content_json: unknown;
  content_text: string | null;
  language: string;
  model_used: string | null;
  created_at: string;
};
