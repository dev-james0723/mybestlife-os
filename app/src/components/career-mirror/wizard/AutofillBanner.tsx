"use client";

import * as React from "react";
import { Sparkles, Check, X, Loader2, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { AutofillResult } from "@/hooks/use-career-mirror";

export type AutofillSuggestion = {
  field: string;
  value: unknown;
  confidence: number;
};

export type AutofillBannerProps = {
  ui: CareerMirrorUiCopy;
  /** Triggers the autofill request. Returns a typed (never-throwing) result. */
  onRun: () => Promise<AutofillResult>;
  /** Called when the user accepts a single suggestion (merge into answers). */
  onAccept: (suggestion: AutofillSuggestion) => void;
  className?: string;
};

type Phase = "idle" | "loading" | "ready" | "empty" | "error";

function toDisplay(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Entry point to "Pre-fill from your Vault docs". Runs the autofill endpoint and
 * lists per-field suggestions with Accept / Reject. Accept hands the suggestion
 * up to the parent to merge into local answers; Reject simply drops it from the
 * list. All copy is localized; loading / empty / error states are handled
 * without throwing.
 */
export function AutofillBanner({
  ui,
  onRun,
  onAccept,
  className,
}: AutofillBannerProps) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [suggestions, setSuggestions] = React.useState<AutofillSuggestion[]>([]);
  const [handled, setHandled] = React.useState<Record<string, "accepted" | "rejected">>({});

  const run = React.useCallback(async () => {
    setPhase("loading");
    setHandled({});
    const result = await onRun();
    if (!result.ok) {
      setPhase("error");
      return;
    }
    const next: AutofillSuggestion[] = Object.entries(result.suggestions).map(
      ([field, { value }]) => ({
        field,
        value,
        confidence: result.confidence[field] ?? 0,
      }),
    );
    setSuggestions(next);
    setPhase(next.length > 0 ? "ready" : "empty");
  }, [onRun]);

  const accept = (s: AutofillSuggestion) => {
    onAccept(s);
    setHandled((h) => ({ ...h, [s.field]: "accepted" }));
  };
  const reject = (field: string) => {
    setHandled((h) => ({ ...h, [field]: "rejected" }));
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.035] p-3.5 shadow-none",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-pink)]/12 text-[var(--accent-pink)]">
          <Sparkles className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {ui.aiSuggestion.badge}
          </p>
          <p className="text-xs text-muted-foreground">{ui.aiSuggestion.helper}</p>
        </div>
        {(phase === "idle" || phase === "empty" || phase === "error") && (
          <Button
            variant="outline"
            size="sm"
            onClick={run}
            className="border-foreground/12 bg-foreground/[0.035] hover:bg-foreground/[0.07]"
          >
            <Sparkles />
            {ui.aiSuggestion.accept}
          </Button>
        )}
        {phase === "ready" && (
          <Button variant="ghost" size="sm" onClick={run}>
            <RefreshCw />
          </Button>
        )}
      </div>

      {phase === "loading" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {ui.states.loading}
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{ui.states.error}</span>
          <Button variant="ghost" size="sm" onClick={run}>
            {ui.states.retry}
          </Button>
        </div>
      )}

      {phase === "empty" && (
        <p className="text-xs text-muted-foreground">
          {ui.states.emptyDescription}
        </p>
      )}

      {phase === "ready" && (
        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => {
            const state = handled[s.field];
            return (
              <li
                key={s.field}
                className="flex items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {s.field}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {toDisplay(s.value)}
                  </p>
                </div>
                {state === "accepted" ? (
                  <span className="text-xs font-medium text-[var(--accent-pink)]">
                    {ui.aiSuggestion.accepted}
                  </span>
                ) : state === "rejected" ? (
                  <span className="text-xs text-muted-foreground">
                    {ui.aiSuggestion.rejected}
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={ui.aiSuggestion.accept}
                      onClick={() => accept(s)}
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={ui.aiSuggestion.reject}
                      onClick={() => reject(s.field)}
                    >
                      <X />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default AutofillBanner;
