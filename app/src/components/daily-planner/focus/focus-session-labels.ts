"use client";

import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { FocusSessionType, PlannerFocusSessionCompletionState } from "@/types/database";

export function focusSessionTypeLabel(
  copy: DailyPlannerUiCopy,
  type: FocusSessionType,
): string {
  switch (type) {
    case "deep_work":
      return copy.focusSessionDeepWork;
    case "admin":
      return copy.focusSessionAdmin;
    case "learning":
      return copy.focusSessionLearning;
    case "creative":
      return copy.focusSessionCreative;
    case "meeting":
      return copy.focusSessionMeeting;
    case "recovery":
      return copy.focusSessionRecovery;
    case "personal":
      return copy.focusSessionPersonal;
  }
}

export function completionStateLabel(
  copy: DailyPlannerUiCopy,
  state: PlannerFocusSessionCompletionState,
): string {
  switch (state) {
    case "completed":
      return copy.completionCompleted;
    case "partial":
      return copy.completionPartial;
    case "not_completed":
      return copy.completionNotCompleted;
  }
}
