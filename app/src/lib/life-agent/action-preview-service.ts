import type { SupabaseClient } from "@supabase/supabase-js";
import { executeLifeAgentAction } from "@/lib/life-agent/action-executor";
import {
  canExecuteAction,
  canPreviewAction,
  domainForActionType,
  permissionDeniedReason,
} from "@/lib/life-agent/action-permissions";
import type {
  LifeAgentActionPreviewCard,
  LifeAgentActionPreviewPayloadEnvelope,
  LifeAgentActionType,
} from "@/lib/life-agent/action-types";
import {
  validateDirectPreviewBody,
  validateModelSuggestion,
  type ValidatedActionInput,
} from "@/lib/life-agent/action-validator";
import { resolveLifeAgentPermissions } from "@/lib/life-agent/permission-policy";
import type { LifeAgentPermission, LifeAgentPermissionDomain } from "@/types/life-agent";
import { isPreviewExpired } from "@/lib/life-agent/preview-policy";
import type { LifeAgentActionPreview as LifeAgentActionPreviewRow } from "@/types/life-agent";

type DbPreviewRow = LifeAgentActionPreviewRow;

function parseEnvelope(payload_json: Record<string, unknown>): LifeAgentActionPreviewPayloadEnvelope | null {
  if (
    typeof payload_json.title !== "string" ||
    typeof payload_json.description !== "string" ||
    typeof payload_json.domain !== "string" ||
    !payload_json.requiresConfirmation
  ) {
    return null;
  }
  const risk = payload_json.riskLevel;
  if (risk !== "low" && risk !== "medium" && risk !== "high") return null;
  return {
    title: payload_json.title,
    description: payload_json.description,
    riskLevel: risk,
    domain: payload_json.domain as LifeAgentPermissionDomain,
    requiresConfirmation: true,
    data: payload_json.data ?? payload_json,
  };
}

export function rowToActionPreviewCard(row: DbPreviewRow): LifeAgentActionPreviewCard | null {
  const payload = row.payload_json ?? {};
  const envelope = parseEnvelope(payload);
  if (!envelope) return null;
  const actionType = row.action_type as LifeAgentActionType;
  return {
    id: row.id,
    actionType,
    title: envelope.title,
    description: envelope.description,
    payload: envelope.data,
    domain: envelope.domain,
    riskLevel: envelope.riskLevel,
    requiresConfirmation: true,
    status: row.status,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    resultSummary:
      typeof payload.resultSummary === "string" ? payload.resultSummary : undefined,
    errorMessage: typeof payload.errorMessage === "string" ? payload.errorMessage : undefined,
  };
}

