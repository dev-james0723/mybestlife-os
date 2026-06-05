import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LIFE_AGENT_PERMISSION_DOMAINS, type LifeAgentPermissionDomain } from "@/types/life-agent";

export async function requireLifeAgentUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  return { ok: true as const, supabase, userId: data.user.id };
}

export function parseSessionGrants(body: unknown): LifeAgentPermissionDomain[] {
  if (!body || typeof body !== "object") return [];
  const tp = (body as Record<string, unknown>).temporaryPermissions;
  if (!tp || typeof tp !== "object") return [];
  return LIFE_AGENT_PERMISSION_DOMAINS.filter((d) => (tp as Record<string, boolean>)[d] === true);
}
