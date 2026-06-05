import type { SupabaseClient } from "@supabase/supabase-js";
import { assembleLifeAgentContextPacket } from "@/lib/life-agent/context-summarizers";
import type { LifeAgentContextPacket } from "@/lib/life-agent/context-types";
import {
  domainsToFetch,
  fetchLifeAgentContextSources,
} from "@/lib/life-agent/context-fetchers";
import { routeLifeAgentIntent } from "@/lib/life-agent/intent-router";
import { resolveLifeAgentPermissions } from "@/lib/life-agent/permission-policy";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type {
  LifeAgentPermission,
  LifeAgentPermissionDomain,
} from "@/types/life-agent";

export type BuildLifeAgentContextPacketParams = {
  supabase: SupabaseClient;
  userId: string;
  mode: LifeAgentMode;
  userMessage: string;
  permissionRows: LifeAgentPermission[];
  sessionGrants?: LifeAgentPermissionDomain[];
  referenceDate?: Date;
};

/**
 * Builds a permission-aware, intent-scoped context packet for the Life Companion.
 */
export async function buildLifeAgentContextPacket(
  params: BuildLifeAgentContextPacketParams,
): Promise<LifeAgentContextPacket> {
  const permissions = resolveLifeAgentPermissions(
    params.userId,
    params.permissionRows,
    params.sessionGrants,
  );
  const intent = routeLifeAgentIntent({
    userMessage: params.userMessage,
    mode: params.mode,
  });

  const sources = await fetchLifeAgentContextSources({
    supabase: params.supabase,
    userId: params.userId,
    permissions,
    intent,
    mode: params.mode,
  });

  return assembleLifeAgentContextPacket({
    userId: params.userId,
    mode: params.mode,
    userMessage: params.userMessage,
    permissions,
    sources,
    referenceDate: params.referenceDate,
  });
}

export { domainsToFetch };
