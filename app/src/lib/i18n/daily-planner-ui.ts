import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

export type PlannerGcalSyncToastResult = {
  localPushed: number;
  remoteApplied: number;
  remoteFetched: number;
  conflicts: number;
};

export function formatPlannerGcalSyncToast(result: PlannerGcalSyncToastResult): string {
  const parts: string[] = [];
  if (result.localPushed > 0) {
    parts.push(
      `${result.localPushed} local update${result.localPushed !== 1 ? "s" : ""} pushed`,
    );
  }
  if (result.remoteApplied > 0) {
    parts.push(
      `${result.remoteApplied} remote update${result.remoteApplied !== 1 ? "s" : ""} applied`,
    );
  }
  if (result.conflicts > 0) {
    return `Calendar sync conflict · ${result.conflicts} item${result.conflicts !== 1 ? "s" : ""} need review`;
  }
  if (parts.length === 0) {
    if (result.remoteFetched > 0) {
      return "Calendar sync finished · no remote changes to apply";
    }
    return "Calendar sync finished · 0 remote updates found";
  }
  return `Calendar sync finished · ${parts.join(" · ")}`;
}
import { dailyPlannerJa, dailyPlannerKo } from "./daily-planner-locale-ja-ko";
import {
  dailyPlannerFr,
  dailyPlannerEs,
  dailyPlannerVi,
  dailyPlannerIt,
} from "./daily-planner-locale-fr-es-vi-it";

export type DailyPlannerUiCopy = {
  pageTitle: string;
  pageDescription: string;
  aiSuggestions: string;
  aiThinking: string;
  templates: string;
  saveAsTemplate: string;
  loadTemplate: string;
  today: string;
  syncGoogleCalendar: string;
  /** Runs server Calendar sync (retry pending + pull remote changes). */
  googleCalendarSyncNowButton: string;
  /** Shown on the button while a push or sync request is in flight. */
  googleCalendarSyncingNowButton: string;
  /** Shown under End Time when Google Calendar is connected; `email` may be null if not returned by Google. */
  googleCalendarConnectedAccountHint: (email: string | null) => string;
  /** Inline status while the debounced plan save and Google push/pull are running. */
  googleCalendarSaveAndSyncLoading: string;
  /** `stamp` is formatted as `YYYY-MM-DD HH:mm:ss` in the app timezone. */
  googleCalendarLastUpdatedLabel: (stamp: string) => string;
  googleCalendarServerSyncHint: string;
  googleCalendarFreeModeSyncHint: string;
  toastGoogleCalendarSyncNowOk: (result: PlannerGcalSyncToastResult) => string;
  toastGoogleCalendarSyncNowFailed: string;
  calendarSyncTooltipSynced: string;
  calendarSyncTooltipPending: string;
  calendarSyncTooltipError: string;
  calendarSyncTooltipConflict: string;
  calendarSyncTooltipRemoteDeleted: string;
  startTime: string;
  endTime: string;
  /** Compact suffix shown on the End Time picker when the range crosses midnight (e.g. "+1 day"). */
  nextDayBadge: string;
  /** Caption rendered beneath the End Time picker when the range crosses midnight. */
  crossesIntoDayLabel: (formattedDate: string) => string;
  /* ── Planning mode toggle ── */
  modeToggleAriaLabel: string;
  modeTimeBlock: string;
  modeFree: string;
  /* ── Free Planning Mode ── */
  freePlanningWindowLabel: string;
  freePlanningWindowSameDay: (start: string, end: string) => string;
  freePlanningWindowCrossDay: (
    startDate: string,
    start: string,
    endDate: string,
    end: string,
  ) => string;
  freePlanningWindowHelper: string;
  freeQuickCaptureHeading: string;
  freeQuickCaptureBlurb: string;
  freeQuickCapturePlaceholder: string;
  freeQuickCaptureSubmit: string;
  freeQuickCaptureKeyboardHint: string;
  freePriorityMust: string;
  freePriorityShould: string;
  freePriorityCould: string;
  freePriorityDone: string;
  freePriorityHint: (priority: string) => string;
  freeBoardEmpty: (priority: string) => string;
  freeBoardSummary: (total: number, completed: number) => string;
  freeBoardMustSummary: (count: number) => string;
  /** Stat-tile label for the total task count in Free Mode. Replaces "Available" since hours aren't relevant. */
  freeStatCaptured: string;
  freeRemoveTask: string;
  freeChangePriority: string;
  freeMoveTaskToBucket: (priority: string) => string;
  freeTaskDetailsTitle: string;
  freeTaskTitleLabel: string;
  freeTaskNotesLabel: string;
  freeTaskNotesPlaceholder: string;
  freeTaskPriorityLabel: string;
  freeTaskSaveChanges: string;
  freeTaskDelete: string;
  freeTaskCancel: string;
  freeTaskAddNotes: string;
  freeTaskHideNotes: string;
  freeTaskTitleRequired: string;
  freeTaskOpenDetails: (title: string) => string;
  freePlanSummaryTitle: string;
  freePlanSummaryBlurb: string;
  freeGoogleSyncTitle: (formattedDate: string) => string;
  freeGoogleSyncedToast: string;
  freeGoogleNoTasksToast: string;
  /* ── Mode-difference task tile ── */
  available: string;
  planned: string;
  remaining: string;
  overBy: string;
  taskBuilder: string;
  createTaskWithAi: string;
  importFromTasks: string;
  quickAdd: string;
  yourPlan: (n: number) => string;
  blocksLabel: string;
  noTasksYet: string;
  backToTop: string;
  ariaPreviousDay: string;
  ariaNextDay: string;
  createAiDialogTitle: string;
  taskNameLabel: string;
  taskNamePlaceholder: string;
  createAiHint: string;
  createAiUnderstandHeading: string;
  createAiQuestionProgress: (current: number, total: number) => string;
  createAiCustomAnswerLabel: string;
  createAiCustomAnswerPlaceholder: string;
  createAiNext: string;
  createAiSkipAll: string;
  createAiLoadingQuestions: string;
  createAiGenerating: string;
  createWithAiButton: string;
  addQuicklyButton: string;
  addManuallyButton: string;
  /** Label for the metadata autofill toggle in manual create flow. */
  autofillMetadataWithAi: string;
  autofillMetadataWithAiHint: string;
  /** Return from manual / AI sub-step to the initial create options (keeps modal open). */
  backToCreateOptions: string;
  toastAiPlannerError: string;
  toastAiPlannerUnauthorized: string;
  toastDailyPlanSaveFailed: string;
  toastDailyPlanUpdateFailed: string;
  /** Shown when API returns built-in questions (Gemini failed or misconfigured). */
  toastPlannerAiOfflineHint: string;
  createAiRetry: string;
  toastCreatedAiPlanner: (
    name: string,
    blocks: number,
    durationText: string,
  ) => string;
  cancel: string;
  add: string;
  confirmLoadTemplate: string;
  toastImported: (n: number) => string;
  toastAdded: (title: string) => string;
  toastNoQuickDetails: string;
  toastTaskNotFound: string;
  toastMovedTomorrow: string;
  toastTemplateLoaded: (name: string) => string;
  toastCreatedAi: (name: string) => string;
  googleCalendarEventPrefix: string;
  toastGoogleNoTasks: string;
  toastGoogleNeedSignIn: string;
  toastGoogleNeedRealSession: string;
  toastGoogleSynced: (n: number) => string;
  toastGoogleSyncFailed: string;
  toastGoogleReauthorize: string;
  toastFocusActivated: string;
  focusRealityTitle: string;
  todayFocus: string;
  planQuality: string;
  planQualityScore: (score: number) => string;
  analyzePlan: string;
  improvePlan: string;
  startFirstFocus: string;
  startFocus: string;
  finishFocus: string;
  pause: string;
  resume: string;
  distracted: string;
  reviewDay: string;
  openReview: string;
  openDetails: string;
  noPlanFocusHint: string;
  planQualityUnchecked: string;
  noQualityIssue: string;
  deepWorkLabel: string;
  focusTargetLabel: (value: string) => string;
  breaksLabel: string;
  breakStatusLabel: (status: string) => string;
  stimulationRisk: string;
  riskLabel: (risk: string) => string;
  activeFocus: string;
  runningTimerLabel: string;
  winCondition: string;
  winConditionPlaceholder: string;
  allowedTools: string;
  allowedToolsPlaceholder: string;
  blockedRoutes: string;
  blockedRoutesPlaceholder: string;
  energyBefore: string;
  energyAfter: string;
  focusRating: string;
  completionState: string;
  completionCompleted: string;
  completionPartial: string;
  completionNotCompleted: string;
  completionNote: string;
  completionNotePlaceholder: string;
  actualTimeline: string;
  actualPlannedLabel: (actual: string, planned: string) => string;
  interruptionCountLabel: (count: number) => string;
  completedLabel: string;
  activeLabel: string;
  abandonedLabel: string;
  endOfDayReview: string;
  plannedVsActual: string;
  focusIntegrity: string;
  planAccuracy: string;
  stimulationLoad: string;
  stimulationLeak: string;
  recoveryRatio: string;
  bestFocusWindow: string;
  tomorrowSuggestion: string;
  saveReview: string;
  regenerateAiInsight: string;
  createTomorrowImprovement: string;
  sendSummaryToJournal: string;
  pinInsightWeeklyReview: string;
  unavailableAction: string;
  lowStimulationMode: string;
  distractionGate: string;
  aiAccessRequiresIntention: string;
  urgeSurfing: string;
  returnToFocus: string;
  continueIntentionally: string;
  captureNoteAndReturn: string;
  abandonSession: string;
  gateTitle: string;
  gateDescription: (taskTitle: string, route: string) => string;
  gateReasonPlaceholder: string;
  gateCountdownLabel: (seconds: number) => string;
  focusPrivacyNote: string;
  calendarConstraintsUnavailable: string;
  planQualityDrawerTitle: string;
  detectedIssues: string;
  recommendedChanges: string;
  applyChange: string;
  applyAllSafeChanges: string;
  startFocusSheetTitle: string;
  finishFocusSheetTitle: string;
  focusSessionType: string;
  focusSessionDeepWork: string;
  focusSessionAdmin: string;
  focusSessionLearning: string;
  focusSessionCreative: string;
  focusSessionMeeting: string;
  focusSessionRecovery: string;
  focusSessionPersonal: string;
  meetingLabel: string;
  topFailurePattern: string;
  reviewNotGenerated: string;
  noBestFocusWindow: string;
  safeChangeLabel: string;
  focusSessionStartedToast: string;
  focusSessionFinishedToast: string;
  focusReviewSavedToast: string;
  ariaBackToTop: string;
  detailDialogTitle: string;
  detailDuePrefix: string;
  detailEstimatedPrefix: string;
  detailClose: string;
  detailMoveTomorrow: string;
  detailDescription: string;
  detailReminders: string;
  detailRelatedNotes: string;
  detailRelatedKnowledge: string;
  detailRelatedIdeas: string;
  /** Shown when a Smart Links row references an idea id that is not in the library (yet). */
  smartLinkMissingIdea: string;
  smartLinkMissingNote: string;
  smartLinkMissingKnowledge: string;
  /** Brief placeholder while related entities are still loading. */
  smartLinkLoading: string;
  detailSource: string;
  detailSourceLink: string;
  detailAiGenerated: string;
  addTaskButton: string;
  formatMinutes: (n: number) => string;
  formatHoursMinutes: (h: number, m: number, totalMin: number) => string;
  formatHoursOnly: (h: number, totalMin: number) => string;
  quickBreakfast: string;
  quickLunch: string;
  quickDinner: string;
  quickGym: string;
  quickMeditate: string;
  quickImprovise: string;
  quickRead: string;
  quickJournal: string;
  quickBreak: string;
  quickRest: string;
  done: string;
  dialogClose: string;
  pickerHourLabel: string;
  pickerMinLabel: string;
  periodAm: string;
  periodPm: string;
  blockCountSummary: (blocks: number, durationText: string) => string;
  blockAbbr: string;
  taskCardBlockCount: (blocks: number) => string;
  untitledTask: string;
  defaultPlannerTaskName: string;
  ariaRemoveOneBlock: string;
  ariaAddOneBlock: string;
  ariaPreTaskRitual: string;
  ariaRemoveTask: string;
  ariaHoldToReorder: string;
  importDialogTitle: string;
  importSearchPlaceholder: string;
  importNoMatch: string;
  importSelectedButton: (n: number) => string;
  aiSuggestionsModalTitle: string;
  aiSuggestionsEmpty: string;
  aiRecDurationLine: (blocks: number, minutes: number) => string;
  templateNameLabel: string;
  templateNamePlaceholder: string;
  templateSaveBlurb: (taskCount: number) => string;
  templateSaveSubmit: string;
  templateListEmpty: string;
  templateListTaskCount: (n: number) => string;
  timelineTitle: (formattedDate: string) => string;
  visualScheduleTitle: string;
  visualScheduleBlurb: string;
  imageStyleLabel: string;
  generateScheduleImage: string;
  regenerateScheduleImage: string;
  downloadScheduleImage: string;
  scheduleImageGenerating: string;
  scheduleImageAlt: string;
  toastScheduleImageReady: string;
  toastScheduleImageFailed: string;
  toastScheduleImageUnauthorized: string;
  /* ── Review step ── */
  reviewAiGenerated: string;
  reviewDescription: string;
  reviewReminders: string;
  reviewAddReminder: string;
  reviewSuggestedTimeBlocks: string;
  reviewSuggestedPriority: string;
  reviewStatus: string;
  reviewDueDate: string;
  reviewProject: string;
  reviewNoProject: string;
  reviewNotesLabel: string;
  reviewNotesPlaceholder: string;
  reviewSmartLinks: string;
  reviewRelatedNotes: string;
  reviewRelatedKnowledge: string;
  reviewRelatedIdeas: string;
  reviewRelatedResources: string;
  reviewResourceAll: string;
  reviewResourceArticle: string;
  reviewResourceVideo: string;
  reviewResourcePodcast: string;
  reviewResourceShopping: string;
  reviewPriorityLow: string;
  reviewPriorityMedium: string;
  reviewPriorityHigh: string;
  reviewPriorityUrgent: string;
  reviewStatusTodo: string;
  reviewStatusInProgress: string;
  reviewStatusDone: string;
  reviewStatusCancelled: string;
  reviewCreating: string;
  quickTaskDelete: string;
  quickTaskDeleteConfirm: (name: string) => string;
  quickTaskAddNew: string;
  quickTaskAddDialogTitle: string;
  quickTaskNameLabel: string;
  quickTaskNamePlaceholder: string;
  quickTaskBlocksLabel: string;
  quickTaskToastAdded: (name: string) => string;
  quickTaskToastDeleted: (name: string) => string;
  quickTaskIconRegenerate: string;
  quickTaskIconGenerating: string;
  quickTaskIconRegenerated: (name: string) => string;
  quickTaskIconRegenerateFailed: string;
  /** Button to run Gemini liquid-glass icon generation for tasks missing `iconUrl`. */
  quickTaskAiIcons: string;
  quickTaskAiIconsGenerating: string;
  quickTaskAiIconsToastDone: (count: number) => string;
  quickTaskAiIconsToastNone: string;
};

