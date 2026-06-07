import type { PlannerStimulationEvent, StimulationDecision } from "@/types/database";
import { stripLeadingLocaleFromPathname } from "@/lib/i18n/locale-path";

export const DEFAULT_HIGH_STIMULATION_ROUTES = [
  "/youtube-radar",
  "/ai-assistant",
  "/business-analyst",
  "/ideas",
  "/idea-capture",
  "/vault",
  "/software-vault",
] as const;

const HIGH_STIMULATION_ROUTE_ALIASES: Record<string, readonly string[]> = {
  "/idea-capture": ["/ideas"],
  "/software-vault": ["/vault"],
};

export type StimulationLoadBreakdown = {
  highStimulationRouteEvents: number;
  continuedIntentionallyEvents: number;
  focusExitAttempts: number;
  manualInterruptions: number;
  returnedToFocusEvents: number;
};

export type StimulationLoadResult = StimulationLoadBreakdown & {
  score: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRoutePath(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) return "/";
  try {
    const url = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed, "https://mylifeos.local");
    return stripLeadingLocaleFromPathname(url.pathname).replace(/\/+$/, "") || "/";
  } catch {
    const path = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
    const withSlash = path.startsWith("/") ? path : `/${path}`;
    return stripLeadingLocaleFromPathname(withSlash).replace(/\/+$/, "") || "/";
  }
}

export function isHighStimulationRoute(
  route: string | null | undefined,
  highStimulationRoutes: readonly string[] = DEFAULT_HIGH_STIMULATION_ROUTES,
): boolean {
  if (!route) return false;
  const target = normalizeRoutePath(route);
  return highStimulationRoutes
    .flatMap((configured) => {
      const normalized = normalizeRoutePath(configured);
      return [normalized, ...(HIGH_STIMULATION_ROUTE_ALIASES[normalized] ?? [])];
    })
    .some((blocked) => target === blocked || target.startsWith(`${blocked}/`));
}

export function isReturnToFocusDecision(
  decision: StimulationDecision | null | undefined,
): boolean {
  return decision === "returned_to_focus" || decision === "captured_and_returned";
}

export function computeStimulationLoadScore(
  events: readonly PlannerStimulationEvent[],
): StimulationLoadResult {
  const breakdown: StimulationLoadBreakdown = {
    highStimulationRouteEvents: 0,
    continuedIntentionallyEvents: 0,
    focusExitAttempts: 0,
    manualInterruptions: 0,
    returnedToFocusEvents: 0,
  };

  for (const event of events) {
    if (
      event.event_type === "high_stimulation_route" ||
      (event.event_type === "route_gate" && event.route)
    ) {
      breakdown.highStimulationRouteEvents += 1;
    }
    if (event.decision === "continued_intentionally") {
      breakdown.continuedIntentionallyEvents += 1;
    }
    if (event.event_type === "focus_exit_attempt") {
      breakdown.focusExitAttempts += 1;
    }
    if (event.event_type === "manual_interrupt") {
      breakdown.manualInterruptions += 1;
    }
    if (isReturnToFocusDecision(event.decision)) {
      breakdown.returnedToFocusEvents += 1;
    }
  }

  const raw =
    breakdown.highStimulationRouteEvents * 12 +
    breakdown.continuedIntentionallyEvents * 6 +
    breakdown.focusExitAttempts * 8 +
    breakdown.manualInterruptions * 4 -
    breakdown.returnedToFocusEvents * 3;

  return {
    ...breakdown,
    score: clamp(raw, 0, 100),
  };
}
