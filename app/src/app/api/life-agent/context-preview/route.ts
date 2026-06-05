import { NextResponse } from "next/server";
import { buildLifeAgentContextPacket } from "@/lib/life-agent/context-builder";
import { resolveLifeAgentPermissions } from "@/lib/life-agent/permission-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import { LIFE_AGENT_PERMISSION_DOMAINS } from "@/types/life-agent";

export const runtime = "nodejs";

const MODES: LifeAgentMode[] = ["companion", "orchestrator", "operator", "mirror"];

/**
 * Debug endpoint: returns the context packet that would feed the Life Companion.
 * Authenticated owner only. Optional `LIFE_AGENT_DEBUG_CONTEXT=true` in production.
 */
export async function GET(request: Request) {
  const debugEnabled = process.env.LIFE_AGENT_DEBUG_CONTEXT === "true";
  if (process.env.NODE_ENV === "production" && !debugEnabled) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const message = url.searchParams.get("message") ?? "";
  const modeParam = url.searchParams.get("mode") ?? "companion";
  const mode = MODES.includes(modeParam as LifeAgentMode)
    ? (modeParam as LifeAgentMode)
    : "companion";

  const sessionGrants = url.searchParams
    .getAll("grant")
    .filter((g): g is LifeAgentPermissionDomain =>
      (LIFE_AGENT_PERMISSION_DOMAINS as readonly string[]).includes(g),
    );

  const { data: permissionRows, error: permError } = await supabase
    .from("life_agent_permissions")
    .select("*")
    .eq("user_id", userData.user.id);

  if (permError) {
    return NextResponse.json(
      { error: "permissions_failed", detail: permError.message },
      { status: 500 },
    );
  }

  const permissions = resolveLifeAgentPermissions(
    userData.user.id,
    permissionRows ?? [],
    sessionGrants,
  );

  try {
    const packet = await buildLifeAgentContextPacket({
      supabase,
      userId: userData.user.id,
      mode,
      userMessage: message,
      permissionRows: permissionRows ?? [],
      sessionGrants,
    });

    return NextResponse.json({
      packet,
      permissions: {
        byDomain: permissions.byDomain,
        sessionGrants: [...permissions.sessionGrants],
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "context_build_failed", detail }, { status: 500 });
  }
}