const en: DailyPlannerUiCopy = {
  pageTitle: "Daily Planner",
  pageDescription: "Build your perfect day, one block at a time",
  aiSuggestions: "Get AI Suggestions",
  aiThinking: "Thinking…",
  templates: "Templates",
  saveAsTemplate: "Save as Template",
  loadTemplate: "Load Template",
  today: "Today",
  syncGoogleCalendar: "Sync to Google Calendar",
  startTime: "Start Time",
  endTime: "End Time",
  nextDayBadge: "+1 day",
  crossesIntoDayLabel: (formattedDate) => `Crosses into ${formattedDate}`,
  modeToggleAriaLabel: "Planning mode",
  modeTimeBlock: "Time Block",
  modeFree: "Free Plan",
  freePlanningWindowLabel: "Planning Window",
  freePlanningWindowSameDay: (start, end) => `${start} → ${end}`,
  freePlanningWindowCrossDay: (startDate, start, endDate, end) =>
    `${startDate}, ${start} → ${endDate}, ${end}`,
  freePlanningWindowHelper:
    "A loose boundary for today's flow — tasks don't need exact times in Free Planning Mode.",
  freeQuickCaptureHeading: "What do you need to get done today?",
  freeQuickCaptureBlurb: "Capture quickly. You can prioritise and reorder afterwards.",
  freeQuickCapturePlaceholder: "Add a task quickly…",
  freeQuickCaptureSubmit: "Add",
  freeQuickCaptureKeyboardHint: "Enter to add · ⌘/Ctrl + Enter to add and keep typing",
  freePriorityMust: "Must Do",
  freePriorityShould: "Should Do",
  freePriorityCould: "Could Do",
  freePriorityDone: "Done",
  freePriorityHint: (priority) => `Drop here to mark as ${priority}`,
  freeBoardEmpty: (priority) => `Nothing in ${priority} yet.`,
  freeBoardSummary: (total, completed) =>
    `${total} task${total !== 1 ? "s" : ""} captured · ${completed} completed`,
  freeBoardMustSummary: (count) =>
    `${count} must-do${count !== 1 ? " items" : ""}`,
  freeStatCaptured: "Captured",
  freeRemoveTask: "Remove task",
  freeChangePriority: "Change priority",
  freeMoveTaskToBucket: (priority) => `Move to ${priority}`,
  freeTaskDetailsTitle: "Task details",
  freeTaskTitleLabel: "Task title",
  freeTaskNotesLabel: "Notes",
  freeTaskNotesPlaceholder:
    "Add context, details, or reminders for this task...",
  freeTaskPriorityLabel: "Priority",
  freeTaskSaveChanges: "Save changes",
  freeTaskDelete: "Delete",
  freeTaskCancel: "Cancel",
  freeTaskAddNotes: "Add Notes",
  freeTaskHideNotes: "Hide Notes",
  freeTaskTitleRequired: "Task title is required",
  freeTaskOpenDetails: (title) => `Open task details for ${title}`,
  freePlanSummaryTitle: "Free Plan Summary",
  freePlanSummaryBlurb:
    "A clean checklist of today's free plan, grouped by priority. No fake time slots.",
  freeGoogleSyncTitle: (formattedDate) => `Free Planning — ${formattedDate}`,
  freeGoogleSyncedToast: "Synced your Free Plan to Google Calendar.",
  freeGoogleNoTasksToast: "Nothing to sync yet — add a few tasks first.",
  available: "Available",
  planned: "Planned",
  remaining: "Remaining",
  overBy: "Over by ",
  taskBuilder: "Task Builder",
  createTaskWithAi: "Create Task",
  importFromTasks: "Import from Tasks",
  quickAdd: "Quick Add",
  yourPlan: (n) => `Your Plan (${n} task${n !== 1 ? "s" : ""})`,
  blocksLabel: "blocks",
  noTasksYet: "No tasks yet. Add some above!",
  backToTop: "Back to the top",
  ariaPreviousDay: "Previous day",
  ariaNextDay: "Next day",
  createAiDialogTitle: "Create Task",
  taskNameLabel: "Task name",
  taskNamePlaceholder: "e.g. Review project proposal",
  createAiHint:
    "AI asks a few tailored questions, then suggests how many 10-minute blocks to reserve. You can still adjust blocks after adding.",
  createAiUnderstandHeading: "Let me understand your task better",
  createAiQuestionProgress: (current, total) =>
    `Question ${current} of ${total}`,
  createAiCustomAnswerLabel: "Or type your own answer…",
  createAiCustomAnswerPlaceholder: "Type here…",
  createAiNext: "Next",
  createAiSkipAll: "Skip all & generate",
  createAiLoadingQuestions: "Preparing smart questions…",
  createAiGenerating: "AI is crafting your task…",
  createWithAiButton: "Create with AI",
  addQuicklyButton: "Add Quickly (One Block)",
  addManuallyButton: "Add Manually",
  autofillMetadataWithAi: "Autofill Metadata with AI",
  autofillMetadataWithAiHint:
    "When on, we infer details from the task name. You can still edit every field.",
  backToCreateOptions: "Other ways to create…",
  toastAiPlannerError: "Could not reach the AI assistant. Please try again.",
  toastAiPlannerUnauthorized: "Please sign in to use AI task creation.",
  toastDailyPlanSaveFailed: "Failed to save daily plan",
  toastDailyPlanUpdateFailed: "Failed to update daily plan",
  toastPlannerAiOfflineHint:
    "Google Gemini didn’t return usable questions, so built-in ones were shown. Check the terminal running `npm run dev` for the error (GEMINI_API_KEY, model name, or quota).",
  createAiRetry: "Try again",
  toastCreatedAiPlanner: (name, blocks, durationText) =>
    `Added "${name}" · ${blocks} blocks (${durationText})`,
  cancel: "Cancel",
  add: "Add",
  confirmLoadTemplate: "Loading a template will replace your current plan. Continue?",
  toastImported: (n) => `Imported ${n} task${n !== 1 ? "s" : ""}`,
  toastAdded: (title) => `Added "${title}"`,
  toastNoQuickDetails: "No details for quick-add tasks",
  toastTaskNotFound: "Task not found in your list",
  toastMovedTomorrow: "Task moved to tomorrow",
  toastTemplateLoaded: (name) => `Loaded template "${name}"`,
  toastCreatedAi: (name) => `Created "${name}"`,
  googleCalendarEventPrefix: "Life OS",
  toastGoogleNoTasks: "Add at least one task to your plan before syncing.",
  toastGoogleNeedSignIn: "Sign in to sync with Google Calendar.",
  toastGoogleNeedRealSession:
    "Cloud sign-in is required. Sign out of demo mode and sign in with Google or Apple, then connect Calendar in Settings.",
  toastGoogleSynced: (n) =>
    `Synced ${n} calendar event${n !== 1 ? "s" : ""} to Google Calendar (earlier Life OS events that day were replaced).`,
  toastGoogleSyncFailed: "Could not sync to Google Calendar. Try again or reconnect in Settings.",
  toastGoogleReauthorize: "Reconnecting to Google so Calendar access is granted…",
  googleCalendarSyncNowButton: "Google Calendar sync now",
  googleCalendarSyncingNowButton: "Google Calendar syncing now",
  googleCalendarConnectedAccountHint: (email) =>
    email
      ? `Connected to Google Calendar · ${email}`
      : "Connected to Google Calendar",
  googleCalendarSaveAndSyncLoading: "Saving your plan and syncing with Google Calendar…",
  googleCalendarLastUpdatedLabel: (stamp) => `Last updated: ${stamp}`,
  googleCalendarServerSyncHint:
    "After each save we push your Time Block tasks to Google Calendar, then pull remote edits (for example duration changes in Google) back into this page. You can still use Sync now anytime.",
  googleCalendarFreeModeSyncHint:
    "Free Plan tasks sync as one all-day Google Calendar event per task. Use Sync now after editing in Google.",
  toastGoogleCalendarSyncNowOk: formatPlannerGcalSyncToast,
  toastGoogleCalendarSyncNowFailed: "Calendar sync could not finish. Your plan is still saved locally.",
  calendarSyncTooltipSynced: "Google Calendar: synced",
  calendarSyncTooltipPending: "Google Calendar: pending push",
  calendarSyncTooltipError: "Google Calendar: sync error (retry from Settings)",
  calendarSyncTooltipConflict: "Google Calendar: conflict — resolve in Settings or retry",
  calendarSyncTooltipRemoteDeleted: "Removed in Google Calendar — choose next step in Settings",
  toastFocusActivated: "Focus mode activated!",
  focusRealityTitle: "Focus & Reality",
  todayFocus: "Today Focus",
  planQuality: "Plan Quality",
  planQualityScore: (score) => `Plan Quality ${score}`,
  analyzePlan: "Analyze Plan",
  improvePlan: "Improve Plan",
  startFirstFocus: "Start First Focus",
  startFocus: "Start Focus",
  finishFocus: "Finish",
  pause: "Pause",
  resume: "Resume",
  distracted: "I'm distracted",
  reviewDay: "Review Day",
  openReview: "Open Review",
  openDetails: "Open Details",
  noPlanFocusHint: "Create a plan to unlock Focus & Reality insights.",
  planQualityUnchecked: "Plan Quality not checked yet.",
  noQualityIssue: "No major issue detected.",
  deepWorkLabel: "Deep Work",
  focusTargetLabel: (value) => `Deep Work ${value}`,
  breaksLabel: "Breaks",
  breakStatusLabel: (status) => `Breaks ${status}`,
  stimulationRisk: "Stimulation Risk",
  riskLabel: (risk) => `Risk ${risk}`,
  activeFocus: "Active Focus",
  runningTimerLabel: "Running timer",
  winCondition: "Win condition",
  winConditionPlaceholder: "What would make this session a win?",
  allowedTools: "Allowed tools",
  allowedToolsPlaceholder: "Docs, editor, notebook",
  blockedRoutes: "Blocked routes",
  blockedRoutesPlaceholder: "/youtube-radar, /ai-assistant",
  energyBefore: "Energy before",
  energyAfter: "Energy after",
  focusRating: "Focus rating",
  completionState: "Completion state",
  completionCompleted: "Completed",
  completionPartial: "Partial",
  completionNotCompleted: "Not completed",
  completionNote: "What actually happened?",
  completionNotePlaceholder: "Capture the reality of the session.",
  actualTimeline: "Actual timeline",
  actualPlannedLabel: (actual, planned) => `Actual ${actual} / Planned ${planned}`,
  interruptionCountLabel: (count) => `Interrupted ${count}x`,
  completedLabel: "Completed",
  activeLabel: "Active",
  abandonedLabel: "Abandoned",
  endOfDayReview: "End-of-day review",
  plannedVsActual: "Planned vs actual",
  focusIntegrity: "Focus Integrity",
  planAccuracy: "Plan Accuracy",
  stimulationLoad: "Stimulation Load",
  stimulationLeak: "Stimulation Leak",
  recoveryRatio: "Recovery Ratio",
  bestFocusWindow: "Best Focus Window",
  tomorrowSuggestion: "Tomorrow suggestion",
  saveReview: "Save review",
  regenerateAiInsight: "Regenerate AI insight",
  createTomorrowImprovement: "Create tomorrow improvement",
  sendSummaryToJournal: "Send summary to Journal",
  pinInsightWeeklyReview: "Pin insight to Weekly Review",
  unavailableAction: "Available after the core review is saved.",
  lowStimulationMode: "Low-Stimulation Mode",
  distractionGate: "Distraction Gate",
  aiAccessRequiresIntention: "AI access requires intention",
  urgeSurfing: "Urge Surfing",
  returnToFocus: "Return to focus",
  continueIntentionally: "Continue intentionally",
  captureNoteAndReturn: "Capture note and return",
  abandonSession: "Abandon session",
  gateTitle: "Pause before switching",
  gateDescription: (taskTitle, route) =>
    `You are in a focus session for: ${taskTitle}. Opening ${route} might help, or it might become an escape loop.`,
  gateReasonPlaceholder: "Why is this switch intentional?",
  gateCountdownLabel: (seconds) => `Continue intentionally in ${seconds}s`,
  focusPrivacyNote:
    "Focus & Reality only uses your planner, focus sessions, calendar constraints, and in-app navigation choices during active focus. It does not monitor your device.",
  calendarConstraintsUnavailable: "Calendar constraints unavailable",
  planQualityDrawerTitle: "Plan Quality Details",
  detectedIssues: "Detected issues",
  recommendedChanges: "Recommended changes",
  applyChange: "Apply change",
  applyAllSafeChanges: "Apply all safe changes",
  startFocusSheetTitle: "Start focus session",
  finishFocusSheetTitle: "Finish focus session",
  focusSessionType: "Session type",
  focusSessionDeepWork: "Deep work",
  focusSessionAdmin: "Admin",
  focusSessionLearning: "Learning",
  focusSessionCreative: "Creative",
  focusSessionMeeting: "Meeting",
  focusSessionRecovery: "Recovery",
  focusSessionPersonal: "Personal",
  meetingLabel: "Meetings",
  topFailurePattern: "Top failure pattern",
  reviewNotGenerated: "Generate a review after your focus sessions to see reality metrics.",
  noBestFocusWindow: "No best window yet",
  safeChangeLabel: "Safe",
  focusSessionStartedToast: "Focus session started.",
  focusSessionFinishedToast: "Focus session saved.",
  focusReviewSavedToast: "Daily focus review saved.",
  ariaBackToTop: "Back to the top",
  detailDialogTitle: "Task details",
  detailDuePrefix: "Due:",
  detailEstimatedPrefix: "Estimated:",
  detailClose: "Close",
  detailMoveTomorrow: "Move to tomorrow",
  detailDescription: "Description",
  detailReminders: "Reminders",
  detailRelatedNotes: "Related Notes",
  detailRelatedKnowledge: "Related Knowledge",
  detailRelatedIdeas: "Related Ideas",
  smartLinkMissingIdea: "Idea not found",
  smartLinkMissingNote: "Note not found",
  smartLinkMissingKnowledge: "Knowledge item not found",
  smartLinkLoading: "Loading…",
  detailSource: "Source",
  detailSourceLink: "Open resource",
  detailAiGenerated: "AI Generated",
  addTaskButton: "Add task",
  formatMinutes: (n) => `${n} min`,
  formatHoursMinutes: (h, m, totalMin) =>
    m === 0 ? `${h}h (${totalMin} min)` : `${h}h ${m}m (${totalMin} min)`,
  formatHoursOnly: (h, totalMin) => `${h}h (${totalMin} min)`,
  quickBreakfast: "Breakfast",
  quickLunch: "Lunch",
  quickDinner: "Dinner",
  quickGym: "Gym",
  quickMeditate: "Meditate",
  quickImprovise: "Improvise",
  quickRead: "Read",
  quickJournal: "Journal",
  quickBreak: "Break",
  quickRest: "Rest",
  done: "Done",
  dialogClose: "Close",
  pickerHourLabel: "Hour",
  pickerMinLabel: "Min",
  periodAm: "AM",
  periodPm: "PM",
  blockCountSummary: (blocks, durationText) =>
    `${blocks} block${blocks !== 1 ? "s" : ""} · ${durationText}`,
  blockAbbr: "b",
  taskCardBlockCount: (blocks) =>
    `${blocks} block${blocks !== 1 ? "s" : ""}`,
  untitledTask: "Untitled",
  defaultPlannerTaskName: "Task",
  ariaRemoveOneBlock: "Remove one block",
  ariaAddOneBlock: "Add one block",
  ariaPreTaskRitual: "Pre-task ritual",
  ariaRemoveTask: "Remove task",
  ariaHoldToReorder: "Hold to drag and reorder",
  importDialogTitle: "Import tasks",
  importSearchPlaceholder: "Search tasks…",
  importNoMatch: "No matching tasks",
  importSelectedButton: (n) =>
    `Import ${n} task${n !== 1 ? "s" : ""}`,
  aiSuggestionsModalTitle: "AI task suggestions",
  aiSuggestionsEmpty: "No suggestions available",
  aiRecDurationLine: (blocks, minutes) =>
    `${blocks} block${blocks !== 1 ? "s" : ""} (${minutes} min)`,
  templateNameLabel: "Template name *",
  templateNamePlaceholder: "e.g. Productive weekday",
  templateSaveBlurb: (taskCount) =>
    `This will save your current plan of ${taskCount} task${taskCount !== 1 ? "s" : ""} as a reusable template.`,
  templateSaveSubmit: "Save template",
  templateListEmpty: "No saved templates yet",
  templateListTaskCount: (n) =>
    `${n} task${n !== 1 ? "s" : ""}`,
  timelineTitle: (formattedDate) => `Your schedule for ${formattedDate}`,
  visualScheduleTitle: "Visual Schedule Generator",
  visualScheduleBlurb:
    "Turn today’s time blocks into a shareable poster. Pick a visual style, generate once, then download or regenerate with another look.",
  imageStyleLabel: "Image Style",
  generateScheduleImage: "Generate Schedule Image",
  regenerateScheduleImage: "Regenerate",
  downloadScheduleImage: "Download",
  scheduleImageGenerating: "Generating…",
  scheduleImageAlt: "Generated daily schedule illustration",
  toastScheduleImageReady: "Schedule image is ready. You can download it anytime.",
  toastScheduleImageFailed: "Could not generate the schedule image. Try again.",
  toastScheduleImageUnauthorized: "Sign in to generate schedule images.",
  reviewAiGenerated: "AI Generated",
  reviewDescription: "Description",
  reviewReminders: "Reminders",
  reviewAddReminder: "+ Add",
  reviewSuggestedTimeBlocks: "Suggested Time Blocks",
  reviewSuggestedPriority: "Suggested Priority",
  reviewStatus: "Status",
  reviewDueDate: "Due Date",
  reviewProject: "Project",
  reviewNoProject: "No project",
  reviewNotesLabel: "Notes",
  reviewNotesPlaceholder: "Write something…",
  reviewSmartLinks: "Smart Links",
  reviewRelatedNotes: "Related Notes",
  reviewRelatedKnowledge: "Related Knowledge",
  reviewRelatedIdeas: "Related Ideas",
  reviewRelatedResources: "Related Resources",
  reviewResourceAll: "All",
  reviewResourceArticle: "Articles",
  reviewResourceVideo: "Videos",
  reviewResourcePodcast: "Podcasts",
  reviewResourceShopping: "Shopping",
  reviewPriorityLow: "Low",
  reviewPriorityMedium: "Medium",
  reviewPriorityHigh: "High",
  reviewPriorityUrgent: "Urgent",
  reviewStatusTodo: "To Do",
  reviewStatusInProgress: "In Progress",
  reviewStatusDone: "Done",
  reviewStatusCancelled: "Cancelled",
  reviewCreating: "Creating…",
  quickTaskDelete: "Delete",
  quickTaskDeleteConfirm: (name) => `Remove "${name}" from quick tasks?`,
  quickTaskAddNew: "Add Quick Task",
  quickTaskAddDialogTitle: "Add Quick Task",
  quickTaskNameLabel: "Task name",
  quickTaskNamePlaceholder: "e.g. Walk the dog",
  quickTaskBlocksLabel: "Time blocks",
  quickTaskToastAdded: (name) => `Added "${name}" to quick tasks`,
  quickTaskToastDeleted: (name) => `Removed "${name}" from quick tasks`,
  quickTaskIconRegenerate: "Regenerate icon",
  quickTaskIconGenerating: "Generating icon…",
  quickTaskIconRegenerated: (name) => `Regenerated icon for "${name}"`,
  quickTaskIconRegenerateFailed: "Could not regenerate this icon.",
  quickTaskAiIcons: "Generate AI icons (Liquid Glass)",
  quickTaskAiIconsGenerating: "Generating icons…",
  quickTaskAiIconsToastDone: (count) =>
    count === 0 ? "No icons needed updating." : `Updated ${count} quick task icon(s).`,
  quickTaskAiIconsToastNone: "No quick tasks to generate icons for.",
};

