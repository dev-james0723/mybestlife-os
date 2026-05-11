"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { getBioLabToolDefinition } from "@/lib/bio-lab/tools-metadata";
import { getBioLabVisualTokens } from "@/lib/bio-lab/visual-tokens";
import { cn } from "@/lib/utils";
import type { HubSuggestion } from "@/lib/bio-lab/hub-suggestion-rules";
import type { BioLabHistoryCopy } from "@/lib/i18n/bio-lab-history-ui";
import type { UiTheme } from "@/types/database";

/**
 * Inline chip rendered inside {@link RecentActivityStrip} when the rule
 * engine has a strong "what next?" signal.
 *
 * Behavior:
 *   - Tapping the chip body opens the suggested tool (caller-supplied callback).
 *   - Tapping the X dismisses the chip for the rest of the browser session,
 *     keyed by `suggestion.dismissKey`. We don't persist further than that —
 *     the suggestion is *contextual* to the most recent session, so once a
 *     newer session lands, a different `dismissKey` will form anyway.
 *
 * Why sessionStorage and not localStorage:
 *   - Dismissing a contextual chip is a "for now" intent, not a permanent
 *     setting. localStorage would feel sticky and surprising next time.
 */
export type SuggestedNextChipProps = {
  suggestion: HubSuggestion;
  copy: BioLabHistoryCopy;
  uiTheme: UiTheme;
  /** Localised display name of the suggested tool — used in the aria-label so
   *  screen-reader users hear *which* tool will open, not just the reason. */
  toolTitle: string;
  /** Called when the user taps the chip body / Open CTA. */
  onAccept: () => void;
  className?: string;
};

const DISMISS_STORAGE_KEY = "bio-lab/hub-suggestion-dismissed";

export function SuggestedNextChip({
  suggestion,
  copy,
  uiTheme,
  toolTitle,
  onAccept,
  className,
}: SuggestedNextChipProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [dismissed, setDismissed] = useState<boolean>(() =>
    isDismissed(suggestion.dismissKey),
  );

  // If `suggestion.dismissKey` changes (because a newer session landed),
  // re-derive whether *that* one is dismissed. Without this, a freshly-fetched
  // suggestion would inherit the previous one's dismissed flag in state.
  useEffect(() => {
    setDismissed(isDismissed(suggestion.dismissKey));
  }, [suggestion.dismissKey]);

  const handleDismiss = useCallback(() => {
    rememberDismissed(suggestion.dismissKey);
    setDismissed(true);
  }, [suggestion.dismissKey]);

  if (dismissed) return null;

  const def = getBioLabToolDefinition(suggestion.toolId);
  if (!def) return null;
  const Icon = def.icon;
  const tokens = getBioLabVisualTokens(suggestion.toolId, uiTheme);
  const sCopy = copy.suggestion;
  const reason = sCopy.reasons[suggestion.reasonKey];
  const ariaLabel = `${sCopy.ariaPrefix} (${toolTitle}): ${reason}`;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "flex items-stretch gap-1 rounded-xl border bg-card/95 shadow-sm",
        "border-border/70",
        className,
      )}
    >
      <button
        type="button"
        onClick={onAccept}
        aria-label={ariaLabel}
        className={cn(
          "group flex min-w-0 flex-1 items-center gap-2.5 rounded-l-xl px-2.5 py-2",
          "outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40",
          "focus-visible:ring-2 focus-visible:ring-ring/60",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            tokens.iconChip,
          )}
          aria-hidden
        >
          <Icon className={cn("size-3.5 stroke-[1.7]", tokens.iconForeground)} />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {sCopy.eyebrow}
          </span>
          <span className="block truncate text-xs leading-snug text-foreground sm:text-[0.8125rem]">
            {reason}
          </span>
        </span>
        <span
          className={cn(
            "ml-auto inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1",
            "text-[0.6875rem] font-medium text-muted-foreground",
            "transition-colors group-hover:text-foreground",
          )}
        >
          <span className="hidden sm:inline">{sCopy.openCta}</span>
          <ArrowRight className="size-3" aria-hidden />
        </span>
      </button>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label={sCopy.dismissAriaLabel}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-r-xl px-2",
          "text-muted-foreground/70 outline-none transition-colors",
          "hover:bg-muted/40 hover:text-muted-foreground focus-visible:bg-muted/40",
          "focus-visible:ring-2 focus-visible:ring-ring/60",
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </motion.div>
  );
}

// ============================================================
// Internal: sessionStorage helpers (defensive about SSR + quota errors)
// ============================================================

function isDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return false;
    return parsed.includes(key);
  } catch {
    return false;
  }
}

function rememberDismissed(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(DISMISS_STORAGE_KEY);
    const list: string[] = (() => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    })();
    if (list.includes(key)) return;
    list.push(key);
    // Bound the list so a long session doesn't slowly bloat sessionStorage.
    const trimmed = list.slice(-50);
    window.sessionStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota or privacy mode — ignore; chip will still hide for this render
    // because the in-memory state was already updated.
  }
}
