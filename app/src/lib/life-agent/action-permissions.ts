import type { LifeAgentResolvedPermissions } from "@/lib/life-agent/context-types";
import type { LifeAgentActionType } from "@/lib/life-agent/action-types";
import type { LifeAgentAccessLevel, LifeAgentPermissionDomain } from "@/types/life-agent";

const ACTION_DOMAIN_MAP: Record<LifeAgentActionType, LifeAgentPermissionDomain> = {
  create_task: "tasks",
  create_note: "notes",
  create_project: "projects",
  update_relationship_next_action: "relationships",
  save_journal_entry: "journal",
  create_life_agent_memory: "about_me",
  draft_message: "notes",
};

export function domainForActionType(actionType: LifeAgentActionType): LifeAgentPermissionDomain {
  return ACTION_DOMAIN_MAP[actionType];
}

function levelFor(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): LifeAgentAccessLevel {
  return permissions.byDomain[domain] ?? "ask_every_time";
}

/** User may see a write preview for this domain. */
export function canPreviewAction(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): boolean {
  const level = levelFor(permissions, domain);
  if (level === "off" || level === "read_only") return false;
  if (level === "ask_every_time") {
    return permissions.sessionGrants.has(domain);
  }
  return level === "suggest_actions" || level === "act_with_confirmation";
}

/**
 * User may execute after explicit confirm.
 * Requires write-capable access (suggest_actions or act_with_confirmation).
 */
export function canExecuteAction(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): boolean {
  return canPreviewAction(permissions, domain);
}

export function permissionDeniedReason(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): string | null {
  const level = levelFor(permissions, domain);
  if (level === "off") return "This area is turned off in your Life Companion permissions.";
  if (level === "read_only") return "This area is read-only — the companion cannot make changes.";
  if (level === "ask_every_time" && !permissions.sessionGrants.has(domain)) {
    return "This area requires permission before actions can be previewed.";
  }
  if (!canPreviewAction(permissions, domain)) {
    return "You do not have permission to act in this area.";
  }
  return null;
}