const zhTW: DailyPlannerUiCopy = {
  pageTitle: "每日規劃",
  pageDescription: "以時間塊為單位，拼出理想的一天",
  aiSuggestions: "取得 AI 建議",
  aiThinking: "思考中…",
  templates: "範本",
  saveAsTemplate: "儲存為範本",
  loadTemplate: "載入範本",
  today: "今天",
  syncGoogleCalendar: "同步到 Google 日曆",
  startTime: "開始時間",
  endTime: "結束時間",
  nextDayBadge: "+1 天",
  crossesIntoDayLabel: (formattedDate) => `延伸至 ${formattedDate}`,
  available: "可用",
  planned: "已排",
  remaining: "剩餘",
  overBy: "超出 ",
  taskBuilder: "任務組裝",
  createTaskWithAi: "建立任務",
  importFromTasks: "從任務匯入",
  quickAdd: "快速加入",
  yourPlan: (n) => `你的規劃（${n} 項任務）`,
  blocksLabel: "塊",
  noTasksYet: "尚無任務，先從上方加入吧！",
  backToTop: "回到頂端",
  ariaPreviousDay: "前一天",
  ariaNextDay: "後一天",
  createAiDialogTitle: "建立任務",
  taskNameLabel: "任務名稱",
  taskNamePlaceholder: "例如：審閱專案提案",
  createAiHint:
    "AI 會先問幾個量身問題，再建議要預留幾個 10 分鐘時間塊；加入後仍可手動調整。",
  createAiUnderstandHeading: "讓我更了解你的任務",
  createAiQuestionProgress: (current, total) => `第 ${current} 題，共 ${total} 題`,
  createAiCustomAnswerLabel: "或自行輸入答案…",
  createAiCustomAnswerPlaceholder: "在這裡輸入…",
  createAiNext: "下一步",
  createAiSkipAll: "略過全部並產生",
  createAiLoadingQuestions: "正在準備問題…",
  createAiGenerating: "AI 正在為你安排時間…",
  createWithAiButton: "用 AI 建立",
  addQuicklyButton: "快速加入（一個區塊）",
  addManuallyButton: "手動新增",
  autofillMetadataWithAi: "以 AI 自動填入詳細資料",
  autofillMetadataWithAiHint: "開啟後會依任務名稱推斷欄位；您仍可自由修改。",
  backToCreateOptions: "改用其他建立方式…",
  toastAiPlannerError: "無法連線到 AI，請稍後再試。",
  toastAiPlannerUnauthorized: "請先登入以使用 AI 建立任務。",
  toastDailyPlanSaveFailed: "無法儲存每日規劃",
  toastDailyPlanUpdateFailed: "無法更新每日規劃",
  toastPlannerAiOfflineHint:
    "Google Gemini 未能產生可用題目，已改用內建題目。請查看執行 `npm run dev` 的終端機錯誤訊息（GEMINI_API_KEY、模型名稱或配額）。",
  createAiRetry: "再試一次",
  toastCreatedAiPlanner: (name, blocks, durationText) =>
    `已加入「${name}」· ${blocks} 塊（${durationText}）`,
  cancel: "取消",
  add: "加入",
  confirmLoadTemplate: "載入範本會取代目前的規劃，確定繼續？",
  toastImported: (n) => `已匯入 ${n} 項任務`,
  toastAdded: (title) => `已加入「${title}」`,
  toastNoQuickDetails: "快速加入的任務沒有詳細內容",
  toastTaskNotFound: "找不到任務詳情",
  toastMovedTomorrow: "已將任務移到明天",
  toastTemplateLoaded: (name) => `已載入範本「${name}」`,
  toastCreatedAi: (name) => `已建立「${name}」`,
  googleCalendarEventPrefix: "理想人生 OS",
  toastGoogleNoTasks: "請先加入至少一項任務，再同步到 Google 日曆。",
  toastGoogleNeedSignIn: "請先登入，才能同步到 Google 日曆。",
  toastGoogleNeedRealSession:
    "需要雲端帳戶。請登出示範模式，並以 Google 或 Apple 登入，然後在設定中連結日曆。",
  toastGoogleSynced: (n) =>
    `已將 ${n} 個日曆活動同步到 Google 日曆（已取代當日先前由本 app 同步的行程）。`,
  toastGoogleSyncFailed: "無法同步到 Google 日曆。請再試一次，或到設定重新連結。",
  toastGoogleReauthorize: "正在重新連結 Google 以取得日曆權限…",
  googleCalendarSyncNowButton: "Google Calendar 立即同步",
  googleCalendarSyncingNowButton: "Google Calendar 同步中",
  googleCalendarConnectedAccountHint: (email) =>
    email ? `已連結 Google 日曆 · ${email}` : "已連結 Google 日曆",
  googleCalendarSaveAndSyncLoading: "正在儲存規劃並與 Google 日曆同步…",
  googleCalendarLastUpdatedLabel: (stamp) => `最後更新：${stamp}`,
  googleCalendarServerSyncHint:
    "每次儲存後會先把時間區塊推到 Google 日曆，再拉回遠端修改（例如在 Google 改短時長）。你仍可隨時按「立即同步」。",
  googleCalendarFreeModeSyncHint:
    "逐項 Google 同步僅適用於時間區塊模式。若要管理日曆，請切換模式或前往設定。",
  toastGoogleCalendarSyncNowOk: (result) => {
    if (result.conflicts > 0) {
      return `日曆同步衝突 · ${result.conflicts} 項需檢視`;
    }
    const parts: string[] = [];
    if (result.localPushed > 0) parts.push(`已推送 ${result.localPushed} 項本機變更`);
    if (result.remoteApplied > 0) parts.push(`已套用 ${result.remoteApplied} 項遠端變更`);
    if (parts.length === 0) return "日曆同步完成 · 無遠端變更";
    return `日曆同步完成 · ${parts.join(" · ")}`;
  },
  toastGoogleCalendarSyncNowFailed: "日曆同步未完成；你的規劃仍已安全儲存在本機。",
  calendarSyncTooltipSynced: "Google 日曆：已同步",
  calendarSyncTooltipPending: "Google 日曆：等待上傳",
  calendarSyncTooltipError: "Google 日曆：同步錯誤（請至設定重試）",
  calendarSyncTooltipConflict: "Google 日曆：衝突 — 請在設定或重試流程中處理",
  calendarSyncTooltipRemoteDeleted: "已在 Google 日曆刪除此事件 — 請在設定決定下一步",
  toastFocusActivated: "專注模式已啟動！",
  focusRealityTitle: "專注與現實",
  todayFocus: "今日專注",
  planQuality: "規劃品質",
  planQualityScore: (score) => `規劃品質 ${score}`,
  analyzePlan: "分析規劃",
  improvePlan: "改善規劃",
  startFirstFocus: "開始第一段專注",
  startFocus: "開始專注",
  finishFocus: "完成",
  pause: "暫停",
  resume: "繼續",
  distracted: "我分心了",
  reviewDay: "回顧今天",
  openReview: "開啟回顧",
  openDetails: "查看詳情",
  noPlanFocusHint: "建立規劃後即可解鎖專注與現實洞察。",
  planQualityUnchecked: "尚未檢查規劃品質。",
  noQualityIssue: "未偵測到主要問題。",
  deepWorkLabel: "深度工作",
  focusTargetLabel: (value) => `深度工作 ${value}`,
  breaksLabel: "休息",
  breakStatusLabel: (status) => `休息 ${status}`,
  stimulationRisk: "刺激風險",
  riskLabel: (risk) => `風險 ${risk}`,
  activeFocus: "專注進行中",
  runningTimerLabel: "計時中",
  winCondition: "勝利條件",
  winConditionPlaceholder: "完成什麼才算這段專注成功？",
  allowedTools: "允許工具",
  allowedToolsPlaceholder: "文件、編輯器、筆記本",
  blockedRoutes: "高刺激路徑",
  blockedRoutesPlaceholder: "/youtube-radar, /ai-assistant",
  energyBefore: "開始前能量",
  energyAfter: "結束後能量",
  focusRating: "專注評分",
  completionState: "完成狀態",
  completionCompleted: "已完成",
  completionPartial: "部分完成",
  completionNotCompleted: "未完成",
  completionNote: "實際發生了什麼？",
  completionNotePlaceholder: "記錄這段專注的真實狀況。",
  actualTimeline: "實際時間線",
  actualPlannedLabel: (actual, planned) => `實際 ${actual} / 原定 ${planned}`,
  interruptionCountLabel: (count) => `中斷 ${count} 次`,
  completedLabel: "已完成",
  activeLabel: "進行中",
  abandonedLabel: "已放棄",
  endOfDayReview: "日末回顧",
  plannedVsActual: "原定 vs 實際",
  focusIntegrity: "專注完整度",
  planAccuracy: "規劃準確度",
  stimulationLoad: "刺激負荷",
  stimulationLeak: "刺激外洩",
  recoveryRatio: "恢復比例",
  bestFocusWindow: "最佳專注時段",
  tomorrowSuggestion: "明日建議",
  saveReview: "儲存回顧",
  regenerateAiInsight: "重新生成 AI 洞察",
  createTomorrowImprovement: "建立明日改善",
  sendSummaryToJournal: "送到日記",
  pinInsightWeeklyReview: "釘選到週回顧",
  unavailableAction: "儲存核心回顧後可用。",
  lowStimulationMode: "低刺激模式",
  distractionGate: "分心閘門",
  aiAccessRequiresIntention: "使用 AI 前先確認意圖",
  urgeSurfing: "衝動衝浪",
  returnToFocus: "回到專注",
  continueIntentionally: "有意識地繼續",
  captureNoteAndReturn: "記下原因並返回",
  abandonSession: "放棄專注",
  gateTitle: "切換前先停一下",
  gateDescription: (taskTitle, route) =>
    `你正在專注於：${taskTitle}。開啟 ${route} 可能有幫助，也可能變成逃避迴圈。`,
  gateReasonPlaceholder: "這次切換的意圖是什麼？",
  gateCountdownLabel: (seconds) => `${seconds} 秒後可有意識地繼續`,
  focusPrivacyNote:
    "專注與現實只使用你的每日規劃、專注段落、日曆限制，以及專注期間的站內導航選擇；不會監控你的裝置。",
  calendarConstraintsUnavailable: "無法取得日曆限制",
  planQualityDrawerTitle: "規劃品質詳情",
  detectedIssues: "偵測到的問題",
  recommendedChanges: "建議調整",
  applyChange: "套用調整",
  applyAllSafeChanges: "套用全部安全調整",
  startFocusSheetTitle: "開始專注段落",
  finishFocusSheetTitle: "完成專注段落",
  focusSessionType: "段落類型",
  focusSessionDeepWork: "深度工作",
  focusSessionAdmin: "行政處理",
  focusSessionLearning: "學習",
  focusSessionCreative: "創作",
  focusSessionMeeting: "會議",
  focusSessionRecovery: "恢復",
  focusSessionPersonal: "個人事項",
  meetingLabel: "會議",
  topFailurePattern: "主要失效模式",
  reviewNotGenerated: "完成專注段落後產生回顧，查看實際執行指標。",
  noBestFocusWindow: "尚未找到最佳窗口",
  safeChangeLabel: "安全",
  focusSessionStartedToast: "專注段落已開始。",
  focusSessionFinishedToast: "專注段落已儲存。",
  focusReviewSavedToast: "每日專注回顧已儲存。",
  ariaBackToTop: "回到頂端",
  detailDialogTitle: "任務詳情",
  detailDuePrefix: "到期：",
  detailEstimatedPrefix: "預估：",
  detailClose: "關閉",
  detailMoveTomorrow: "移到明天",
  detailDescription: "描述",
  detailReminders: "提醒",
  detailRelatedNotes: "相關筆記",
  detailRelatedKnowledge: "相關知識",
  detailRelatedIdeas: "相關想法",
  smartLinkMissingIdea: "找不到此想法",
  smartLinkMissingNote: "找不到此筆記",
  smartLinkMissingKnowledge: "找不到此知識項目",
  smartLinkLoading: "載入中…",
  detailSource: "來源",
  detailSourceLink: "打開資源",
  detailAiGenerated: "AI 生成",
  addTaskButton: "加入任務",
  formatMinutes: (n) => `${n} 分鐘`,
  formatHoursMinutes: (h, m, totalMin) =>
    m === 0 ? `${h} 小時（${totalMin} 分鐘）` : `${h} 小時 ${m} 分（${totalMin} 分鐘）`,
  formatHoursOnly: (h, totalMin) => `${h} 小時（${totalMin} 分鐘）`,
  quickBreakfast: "早餐",
  quickLunch: "午餐",
  quickDinner: "晚餐",
  quickGym: "健身",
  quickMeditate: "冥想",
  quickImprovise: "即興練習",
  quickRead: "閱讀",
  quickJournal: "日記",
  quickBreak: "休息",
  quickRest: "睡眠準備",
  done: "完成",
  dialogClose: "關閉",
  pickerHourLabel: "時",
  pickerMinLabel: "分",
  periodAm: "上午",
  periodPm: "下午",
  blockCountSummary: (blocks, durationText) => `${blocks} 塊 · ${durationText}`,
  blockAbbr: "塊",
  taskCardBlockCount: (blocks) => `${blocks} 塊`,
  untitledTask: "未命名",
  defaultPlannerTaskName: "任務",
  ariaRemoveOneBlock: "減少一塊時間",
  ariaAddOneBlock: "增加一塊時間",
  ariaPreTaskRitual: "任務前儀式",
  ariaRemoveTask: "移除任務",
  ariaHoldToReorder: "長按以拖曳排序",
  importDialogTitle: "從任務匯入",
  importSearchPlaceholder: "搜尋任務…",
  importNoMatch: "沒有符合的任務",
  importSelectedButton: (n) => `匯入 ${n} 項任務`,
  aiSuggestionsModalTitle: "AI 任務建議",
  aiSuggestionsEmpty: "暫無建議",
  aiRecDurationLine: (blocks, minutes) =>
    `${blocks} 塊（${minutes} 分鐘）`,
  templateNameLabel: "範本名稱 *",
  templateNamePlaceholder: "例如：高效平日",
  templateSaveBlurb: (taskCount) =>
    `會將你目前規劃中的 ${taskCount} 項任務儲存為可重複使用的範本。`,
  templateSaveSubmit: "儲存範本",
  templateListEmpty: "尚無已儲存的範本",
  templateListTaskCount: (n) => `${n} 項任務`,
  timelineTitle: (formattedDate) => `${formattedDate} 的排程`,
  visualScheduleTitle: "視覺行程產生器",
  visualScheduleBlurb:
    "把今天的時間塊變成一張可分享的行程海報。選擇風格後產生，隨時下載或換風格重新產生。",
  imageStyleLabel: "圖像風格",
  generateScheduleImage: "產生行程圖",
  regenerateScheduleImage: "重新產生",
  downloadScheduleImage: "下載",
  scheduleImageGenerating: "產生中…",
  scheduleImageAlt: "已產生的每日行程插畫",
  toastScheduleImageReady: "行程圖已就緒，可隨時下載。",
  toastScheduleImageFailed: "無法產生行程圖，請再試一次。",
  toastScheduleImageUnauthorized: "請先登入以產生行程圖。",
  reviewAiGenerated: "AI 生成",
  reviewDescription: "描述",
  reviewReminders: "提醒",
  reviewAddReminder: "+ 新增",
  reviewSuggestedTimeBlocks: "建議時間塊",
  reviewSuggestedPriority: "建議優先級",
  reviewStatus: "狀態",
  reviewDueDate: "到期日",
  reviewProject: "專案",
  reviewNoProject: "無專案",
  reviewNotesLabel: "備註",
  reviewNotesPlaceholder: "輸入備註…",
  reviewSmartLinks: "智能關聯",
  reviewRelatedNotes: "相關筆記",
  reviewRelatedKnowledge: "相關知識",
  reviewRelatedIdeas: "相關想法",
  reviewRelatedResources: "相關資源",
  reviewResourceAll: "全部",
  reviewResourceArticle: "文章",
  reviewResourceVideo: "影片",
  reviewResourcePodcast: "Podcast",
  reviewResourceShopping: "購物",
  reviewPriorityLow: "低",
  reviewPriorityMedium: "中",
  reviewPriorityHigh: "高",
  reviewPriorityUrgent: "緊急",
  reviewStatusTodo: "待辦",
  reviewStatusInProgress: "進行中",
  reviewStatusDone: "完成",
  reviewStatusCancelled: "已取消",
  reviewCreating: "建立中…",
  quickTaskDelete: "刪除",
  quickTaskDeleteConfirm: (name) => `確定要從快速任務中移除「${name}」嗎？`,
  quickTaskAddNew: "新增快速任務",
  quickTaskAddDialogTitle: "新增快速任務",
  quickTaskNameLabel: "任務名稱",
  quickTaskNamePlaceholder: "例如：遛狗",
  quickTaskBlocksLabel: "時間塊數量",
  quickTaskToastAdded: (name) => `已將「${name}」加入快速任務`,
  quickTaskToastDeleted: (name) => `已從快速任務中移除「${name}」`,
  quickTaskIconRegenerate: "重新生成圖示",
  quickTaskIconGenerating: "正在生成圖示…",
  quickTaskIconRegenerated: (name) => `已重新生成「${name}」的圖示`,
  quickTaskIconRegenerateFailed: "無法重新生成此圖示。",
  quickTaskAiIcons: "生成 AI 圖示（Liquid Glass）",
  quickTaskAiIconsGenerating: "正在生成圖示…",
  quickTaskAiIconsToastDone: (count) =>
    count === 0 ? "沒有需要更新的圖示。" : `已更新 ${count} 個快速任務圖示。`,
  quickTaskAiIconsToastNone: "沒有可生成圖示的快速任務。",
  modeToggleAriaLabel: "規劃模式",
  modeTimeBlock: "時間塊規劃",
  modeFree: "自由規劃",
  freePlanningWindowLabel: "規劃時段",
  freePlanningWindowSameDay: (start, end) => `${start} → ${end}`,
  freePlanningWindowCrossDay: (startDate, start, endDate, end) =>
    `${startDate} ${start} → ${endDate} ${end}`,
  freePlanningWindowHelper: "只是一段大致範圍 — 自由規劃模式不需要為每件事訂下時間。",
  freeQuickCaptureHeading: "今天想完成哪些事？",
  freeQuickCaptureBlurb: "先快速捕捉，之後再排序與整理。",
  freeQuickCapturePlaceholder: "快速新增任務…",
  freeQuickCaptureSubmit: "新增",
  freeQuickCaptureKeyboardHint: "Enter 新增 · ⌘/Ctrl + Enter 連續新增",
  freePriorityMust: "必做",
  freePriorityShould: "想做",
  freePriorityCould: "可選",
  freePriorityDone: "完成",
  freePriorityHint: (priority) => `拖到這裡標記為「${priority}」`,
  freeBoardEmpty: (priority) => `${priority} 還沒有任務。`,
  freeBoardSummary: (total, completed) => `已捕捉 ${total} 件 · 完成 ${completed} 件`,
  freeBoardMustSummary: (count) => `必做 ${count} 件`,
  freeStatCaptured: "已捕捉",
  freeRemoveTask: "移除任務",
  freeChangePriority: "調整優先級",
  freeMoveTaskToBucket: (priority) => `移到「${priority}」`,
  freeTaskDetailsTitle: "任務詳情",
  freeTaskTitleLabel: "任務名稱",
  freeTaskNotesLabel: "筆記",
  freeTaskNotesPlaceholder: "加入這個任務的背景、細節或提醒……",
  freeTaskPriorityLabel: "優先分類",
  freeTaskSaveChanges: "儲存修改",
  freeTaskDelete: "刪除",
  freeTaskCancel: "取消",
  freeTaskAddNotes: "加入筆記",
  freeTaskHideNotes: "收起筆記",
  freeTaskTitleRequired: "請輸入任務名稱",
  freeTaskOpenDetails: (title) => `開啟「${title}」的任務詳情`,
  freePlanSummaryTitle: "自由規劃摘要",
  freePlanSummaryBlurb: "依優先級彙整今天的自由規劃，不會生成虛構時段。",
  freeGoogleSyncTitle: (formattedDate) => `自由規劃 — ${formattedDate}`,
  freeGoogleSyncedToast: "自由規劃已同步到 Google 日曆。",
  freeGoogleNoTasksToast: "還沒有任務可同步 — 先加幾項試試。",
};

