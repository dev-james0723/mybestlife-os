"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import {
  suggestNextStep,
  type NextStepContext,
} from "@/lib/bio-lab/next-step-rules";
import type {
  NextStepSuggestion,
  ToolCompletionData,
  ToolType,
} from "@/lib/bio-lab/completion-types";
import {
  getBioLabCompletionCopy,
  type ResolvedNextStepCopy,
} from "@/lib/i18n/bio-lab-completion-ui";

export type ResolvedNextStepSuggestion = NextStepSuggestion & {
  /** Localized headline + body + CTA text for the recommended next step. */
  copy: ResolvedNextStepCopy;
  /** Localized display title for the suggested tool, when present. */
  nextToolTitle: string | null;
};

/**
 * Resolve a tool's completion into a fully-localized next-step recommendation.
 *
 * The hook re-evaluates whenever:
 *   - the completion payload changes (new content),
 *   - the user's app language changes (re-translate the copy).
 *
 * Pass `context` when the caller has cross-tool data — e.g. the State Scan
 * panel can pass the most recent Mind Sweep so the rule engine can recommend
 * a Focus Sprint when there are tasks waiting.
 */
export function useNextStepSuggestion(
  completion: ToolCompletionData | null,
  context: NextStepContext = {},
): ResolvedNextStepSuggestion | null {
  const language = useAppStore((s) => s.language);

  return useMemo(() => {
    if (!completion) return null;
    const suggestion = suggestNextStep(completion, context);
    const copyAll = getBioLabCompletionCopy(language);
    const copy = copyAll.nextStepIntents[suggestion.intentKey](suggestion.signal);
    const nextToolTitle = suggestion.nextTool
      ? copyAll.toolTitles[suggestion.nextTool as ToolType]
      : null;
    return { ...suggestion, copy, nextToolTitle };
    // `context` is shallow — callers should memoize stable refs if they
    // care about re-evaluation cost. Deps include language for re-translate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completion, language, context.recentMindSweep, context.recentStateScan]);
}
