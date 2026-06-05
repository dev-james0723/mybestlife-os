import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadWorkflowContext,
  parseWorkflowSessionGrants,
} from "@/lib/life-agent/workflow-context";
import { buildDailyBrief } from "@/lib/life-agent/workflows/daily-brief";
import { buildOpenLoopsAnalysis } from "@/lib/life-agent/workflows/open-loops";
import { buildPlanMyDay } from "@/lib/life-agent/workflows/plan-day";
import { buildWeeklyReview } from "@/lib/life-agent/workflows/weekly-review";
import { buildClearOpenLoopsPreviews } from "@/lib/life-agent/workflows/clear-open-loops";
import type { EnergyLevel, ClearOpenLoopsRequest } from "@/lib/life-agent/workflow-types";
import { parseAppLocale } from "@/lib/i18n/app-locale";

export async function runDailyBrief(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
  displayName: string | null,
) {
  const sessionGrants = parseWorkflowSessionGrants(body);
  const ctx = await loadWorkflowContext(supabase, userId, "daily-brief", { sessionGrants });
  return buildDailyBrief(supabase, userId, ctx, displayName, new Date(), sessionGrants);
}

export async function runOpenLoops(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
) {
  const sessionGrants = parseWorkflowSessionGrants(body);
  const b = body as Record<string, unknown>;
  const mode = b.mode === "clear" ? "clear" : "analyze";

  const ctx = await loadWorkflowContext(supabase, userId, "open-loops", { sessionGrants });

  if (mode === "clear") {
    const request = b as ClearOpenLoopsRequest;
    if (!Array.isArray(request.assignments)) {
      throw new Error("assignments_required");
    }
    return {
      kind: "clear" as const,
      data: await buildClearOpenLoopsPreviews(
        supabase,
        userId,
        ctx,
        request,
        new Date(),
        sessionGrants,
      ),
    };
  }

  return {
    kind: "analyze" as const,
    data: await buildOpenLoopsAnalysis(supabase, userId, ctx, new Date(), sessionGrants),
  };
}

export async function runPlanDay(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
) {
  const sessionGrants = parseWorkflowSessionGrants(body);
  const b = body as Record<string, unknown>;
  const energy = (b.energyLevel as EnergyLevel) ?? "normal";
  const valid: EnergyLevel[] = [
    "low",
    "normal",
    "high_focus",
    "scattered",
    "emotionally_tired",
  ];
  const energyLevel = valid.includes(energy) ? energy : "normal";

  const ctx = await loadWorkflowContext(supabase, userId, "plan-day", { sessionGrants });
  return buildPlanMyDay(supabase, userId, ctx, energyLevel, new Date(), sessionGrants);
}

export async function runWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
) {
  const sessionGrants = parseWorkflowSessionGrants(body);
  const ctx = await loadWorkflowContext(supabase, userId, "weekly-review", { sessionGrants });
  return buildWeeklyReview(supabase, userId, ctx, new Date(), sessionGrants);
}

export function parseDisplayNameFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const n = (body as Record<string, unknown>).displayName;
  return typeof n === "string" ? n : null;
}

export function parseLocaleFromBody(body: unknown) {
  if (!body || typeof body !== "object") return parseAppLocale("en");
  return parseAppLocale((body as Record<string, unknown>).locale);
}