const zhCN: DailyPlannerUiCopy = {
  pageTitle: "每日规划",
  pageDescription: "以时间块为单位，拼出理想的一天",
  aiSuggestions: "获取 AI 建议",
  aiThinking: "思考中…",
  templates: "模板",
  saveAsTemplate: "保存为模板",
  loadTemplate: "加载模板",
  today: "今天",
  syncGoogleCalendar: "同步到 Google 日历",
  startTime: "开始时间",
  endTime: "结束时间",
  nextDayBadge: "+1 天",
  crossesIntoDayLabel: (formattedDate) => `延伸至 ${formattedDate}`,
  available: "可用",
  planned: "已排",
  remaining: "剩余",
  overBy: "超出 ",
  taskBuilder: "任务组装",
  createTaskWithAi: "创建任务",
  importFromTasks: "从任务导入",
  quickAdd: "快速添加",
  yourPlan: (n) => `你的规划（${n} 项任务）`,
  blocksLabel: "块",
  noTasksYet: "还没有任务，先从上面添加吧！",
  backToTop: "回到顶部",
  ariaPreviousDay: "前一天",
  ariaNextDay: "后一天",
  createAiDialogTitle: "创建任务",
  taskNameLabel: "任务名称",
  taskNamePlaceholder: "例如：审阅项目提案",
  createAiHint:
    "AI 会先问几个贴合你任务的问题，再建议预留多少个 10 分钟时间块；加入后仍可手动调整。",
  createAiUnderstandHeading: "让我更了解你的任务",
  createAiQuestionProgress: (current, total) => `第 ${current} 题，共 ${total} 题`,
  createAiCustomAnswerLabel: "或输入自己的答案…",
  createAiCustomAnswerPlaceholder: "在此输入…",
  createAiNext: "下一步",
  createAiSkipAll: "跳过全部并生成",
  createAiLoadingQuestions: "正在准备问题…",
  createAiGenerating: "AI 正在为你安排时间…",
  createWithAiButton: "用 AI 创建",
  addQuicklyButton: "快速添加（一个区块）",
  addManuallyButton: "手动添加",
  autofillMetadataWithAi: "使用 AI 自动填充元数据",
  autofillMetadataWithAiHint: "开启后根据任务名称推断各字段；您仍可编辑。",
  backToCreateOptions: "其他创建方式…",
  toastAiPlannerError: "无法连接 AI，请稍后再试。",
  toastAiPlannerUnauthorized: "请先登录以使用 AI 创建任务。",
  toastDailyPlanSaveFailed: "无法保存每日规划",
  toastDailyPlanUpdateFailed: "无法更新每日规划",
  toastPlannerAiOfflineHint:
    "Google Gemini 未能生成可用问题，已改用内置问题。请查看运行 `npm run dev` 的终端错误信息（GEMINI_API_KEY、模型名或配额）。",
  createAiRetry: "重试",
  toastCreatedAiPlanner: (name, blocks, durationText) =>
    `已添加「${name}」· ${blocks} 块（${durationText}）`,
  cancel: "取消",
  add: "添加",
  confirmLoadTemplate: "加载模板会取代当前的规划，确定继续？",
  toastImported: (n) => `已导入 ${n} 项任务`,
  toastAdded: (title) => `已添加「${title}」`,
  toastNoQuickDetails: "快速添加的任务没有详细内容",
  toastTaskNotFound: "找不到任务详情",
  toastMovedTomorrow: "已将任务移到明天",
  toastTemplateLoaded: (name) => `已加载模板「${name}」`,
  toastCreatedAi: (name) => `已创建「${name}」`,
  googleCalendarEventPrefix: "理想人生 OS",
  toastGoogleNoTasks: "请先加入至少一项任务，再同步到 Google 日历。",
  toastGoogleNeedSignIn: "请先登录，才能同步到 Google 日历。",
  toastGoogleNeedRealSession:
    "需要云端账户。请登出演示模式，并以 Google 或 Apple 登录，然后在设置中连接日历。",
  toastGoogleSynced: (n) =>
    `已将 ${n} 个日历活动同步到 Google 日历（已替换当日先前由本应用同步的日程）。`,
  toastGoogleSyncFailed: "无法同步到 Google 日历。请重试，或到设置重新连接。",
  toastGoogleReauthorize: "正在重新连接 Google 以获取日历权限…",
  googleCalendarSyncNowButton: "Google Calendar 立即同步",
  googleCalendarSyncingNowButton: "Google Calendar 同步中",
  googleCalendarConnectedAccountHint: (email) =>
    email ? `已连接 Google 日历 · ${email}` : "已连接 Google 日历",
  googleCalendarSaveAndSyncLoading: "正在保存规划并与 Google 日历同步…",
  googleCalendarLastUpdatedLabel: (stamp) => `最后更新：${stamp}`,
  googleCalendarServerSyncHint: "每次保存后会先推送时间块到 Google 日历，再拉回远程修改（例如在 Google 缩短时长）。你仍可随时使用「立即同步」。",
  googleCalendarFreeModeSyncHint: "逐项 Google 同步仅适用于时间块模式。若要管理日历，请切换模式或打开设置。",
  toastGoogleCalendarSyncNowOk: (result) => {
    if (result.conflicts > 0) {
      return `日历同步冲突 · ${result.conflicts} 项需处理`;
    }
    const parts: string[] = [];
    if (result.localPushed > 0) parts.push(`已推送 ${result.localPushed} 项本地变更`);
    if (result.remoteApplied > 0) parts.push(`已应用 ${result.remoteApplied} 项远程变更`);
    if (parts.length === 0) return "日历同步完成 · 无远程变更";
    return `日历同步完成 · ${parts.join(" · ")}`;
  },
  toastGoogleCalendarSyncNowFailed: "日历同步未完成；你的规划仍已保存在本地。",
  calendarSyncTooltipSynced: "Google 日历：已同步",
  calendarSyncTooltipPending: "Google 日历：等待上传",
  calendarSyncTooltipError: "Google 日历：同步错误（请在设置重试）",
  calendarSyncTooltipConflict: "Google 日历：冲突 — 请在设置或重试流程中处理",
  calendarSyncTooltipRemoteDeleted: "该事件已在 Google 日历删除 — 请在设置决定下一步",
  toastFocusActivated: "专注模式已启动！",
  focusRealityTitle: "专注与现实",
  todayFocus: "今日专注",
  planQuality: "规划质量",
  planQualityScore: (score) => `规划质量 ${score}`,
  analyzePlan: "分析规划",
  improvePlan: "改善规划",
  startFirstFocus: "开始第一段专注",
  startFocus: "开始专注",
  finishFocus: "完成",
  pause: "暂停",
  resume: "继续",
  distracted: "我分心了",
  reviewDay: "回顾今天",
  openReview: "打开回顾",
  openDetails: "查看详情",
  noPlanFocusHint: "创建规划后即可解锁专注与现实洞察。",
  planQualityUnchecked: "尚未检查规划质量。",
  noQualityIssue: "未检测到主要问题。",
  deepWorkLabel: "深度工作",
  focusTargetLabel: (value) => `深度工作 ${value}`,
  breaksLabel: "休息",
  breakStatusLabel: (status) => `休息 ${status}`,
  stimulationRisk: "刺激风险",
  riskLabel: (risk) => `风险 ${risk}`,
  activeFocus: "专注进行中",
  runningTimerLabel: "计时中",
  winCondition: "胜利条件",
  winConditionPlaceholder: "完成什么才算这段专注成功？",
  allowedTools: "允许工具",
  allowedToolsPlaceholder: "文档、编辑器、笔记本",
  blockedRoutes: "高刺激路径",
  blockedRoutesPlaceholder: "/youtube-radar, /ai-assistant",
  energyBefore: "开始前能量",
  energyAfter: "结束后能量",
  focusRating: "专注评分",
  completionState: "完成状态",
  completionCompleted: "已完成",
  completionPartial: "部分完成",
  completionNotCompleted: "未完成",
  completionNote: "实际发生了什么？",
  completionNotePlaceholder: "记录这段专注的真实情况。",
  actualTimeline: "实际时间线",
  actualPlannedLabel: (actual, planned) => `实际 ${actual} / 原定 ${planned}`,
  interruptionCountLabel: (count) => `中断 ${count} 次`,
  completedLabel: "已完成",
  activeLabel: "进行中",
  abandonedLabel: "已放弃",
  endOfDayReview: "日末回顾",
  plannedVsActual: "原定 vs 实际",
  focusIntegrity: "专注完整度",
  planAccuracy: "规划准确度",
  stimulationLoad: "刺激负荷",
  stimulationLeak: "刺激外泄",
  recoveryRatio: "恢复比例",
  bestFocusWindow: "最佳专注时段",
  tomorrowSuggestion: "明日建议",
  saveReview: "保存回顾",
  regenerateAiInsight: "重新生成 AI 洞察",
  createTomorrowImprovement: "创建明日改善",
  sendSummaryToJournal: "发送到日记",
  pinInsightWeeklyReview: "固定到周回顾",
  unavailableAction: "保存核心回顾后可用。",
  lowStimulationMode: "低刺激模式",
  distractionGate: "分心闸门",
  aiAccessRequiresIntention: "使用 AI 前先确认意图",
  urgeSurfing: "冲动冲浪",
  returnToFocus: "回到专注",
  continueIntentionally: "有意识地继续",
  captureNoteAndReturn: "记下原因并返回",
  abandonSession: "放弃专注",
  gateTitle: "切换前先停一下",
  gateDescription: (taskTitle, route) =>
    `你正在专注于：${taskTitle}。打开 ${route} 可能有帮助，也可能变成逃避循环。`,
  gateReasonPlaceholder: "这次切换的意图是什么？",
  gateCountdownLabel: (seconds) => `${seconds} 秒后可有意识地继续`,
  focusPrivacyNote:
    "专注与现实只使用你的每日规划、专注段落、日历限制，以及专注期间的站内导航选择；不会监控你的设备。",
  calendarConstraintsUnavailable: "无法获取日历限制",
  planQualityDrawerTitle: "规划质量详情",
  detectedIssues: "检测到的问题",
  recommendedChanges: "建议调整",
  applyChange: "应用调整",
  applyAllSafeChanges: "应用全部安全调整",
  startFocusSheetTitle: "开始专注段落",
  finishFocusSheetTitle: "完成专注段落",
  focusSessionType: "段落类型",
  focusSessionDeepWork: "深度工作",
  focusSessionAdmin: "行政处理",
  focusSessionLearning: "学习",
  focusSessionCreative: "创作",
  focusSessionMeeting: "会议",
  focusSessionRecovery: "恢复",
  focusSessionPersonal: "个人事项",
  meetingLabel: "会议",
  topFailurePattern: "主要失效模式",
  reviewNotGenerated: "完成专注段落后生成回顾，查看实际执行指标。",
  noBestFocusWindow: "尚未找到最佳窗口",
  safeChangeLabel: "安全",
  focusSessionStartedToast: "专注段落已开始。",
  focusSessionFinishedToast: "专注段落已保存。",
  focusReviewSavedToast: "每日专注回顾已保存。",
  ariaBackToTop: "回到顶部",
  detailDialogTitle: "任务详情",
  detailDuePrefix: "截止：",
  detailEstimatedPrefix: "预估：",
  detailClose: "关闭",
  detailMoveTomorrow: "移到明天",
  detailDescription: "描述",
  detailReminders: "提醒",
  detailRelatedNotes: "相关笔记",
  detailRelatedKnowledge: "相关知识",
  detailRelatedIdeas: "相关想法",
  smartLinkMissingIdea: "未找到该想法",
  smartLinkMissingNote: "未找到该笔记",
  smartLinkMissingKnowledge: "未找到该知识条目",
  smartLinkLoading: "加载中…",
  detailSource: "来源",
  detailSourceLink: "打开资源",
  detailAiGenerated: "AI 生成",
  addTaskButton: "添加任务",
  formatMinutes: (n) => `${n} 分钟`,
  formatHoursMinutes: (h, m, totalMin) =>
    m === 0 ? `${h} 小时（${totalMin} 分钟）` : `${h} 小时 ${m} 分（${totalMin} 分钟）`,
  formatHoursOnly: (h, totalMin) => `${h} 小时（${totalMin} 分钟）`,
  quickBreakfast: "早餐",
  quickLunch: "午餐",
  quickDinner: "晚餐",
  quickGym: "健身",
  quickMeditate: "冥想",
  quickImprovise: "即兴练习",
  quickRead: "阅读",
  quickJournal: "日记",
  quickBreak: "休息",
  quickRest: "睡前放松",
  done: "完成",
  dialogClose: "关闭",
  pickerHourLabel: "时",
  pickerMinLabel: "分",
  periodAm: "上午",
  periodPm: "下午",
  blockCountSummary: (blocks, durationText) => `${blocks} 块 · ${durationText}`,
  blockAbbr: "块",
  taskCardBlockCount: (blocks) => `${blocks} 块`,
  untitledTask: "未命名",
  defaultPlannerTaskName: "任务",
  ariaRemoveOneBlock: "减少一块时间",
  ariaAddOneBlock: "增加一块时间",
  ariaPreTaskRitual: "任务前仪式",
  ariaRemoveTask: "移除任务",
  ariaHoldToReorder: "长按以拖动排序",
  importDialogTitle: "从任务导入",
  importSearchPlaceholder: "搜索任务…",
  importNoMatch: "没有匹配的任务",
  importSelectedButton: (n) => `导入 ${n} 项任务`,
  aiSuggestionsModalTitle: "AI 任务建议",
  aiSuggestionsEmpty: "暂无建议",
  aiRecDurationLine: (blocks, minutes) =>
    `${blocks} 块（${minutes} 分钟）`,
  templateNameLabel: "模板名称 *",
  templateNamePlaceholder: "例如：高效工作日",
  templateSaveBlurb: (taskCount) =>
    `会将你当前规划中的 ${taskCount} 项任务保存为可重复使用的模板。`,
  templateSaveSubmit: "保存模板",
  templateListEmpty: "还没有已保存的模板",
  templateListTaskCount: (n) => `${n} 项任务`,
  timelineTitle: (formattedDate) => `${formattedDate} 的日程`,
  visualScheduleTitle: "视觉日程生成器",
  visualScheduleBlurb:
    "把今天的时间块变成可分享的海报。选择风格后生成，可随时下载或换风格重新生成。",
  imageStyleLabel: "图像风格",
  generateScheduleImage: "生成日程图",
  regenerateScheduleImage: "重新生成",
  downloadScheduleImage: "下载",
  scheduleImageGenerating: "生成中…",
  scheduleImageAlt: "已生成的每日日程插画",
  toastScheduleImageReady: "日程图已就绪，可随时下载。",
  toastScheduleImageFailed: "无法生成日程图，请重试。",
  toastScheduleImageUnauthorized: "请先登录以生成日程图。",
  reviewAiGenerated: "AI 生成",
  reviewDescription: "描述",
  reviewReminders: "提醒",
  reviewAddReminder: "+ 添加",
  reviewSuggestedTimeBlocks: "建议时间块",
  reviewSuggestedPriority: "建议优先级",
  reviewStatus: "状态",
  reviewDueDate: "截止日期",
  reviewProject: "项目",
  reviewNoProject: "无项目",
  reviewNotesLabel: "备注",
  reviewNotesPlaceholder: "输入备注…",
  reviewSmartLinks: "智能关联",
  reviewRelatedNotes: "相关笔记",
  reviewRelatedKnowledge: "相关知识",
  reviewRelatedIdeas: "相关想法",
  reviewRelatedResources: "相关资源",
  reviewResourceAll: "全部",
  reviewResourceArticle: "文章",
  reviewResourceVideo: "视频",
  reviewResourcePodcast: "播客",
  reviewResourceShopping: "购物",
  reviewPriorityLow: "低",
  reviewPriorityMedium: "中",
  reviewPriorityHigh: "高",
  reviewPriorityUrgent: "紧急",
  reviewStatusTodo: "待办",
  reviewStatusInProgress: "进行中",
  reviewStatusDone: "完成",
  reviewStatusCancelled: "已取消",
  reviewCreating: "创建中…",
  quickTaskDelete: "删除",
  quickTaskDeleteConfirm: (name) => `确定要从快速任务中移除「${name}」吗？`,
  quickTaskAddNew: "添加快速任务",
  quickTaskAddDialogTitle: "添加快速任务",
  quickTaskNameLabel: "任务名称",
  quickTaskNamePlaceholder: "例如：遛狗",
  quickTaskBlocksLabel: "时间块数量",
  quickTaskToastAdded: (name) => `已将「${name}」添加到快速任务`,
  quickTaskToastDeleted: (name) => `已从快速任务中移除「${name}」`,
  quickTaskIconRegenerate: "重新生成图标",
  quickTaskIconGenerating: "正在生成图标…",
  quickTaskIconRegenerated: (name) => `已重新生成「${name}」的图标`,
  quickTaskIconRegenerateFailed: "无法重新生成此图标。",
  quickTaskAiIcons: "生成 AI 图标（Liquid Glass）",
  quickTaskAiIconsGenerating: "正在生成图标…",
  quickTaskAiIconsToastDone: (count) =>
    count === 0 ? "没有需要更新的图标。" : `已更新 ${count} 个快速任务图标。`,
  quickTaskAiIconsToastNone: "没有可生成图标的快速任务。",
  modeToggleAriaLabel: "规划模式",
  modeTimeBlock: "时间块规划",
  modeFree: "自由规划",
  freePlanningWindowLabel: "规划时段",
  freePlanningWindowSameDay: (start, end) => `${start} → ${end}`,
  freePlanningWindowCrossDay: (startDate, start, endDate, end) =>
    `${startDate} ${start} → ${endDate} ${end}`,
  freePlanningWindowHelper: "只是一段大致范围 — 自由规划模式不需要为每件事定时间。",
  freeQuickCaptureHeading: "今天想完成什么？",
  freeQuickCaptureBlurb: "先快速捕捉，之后再排序与整理。",
  freeQuickCapturePlaceholder: "快速添加任务…",
  freeQuickCaptureSubmit: "添加",
  freeQuickCaptureKeyboardHint: "Enter 添加 · ⌘/Ctrl + Enter 连续添加",
  freePriorityMust: "必做",
  freePriorityShould: "想做",
  freePriorityCould: "可选",
  freePriorityDone: "完成",
  freePriorityHint: (priority) => `拖到这里标记为「${priority}」`,
  freeBoardEmpty: (priority) => `${priority} 还没有任务。`,
  freeBoardSummary: (total, completed) => `已捕捉 ${total} 件 · 完成 ${completed} 件`,
  freeBoardMustSummary: (count) => `必做 ${count} 件`,
  freeStatCaptured: "已捕捉",
  freeRemoveTask: "移除任务",
  freeChangePriority: "调整优先级",
  freeMoveTaskToBucket: (priority) => `移到「${priority}」`,
  freeTaskDetailsTitle: "任务详情",
  freeTaskTitleLabel: "任务名称",
  freeTaskNotesLabel: "笔记",
  freeTaskNotesPlaceholder: "加入这个任务的背景、细节或提醒……",
  freeTaskPriorityLabel: "优先分类",
  freeTaskSaveChanges: "保存修改",
  freeTaskDelete: "删除",
  freeTaskCancel: "取消",
  freeTaskAddNotes: "加入笔记",
  freeTaskHideNotes: "收起笔记",
  freeTaskTitleRequired: "请输入任务名称",
  freeTaskOpenDetails: (title) => `开启「${title}」的任务详情`,
  freePlanSummaryTitle: "自由规划摘要",
  freePlanSummaryBlurb: "按优先级整理今天的自由规划，不生成虚构时段。",
  freeGoogleSyncTitle: (formattedDate) => `自由规划 — ${formattedDate}`,
  freeGoogleSyncedToast: "自由规划已同步到 Google 日历。",
  freeGoogleNoTasksToast: "还没有任务可同步 — 先加几项试试。",
};

