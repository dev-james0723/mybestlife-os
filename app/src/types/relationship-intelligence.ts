/**
 * Relationship Intelligence Hub — UI-side enums, insert/update payloads, and
 * the wire shapes returned by the `/api/ai/relationships/*` routes.
 *
 * Mirrors the conventions in `types/relationship.ts`:
 *   - slug unions (lowercase) for any "enum" stored as free-form TEXT
 *   - strict Insert (omits server-managed columns) + Partial Update
 */

import type {
  RelationshipInteraction,
  RelationshipPromise,
  RelationshipImage,
  RelationshipMessageDraft,
} from "@/types/database";
import type {
  RelationshipCategory,
  RelationshipStrength,
} from "@/types/relationship";

// ---------------------------------------------------------------------------
// Slug unions
// ---------------------------------------------------------------------------

export const INTERACTION_TYPES = [
  "meeting",
  "email",
  "message",
  "call",
  "lesson",
  "event",
  "photo_memory",
  "other",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const PROMISE_STATUSES = [
  "open",
  "done",
  "overdue",
  "cancelled",
] as const;
export type PromiseStatus = (typeof PROMISE_STATUSES)[number];

export const RELATIONSHIP_IMAGE_TYPES = [
  "profile_photo",
  "shared_photo",
  "event_photo",
  "business_card",
  "screenshot",
  "memory_photo",
  "other",
] as const;
export type RelationshipImageType = (typeof RELATIONSHIP_IMAGE_TYPES)[number];

export const MESSAGE_DRAFT_PURPOSES = [
  "follow_up",
  "thank_you",
  "check_in",
  "request",
  "apology",
  "update",
  "invitation",
] as const;
export type MessageDraftPurpose = (typeof MESSAGE_DRAFT_PURPOSES)[number];

export const MESSAGE_DRAFT_TONES = [
  "warm",
  "professional",
  "concise",
  "friendly",
  "formal",
] as const;
export type MessageDraftTone = (typeof MESSAGE_DRAFT_TONES)[number];

// ---------------------------------------------------------------------------
// Insert / Update payloads
// ---------------------------------------------------------------------------

export type RelationshipInteractionInsert = Omit<
  RelationshipInteraction,
  "id" | "user_id" | "created_at" | "updated_at"
> & { user_id?: string };

export type RelationshipPromiseInsert = Omit<
  RelationshipPromise,
  "id" | "user_id" | "created_at" | "updated_at"
> & { user_id?: string };

export type RelationshipPromiseUpdate = Partial<
  Omit<RelationshipPromise, "id" | "user_id" | "created_at" | "updated_at">
>;

export type RelationshipImageInsert = Omit<
  RelationshipImage,
  "id" | "user_id" | "created_at" | "updated_at"
> & { user_id?: string };

export type RelationshipMessageDraftInsert = Omit<
  RelationshipMessageDraft,
  "id" | "user_id" | "created_at"
> & { user_id?: string };

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export type FieldConfidence = "high" | "medium" | "low" | "missing";

// ---------------------------------------------------------------------------
// POST /api/ai/relationships/autofill
// ---------------------------------------------------------------------------

export type RelationshipAutofillContextPayload = {
  projects?: { id: string; name: string; description?: string | null }[];
};

export type RelationshipAutofillResult = {
  person_name: string;
  category: RelationshipCategory;
  relationship_strength: RelationshipStrength;
  email?: string | null;
  phone?: string | null;
  last_contact_date?: string | null;
  last_interaction_notes?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  commitments_made?: string | null;
  preferences_and_details?: string | null;
  general_notes?: string | null;
  tags: string[];
  linked_project_id?: string | null;
  confidence: number;
  field_confidence: Record<string, FieldConfidence>;
  missing_fields: string[];
  suggested_next_actions: string[];
  warnings: string[];
};

export type RelationshipAutofillResponse = {
  result: RelationshipAutofillResult;
  meta: { model_used: string; generated_at: string };
};

// ---------------------------------------------------------------------------
// POST /api/ai/relationships/log-interaction
// ---------------------------------------------------------------------------

/** A single field the logger proposes to change, for the diff-review screen. */
export type InteractionFieldDiff = {
  field: string;
  label: string;
  /** Existing value (already on the relationship), if any. */
  previous?: string | null;
  /** Proposed value. */
  next: string;
  /** "append" merges into long-form fields; "replace" overwrites scalars. */
  mode: "append" | "replace";
};

export type InteractionExtraction = {
  interaction_date: string | null;
  interaction_type: InteractionType;
  summary: string;
  commitments: string[];
  preferences_and_details: string | null;
  next_action: string | null;
  next_action_date: string | null;
  tags: string[];
  suggested_strength: RelationshipStrength | null;
  /** Pre-computed diff vs. the current relationship for the review screen. */
  diffs: InteractionFieldDiff[];
  warnings: string[];
};

export type LogInteractionResponse = {
  result: InteractionExtraction;
  meta: { model_used: string; generated_at: string };
};

// ---------------------------------------------------------------------------
// POST /api/ai/relationships/analyze  (Relationship Intelligence Report)
// ---------------------------------------------------------------------------

export type RelationshipWeatherStatus =
  | "clear"
  | "needs_attention"
  | "open_loop"
  | "quiet_recently"
  | "sensitive"
  | "meeting_soon"
  | "promise_pending";

export type RelationshipIntelligenceReport = {
  relationshipId: string;
  whyThisPersonMatters: string;
  relationshipMemoryCapsule: {
    whoTheyAre: string;
    howYouKnowThem: string;
    whatToRemember: string[];
    openLoops: string[];
    lastMeaningfulMemory?: string | null;
  };
  nextBestTouchpoint: {
    recommendation: string;
    timing: string;
    channel?: string | null;
    reason: string;
    whatNotToSay?: string[];
  };
  careWithoutOverdoing: string;
  dontForget: string[];
  hiddenConnections: {
    title: string;
    sourceType: "project" | "task" | "goal" | "note" | "event" | "image" | "pattern";
    sourceId?: string | null;
    sourceTitle?: string | null;
    explanation: string;
    confidence: number;
  }[];
  boundaryAndSensitivityNotes: string[];
  suggestedNextActions: string[];
  generatedAt: string;
  modelUsed?: string;
};

// ---------------------------------------------------------------------------
// POST /api/ai/relationships/draft-message
// ---------------------------------------------------------------------------

export type DraftMessageResult = {
  subject?: string | null;
  body: string;
  suggestedChannel?: "email" | "whatsapp" | "sms" | "phone" | "in_person";
  caution?: string | null;
};

export type DraftMessageResponse = {
  result: DraftMessageResult;
  meta: { model_used: string; generated_at: string };
};
