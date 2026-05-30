"use client";

/**
 * Thin client wrappers for the `/api/ai/relationships/*` routes. Each throws
 * on a non-OK response so callers can surface a toast / error state.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type {
  RelationshipAutofillResponse,
  LogInteractionResponse,
  RelationshipIntelligenceReport,
  DraftMessageResponse,
  MessageDraftPurpose,
  MessageDraftTone,
} from "@/types/relationship-intelligence";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string; detail?: string };
      detail = j.error ?? j.detail ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `request_failed_${res.status}`);
  }
  return (await res.json()) as T;
}

export function requestRelationshipAutofill(input: {
  text?: string;
  personName?: string;
  locale: AppLocale;
  projects?: { id: string; name: string; description?: string | null }[];
}): Promise<RelationshipAutofillResponse> {
  return postJson("/api/ai/relationships/autofill", {
    text: input.text,
    personName: input.personName,
    language: input.locale,
    context: { projects: input.projects ?? [] },
  });
}

export function requestLogInteraction(input: {
  relationshipId: string;
  note: string;
  locale: AppLocale;
  current?: {
    person_name?: string;
    next_action?: string | null;
    preferences_and_details?: string | null;
    commitments_made?: string | null;
    tags?: string[];
  };
}): Promise<LogInteractionResponse> {
  return postJson("/api/ai/relationships/log-interaction", {
    relationshipId: input.relationshipId,
    note: input.note,
    language: input.locale,
    current: input.current,
  });
}

export async function requestRelationshipAnalysis(input: {
  relationshipId: string;
  locale: AppLocale;
  context: Record<string, unknown>;
}): Promise<RelationshipIntelligenceReport> {
  const res = await postJson<{ report: RelationshipIntelligenceReport }>(
    "/api/ai/relationships/analyze",
    {
      relationshipId: input.relationshipId,
      language: input.locale,
      context: JSON.stringify(input.context),
    },
  );
  return res.report;
}

export function requestDraftMessage(input: {
  relationshipId: string;
  purpose: MessageDraftPurpose;
  tone: MessageDraftTone;
  language: AppLocale;
  context?: string;
}): Promise<DraftMessageResponse> {
  return postJson("/api/ai/relationships/draft-message", {
    relationshipId: input.relationshipId,
    purpose: input.purpose,
    tone: input.tone,
    language: input.language,
    context: input.context,
  });
}