const localizedDailyPlannerCopy = createLocaleCopyMap<DailyPlannerUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja: dailyPlannerJa,
  ko: dailyPlannerKo,
  fr: dailyPlannerFr,
  es: dailyPlannerEs,
  vi: dailyPlannerVi,
  it: dailyPlannerIt,
});

export function getDailyPlannerUiCopy(locale: AppLocale): DailyPlannerUiCopy {
  return localizedDailyPlannerCopy[locale] ?? localizedDailyPlannerCopy.en;
}

export type PlannerMockAiRec = {
  taskTitle: string;
  estimatedBlocks: number;
  reason: string;
  priority: "high" | "medium" | "low";
};

const mockAiEn: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "Morning meditation",
      estimatedBlocks: 2,
      reason: "Start your day with clarity",
      priority: "high",
    },
    {
      taskTitle: "Review weekly goals",
      estimatedBlocks: 3,
      reason: "Stay aligned with your objectives",
      priority: "medium",
    },
    {
      taskTitle: "Deep work session",
      estimatedBlocks: 6,
      reason: "Tackle your most important project",
      priority: "high",
    },
  ],
  planningTip:
    "Front-load demanding cognitive tasks in the morning when your energy is highest.",
};

const mockAiZhTW: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "晨間冥想",
      estimatedBlocks: 2,
      reason: "用清晰的心展開一天",
      priority: "high",
    },
    {
      taskTitle: "檢視本週目標",
      estimatedBlocks: 3,
      reason: "讓行動與目標保持一致",
      priority: "medium",
    },
    {
      taskTitle: "深度工作時段",
      estimatedBlocks: 6,
      reason: "處理當天最重要的一項專案",
      priority: "high",
    },
  ],
  planningTip: "把最費腦力的工作排在上午，趁專注力最高時完成。",
};

