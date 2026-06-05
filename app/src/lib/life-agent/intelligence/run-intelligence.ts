import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadIntelligenceContext,
  parseIntelligenceSessionGrants,
} from "@/lib/life-agent/intelligence-context";
import { buildFutureSelfConversation } from "@/lib/life-agent/intelligence/future-self";
import { buildInnerConflicts } from "@/lib/life-agent/intelligence/inner-conflicts";
import { buildLifeChapterMap } from "@/lib/life-agent/intelligence/life-chapters";
import { buildLifeCoherence } from "@/lib/life-agent/intelligence/life-coherence";
import { buildMemoryTimeline } from "@/lib/life-agent/intelligence/memory-timeline";

export { parseIntelligenceSessionGrants };

export async function runLifeCoherence(supabase: SupabaseClient, userId: string, body: unknown) {
  const sessionGrants = parseIntelligenceSessionGrants(body);
  const ctx = await loadIntelligenceContext(supabase, userId, "life-coherence", { sessionGrants });
  return buildLifeCoherence(ctx);
}

export async function runLifeChapters(supabase: SupabaseClient, userId: string, body: unknown) {
  const sessionGrants = parseIntelligenceSessionGrants(body);
  const ctx = await loadIntelligenceContext(supabase, userId, "life-chapters", { sessionGrants });
  return buildLifeChapterMap(ctx);
}

export async function runInnerConflicts(supabase: SupabaseClient, userId: string, body: unknown) {
  const sessionGrants = parseIntelligenceSessionGrants(body);
  const ctx = await loadIntelligenceContext(supabase, userId, "inner-conflicts", { sessionGrants });
  return buildInnerConflicts(ctx);
}

export async function runMemoryTimeline(supabase: SupabaseClient, userId: string, body: unknown) {
  const sessionGrants = parseIntelligenceSessionGrants(body);
  const ctx = await loadIntelligenceContext(supabase, userId, "memory-timeline", { sessionGrants });
  return buildMemoryTimeline(ctx);
}

export async function runFutureSelf(supabase: SupabaseClient, userId: string, body: unknown) {
  const sessionGrants = parseIntelligenceSessionGrants(body);
  const ctx = await loadIntelligenceContext(supabase, userId, "future-self", { sessionGrants });
  const year =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).futureYear === "number"
      ? (body as Record<string, number>).futureYear
      : 2027;
  return buildFutureSelfConversation(ctx, year);
}