async function loadPermissions(
  supabase: SupabaseClient,
  userId: string,
  sessionGrants: LifeAgentPermissionDomain[] = [],
) {
  const { data, error } = await supabase
    .from("life_agent_permissions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return resolveLifeAgentPermissions(userId, (data ?? []) as LifeAgentPermission[], sessionGrants);
}

export async function createActionPreviewFromValidated(
  supabase: SupabaseClient,
  userId: string,
  validated: ValidatedActionInput,
  options: {
    conversationId?: string | null;
    sessionGrants?: LifeAgentPermissionDomain[];
  } = {},
): Promise<{ ok: true; preview: LifeAgentActionPreviewCard } | { ok: false; error: string }> {
  const permissions = await loadPermissions(supabase, userId, options.sessionGrants);
  const domain = domainForActionType(validated.actionType);
  if (!canPreviewAction(permissions, domain)) {
    return {
      ok: false,
      error: permissionDeniedReason(permissions, domain) ?? "Permission denied",
    };
  }

  const storedPayload = {
    ...validated.envelope,
    data: validated.envelope.data,
  };

  const { data, error } = await supabase
    .from("life_agent_action_previews")
    .insert({
      user_id: userId,
      conversation_id: options.conversationId ?? null,
      action_type: validated.actionType,
      payload_json: storedPayload,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  const card = rowToActionPreviewCard(data as DbPreviewRow);
  if (!card) return { ok: false, error: "Invalid preview row" };
  return { ok: true, preview: card };
}

export async function createActionPreviewFromBody(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<{ ok: true; preview: LifeAgentActionPreviewCard } | { ok: false; error: string }> {
  const b = body as Record<string, unknown>;
  const validated = validateDirectPreviewBody(
    b.actionType,
    b.title,
    b.description,
    b.payload,
  );
  if (!validated) {
    return { ok: false, error: "Invalid action payload" };
  }
  return createActionPreviewFromValidated(supabase, userId, validated, {
    conversationId: typeof b.conversationId === "string" ? b.conversationId : null,
    sessionGrants,
  });
}

export async function createPreviewsFromModelSuggestions(
  supabase: SupabaseClient,
  userId: string,
  suggestions: { type: string; title: string; description: string; payload?: Record<string, unknown> }[],
  conversationId: string | null,
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<{
  previews: LifeAgentActionPreviewCard[];
  invalidCount: number;
}> {
  const previews: LifeAgentActionPreviewCard[] = [];
  let invalidCount = 0;

  for (const suggestion of suggestions) {
    const validated = validateModelSuggestion(suggestion);
    if (!validated) {
      invalidCount += 1;
      continue;
    }
    const result = await createActionPreviewFromValidated(supabase, userId, validated, {
      conversationId,
      sessionGrants,
    });
    if (result.ok) {
      previews.push(result.preview);
    } else {
      invalidCount += 1;
    }
  }

  return { previews, invalidCount };
}

export async function confirmActionPreview(
  supabase: SupabaseClient,
  userId: string,
  previewId: string,
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<
  | { ok: true; preview: LifeAgentActionPreviewCard; result: { summary: string; resourceId?: string } }
  | { ok: false; error: string; status?: number }
> {
  const { data: row, error } = await supabase
    .from("life_agent_action_previews")
    .select("*")
    .eq("id", previewId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!row) return { ok: false, error: "Preview not found", status: 404 };

  const dbRow = row as DbPreviewRow;
  if (dbRow.status !== "pending") {
    return { ok: false, error: `Action is already ${dbRow.status}`, status: 409 };
  }

  if (isPreviewExpired(dbRow.created_at)) {
    await supabase
      .from("life_agent_action_previews")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", previewId)
      .eq("user_id", userId)
      .eq("status", "pending");
    return { ok: false, error: "Preview expired", status: 410 };
  }

  const envelope = parseEnvelope(dbRow.payload_json ?? {});
  if (!envelope) {
    return { ok: false, error: "Corrupt preview payload", status: 400 };
  }

  const actionType = dbRow.action_type as LifeAgentActionType;
  const permissions = await loadPermissions(supabase, userId, sessionGrants);

  if (!canExecuteAction(permissions, envelope.domain)) {
    return {
      ok: false,
      error: permissionDeniedReason(permissions, envelope.domain) ?? "Permission denied",
      status: 403,
    };
  }

  const { data: claimed, error: claimError } = await supabase
    .from("life_agent_action_previews")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", previewId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select()
    .single();

  if (claimError?.code === "PGRST116" || !claimed) {
    return { ok: false, error: "Preview was already handled", status: 409 };
  }
  if (claimError) return { ok: false, error: claimError.message, status: 500 };

  const execResult = await executeLifeAgentAction(supabase, userId, actionType, envelope);

  const nextPayload = {
    ...envelope,
    data: envelope.data,
    ...(execResult.ok
      ? { resultSummary: execResult.summary, resourceType: execResult.resourceType, resourceId: execResult.resourceId }
      : { errorMessage: execResult.message }),
  };

  const nextStatus = execResult.ok ? "executed" : "failed";
  const { data: updated, error: updateError } = await supabase
    .from("life_agent_action_previews")
    .update({
      status: nextStatus,
      payload_json: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", previewId)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .select()
    .single();

  if (updateError?.code === "PGRST116" || !updated) {
    return { ok: false, error: "Preview update failed after execution", status: 500 };
  }

  if (updateError) return { ok: false, error: updateError.message, status: 500 };

  const card = rowToActionPreviewCard(updated as DbPreviewRow);
  if (!card) return { ok: false, error: "Invalid preview row", status: 500 };

  if (!execResult.ok) {
    return { ok: false, error: execResult.message, status: 422 };
  }

  return {
    ok: true,
    preview: card,
    result: { summary: execResult.summary, resourceId: execResult.resourceId },
  };
}

export async function cancelActionPreview(
  supabase: SupabaseClient,
  userId: string,
  previewId: string,
): Promise<
  | { ok: true; preview: LifeAgentActionPreviewCard }
  | { ok: false; error: string; status?: number }
> {
  const { data: row, error } = await supabase
    .from("life_agent_action_previews")
    .select("*")
    .eq("id", previewId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!row) return { ok: false, error: "Preview not found", status: 404 };

  const dbRow = row as DbPreviewRow;
  if (dbRow.status !== "pending") {
    return { ok: false, error: `Action is already ${dbRow.status}`, status: 409 };
  }

  const { data: updated, error: updateError } = await supabase
    .from("life_agent_action_previews")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", previewId)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateError) return { ok: false, error: updateError.message, status: 500 };
  const card = rowToActionPreviewCard(updated as DbPreviewRow);
  if (!card) return { ok: false, error: "Invalid preview row", status: 500 };
  return { ok: true, preview: card };
}

export async function listPendingPreviewsForConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<LifeAgentActionPreviewCard[]> {
  const { data, error } = await supabase
    .from("life_agent_action_previews")
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as DbPreviewRow[])
    .map(rowToActionPreviewCard)
    .filter((c): c is LifeAgentActionPreviewCard => c !== null);
}