const mockAiZhCN: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "晨间冥想",
      estimatedBlocks: 2,
      reason: "用清晰的心展开一天",
      priority: "high",
    },
    {
      taskTitle: "检视本周目标",
      estimatedBlocks: 3,
      reason: "让行动与目标保持一致",
      priority: "medium",
    },
    {
      taskTitle: "深度工作时段",
      estimatedBlocks: 6,
      reason: "处理当天最重要的一项项目",
      priority: "high",
    },
  ],
  planningTip: "把最费脑力的工作排在上午，趁专注力最高时完成。",
};

const mockAiIt: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "Meditazione mattutina",
      estimatedBlocks: 2,
      reason: "Inizia la giornata con chiarezza",
      priority: "high",
    },
    {
      taskTitle: "Rivedi obiettivi settimanali",
      estimatedBlocks: 3,
      reason: "Resta allineato con le priorità",
      priority: "medium",
    },
    {
      taskTitle: "Sessione di deep work",
      estimatedBlocks: 6,
      reason: "Affronta il progetto più importante",
      priority: "high",
    },
  ],
  planningTip:
    "Metti le attività cognitive più pesanti al mattino, quando hai più energia.",
};

const mockAiJa: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "朝の瞑想",
      estimatedBlocks: 2,
      reason: "澄んだ心で一日を始める",
      priority: "high",
    },
    {
      taskTitle: "週間目標の確認",
      estimatedBlocks: 3,
      reason: "目標と行動を揃える",
      priority: "medium",
    },
    {
      taskTitle: "ディープワーク",
      estimatedBlocks: 6,
      reason: "今日いちばん重要なプロジェクトに取り組む",
      priority: "high",
    },
  ],
  planningTip: "負荷の高い作業は午前中、集中力が高いうちに片付けましょう。",
};

