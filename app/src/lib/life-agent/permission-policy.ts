import {
  LIFE_AGENT_ACCESS_LEVELS,
  LIFE_AGENT_PERMISSION_DOMAINS,
  type LifeAgentAccessLevel,
  type LifeAgentPermission,
  type LifeAgentPermissionDomain,
} from "@/types/life-agent";
import type { LifeAgentResolvedPermissions } from "@/lib/life-agent/context-types";

const DEFAULT_ACCESS: LifeAgentAccessLevel = "ask_every_time";

export function resolveLifeAgentPermissions(
  userId: string,
  rows: LifeAgentPermission[],
  sessionGrants: LifeAgentPermissionDomain[] = [],
): LifeAgentResolvedPermissions {
  const byDomain = {} as Record<LifeAgentPermissionDomain, LifeAgentAccessLevel>;

  for (const domain of LIFE_AGENT_PERMISSION_DOMAINS) {
    byDomain[domain] = DEFAULT_ACCESS;
  }

  for (const row of rows) {
    if (LIFE_AGENT_PERMISSION_DOMAINS.includes(row.domain)) {
      byDomain[row.domain] = row.access_level;
    }
  }

  return {
    userId,
    byDomain,
    sessionGrants: new Set(sessionGrants),
  };
}

function levelFor(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): LifeAgentAccessLevel {
  return permissions.byDomain[domain] ?? DEFAULT_ACCESS;
}

/** Domain content may be included in the context packet. */
export function canReadDomain(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): boolean {
  const level = levelFor(permissions, domain);
  if (level === "off") return false;
  if (level === "ask_every_time") {
    return permissions.sessionGrants.has(domain);
  }
  return (
    level === "read_only" ||
    level === "suggest_actions" ||
    level === "act_with_confirmation"
  );
}

/** Model may propose actions for this domain (preview only in later phases). */
export function canSuggestDomain(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): boolean {
  const level = levelFor(permissions, domain);
  if (level === "off" || level === "ask_every_time" || level === "read_only") {
    return false;
  }
  return level === "suggest_actions" || level === "act_with_confirmation";
}

/** User-confirmed writes may be prepared for this domain (later phases). */
export function canActInDomain(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): boolean {
  return levelFor(permissions, domain) === "act_with_confirmation";
}

export function omitReasonForDomain(
  permissions: LifeAgentResolvedPermissions,
  domain: LifeAgentPermissionDomain,
): "permission_off" | "ask_every_time" | null {
  const level = levelFor(permissions, domain);
  if (level === "off") return "permission_off";
  if (level === "ask_every_time" && !permissions.sessionGrants.has(domain)) {
    return "ask_every_time";
  }
  return null;
}

export function isValidAccessLevel(value: string): value is LifeAgentAccessLevel {
  return (LIFE_AGENT_ACCESS_LEVELS as readonly string[]).includes(value);
}
