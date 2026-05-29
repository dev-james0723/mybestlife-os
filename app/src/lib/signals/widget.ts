/**
 * Signals — dashboard widget data contract.
 *
 * The "Today's Signals" widget shows EXACTLY the Daily Top 3 — never a longer
 * mini-feed. The cap is enforced here (the data layer), not in the component,
 * so the guardrail can't be accidentally widened in the UI (§9).
 */

import type { SignalItem } from "./types";

export const MAX_WIDGET_SIGNALS = 3;

export function capWidgetSignals(items: SignalItem[]): SignalItem[] {
  return items.slice(0, MAX_WIDGET_SIGNALS);
}