const mockAiKo: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "아침 명상",
      estimatedBlocks: 2,
      reason: "맑은 마음으로 하루를 시작하세요",
      priority: "high",
    },
    {
      taskTitle: "주간 목표 점검",
      estimatedBlocks: 3,
      reason: "목표와 행동을 맞추세요",
      priority: "medium",
    },
    {
      taskTitle: "딥워크 세션",
      estimatedBlocks: 6,
      reason: "가장 중요한 프로젝트에 집중하세요",
      priority: "high",
    },
  ],
  planningTip: "인지 부담이 큰 작업은 오전 에너지가 높을 때 처리하세요.",
};

const mockAiFr: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "Méditation du matin",
      estimatedBlocks: 2,
      reason: "Commencer la journée avec clarté",
      priority: "high",
    },
    {
      taskTitle: "Revue des objectifs hebdo",
      estimatedBlocks: 3,
      reason: "Rester aligné avec vos priorités",
      priority: "medium",
    },
    {
      taskTitle: "Session de travail profond",
      estimatedBlocks: 6,
      reason: "Avancer sur votre projet le plus important",
      priority: "high",
    },
  ],
  planningTip:
    "Placez les tâches cognitives exigeantes le matin, lorsque votre énergie est maximale.",
};

const mockAiEs: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "Meditación matutina",
      estimatedBlocks: 2,
      reason: "Empieza el día con claridad",
      priority: "high",
    },
    {
      taskTitle: "Revisar objetivos semanales",
      estimatedBlocks: 3,
      reason: "Mantén alineadas tus acciones con tus metas",
      priority: "medium",
    },
    {
      taskTitle: "Sesión de trabajo profundo",
      estimatedBlocks: 6,
      reason: "Avanza en tu proyecto más importante",
      priority: "high",
    },
  ],
  planningTip:
    "Anticipa las tareas cognitivas más exigentes por la mañana, cuando tienes más energía.",
};

