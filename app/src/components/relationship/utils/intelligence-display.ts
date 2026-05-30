/**
 * Pure label/style resolvers for the intelligence layer (weather, context
 * health factors, attention reasons, image types). Side-effect-free + i18n-
 * driven, mirroring `relationship-display.ts`.
 */

import type { RelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import type { RelationshipWeatherStatus } from "@/types/relationship-intelligence";
import type { AttentionReasonKey } from "@/lib/relationships/intelligence";

export function getWeatherLabel(
  status: RelationshipWeatherStatus,
  copy: RelationshipUiCopy,
): string {
  switch (status) {
    case "clear":
      return copy.weatherClear;
    case "needs_attention":
      return copy.weatherNeedsAttention;
    case "open_loop":
      return copy.weatherOpenLoop;
    case "quiet_recently":
      return copy.weatherQuietRecently;
    case "sensitive":
      return copy.weatherSensitive;
    case "meeting_soon":
      return copy.weatherMeetingSoon;
    case "promise_pending":
      return copy.weatherPromisePending;
  }
}

/** Token-based chip classes (no raw hex) keyed to the weather mood. */
export function getWeatherChipClassName(
  status: RelationshipWeatherStatus,
): string {
  switch (status) {
    case "clear":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "needs_attention":
    case "promise_pending":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "open_loop":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "quiet_recently":
      return "bg-muted text-muted-foreground border-border";
    case "sensitive":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
    case "meeting_soon":
      return "bg-primary/15 text-primary border-primary/30";
  }
}

export function getHealthFactorLabel(
  key: string,
  copy: RelationshipUiCopy,
): string {
  switch (key) {
    case "contact_info":
      return copy.healthContactInfo;
    case "last_contact":
      return copy.healthLastContact;
    case "next_action":
      return copy.healthNextAction;
    case "next_action_date":
      return copy.healthNextActionDate;
    case "preferences":
      return copy.healthPreferences;
    case "commitments":
      return copy.healthCommitments;
    case "linked_project":
      return copy.healthLinkedProject;
    case "tags":
      return copy.healthTags;
    case "profile_photo":
      return copy.healthProfilePhoto;
    case "memory_image":
      return copy.healthMemoryImage;
    case "recent_interaction":
      return copy.healthRecentInteraction;
    default:
      return key;
  }
}

export function getAttentionReasonLabel(
  key: AttentionReasonKey,
  copy: RelationshipUiCopy,
): string {
  switch (key) {
    case "overdue_promise":
      return copy.reasonOverduePromise;
    case "next_action_due":
      return copy.reasonNextActionDue;
    case "open_promise":
      return copy.reasonOpenPromise;
    case "favorite_quiet":
      return copy.reasonFavoriteQuiet;
  }
}

export function getImageTypeLabel(
  type: string,
  copy: RelationshipUiCopy,
): string {
  switch (type) {
    case "profile_photo":
      return copy.imageTypeProfile;
    case "shared_photo":
      return copy.imageTypeShared;
    case "event_photo":
      return copy.imageTypeEvent;
    case "business_card":
      return copy.imageTypeBusinessCard;
    case "screenshot":
      return copy.imageTypeScreenshot;
    case "memory_photo":
      return copy.imageTypeMemory;
    default:
      return copy.imageTypeOther;
  }
}

/** Context-health score → token chip class (status of *memory*, not person). */
export function getHealthScoreClassName(score: number): string {
  if (score >= 70) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
  }
  if (score >= 40) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  }
  return "bg-muted text-muted-foreground border-border";
}