const mockAiVi: { recommendations: PlannerMockAiRec[]; planningTip: string } = {
  recommendations: [
    {
      taskTitle: "Thiền buổi sáng",
      estimatedBlocks: 2,
      reason: "Bắt đầu ngày với đầu óc minh mẫn",
      priority: "high",
    },
    {
      taskTitle: "Xem lại mục tiêu tuần",
      estimatedBlocks: 3,
      reason: "Giữ hành động đồng bộ với ưu tiên",
      priority: "medium",
    },
    {
      taskTitle: "Phiên deep work",
      estimatedBlocks: 6,
      reason: "Tập trung vào dự án quan trọng nhất",
      priority: "high",
    },
  ],
  planningTip: "Ưu tiên việc tốn trí não vào buổi sáng khi năng lượng cao nhất.",
};

const localizedPlannerMockAi = createLocaleCopyMap<{
  recommendations: PlannerMockAiRec[];
  planningTip: string;
}>(mockAiEn, {
  "zh-TW": mockAiZhTW,
  "zh-CN": mockAiZhCN,
  ja: mockAiJa,
  ko: mockAiKo,
  fr: mockAiFr,
  es: mockAiEs,
  vi: mockAiVi,
  it: mockAiIt,
});

export function getPlannerMockAiSuggestions(
  locale: AppLocale,
): { recommendations: PlannerMockAiRec[]; planningTip: string } {
  return localizedPlannerMockAi[locale] ?? localizedPlannerMockAi.en;
}

export function formatBlockDurationLocalized(
  copy: DailyPlannerUiCopy,
  blocks: number,
  blockMinutes: number,
): string {
  const totalMin = blocks * blockMinutes;
  if (totalMin < 60) return copy.formatMinutes(totalMin);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return copy.formatHoursOnly(h, totalMin);
  return copy.formatHoursMinutes(h, m, totalMin);
}
