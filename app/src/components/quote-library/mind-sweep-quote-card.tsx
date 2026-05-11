"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import {
  useAddQuoteFromMindSweep,
  useContextualQuote,
  type ContextualQuoteResult,
} from "@/hooks/use-quote-library-sdk";

interface MindSweepQuoteCardProps {
  /**
   * Context text — e.g. the triage insight + a few key sweep items. The
   * higher quality the context, the better the match.
   */
  context: string;
  /** Themes / tags to tuck onto the saved quote when "Save to Library" fires. */
  themes?: string[];
  /** MindSweep session id so we can annotate the saved quote's note. */
  sessionId?: string;
  className?: string;
}

export function MindSweepQuoteCard({
  context,
  themes,
  sessionId,
  className,
}: MindSweepQuoteCardProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const contextual = useContextualQuote();
  const save = useAddQuoteFromMindSweep();

  const [result, setResult] = useState<ContextualQuoteResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!context.trim()) return;
    try {
      const data = await contextual.mutateAsync({ context, language });
      setResult(data);
      setSavedId(null);
    } catch {
      /* inline error below */
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const saved = await save.mutateAsync({
        text: result.quote_text,
        source_author: result.source_author ?? null,
        source_context: result.source_context ?? null,
        personal_note: result.reason,
        mindSweepContext: { sessionId, themes },
      });
      setSavedId(saved.quote.id);
      toast.success(copy.mindClearAddedToast);
    } catch {
      toast.error(copy.mindClearAddFailed);
    }
  };

  const lowConfidence = result !== null && result.confidence < 0.3;

  return (
    <section
      className={cn(
        "rounded-xl border border-amber-300/50 bg-amber-50/40 p-4 dark:border-amber-400/30 dark:bg-amber-400/5",
        className,
      )}
      aria-label={copy.mindClearExternalQuote}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
            <Sparkles className="size-3" aria-hidden />
            {copy.mindClearExternalQuote}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.mindClearExternalQuoteHelper}
          </p>
        </div>
        {!result && !contextual.isPending ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleGenerate()}
            disabled={!context.trim()}
          >
            <Sparkles className="mr-1.5 size-3.5" aria-hidden />
            {copy.mindClearGenerate}
          </Button>
        ) : null}
      </div>

      {contextual.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {copy.mindClearGenerating}
        </div>
      ) : result ? (
        lowConfidence ? (
          <div className="space-y-2">
            <p className="text-sm italic text-muted-foreground">
              {copy.mindClearNothingFound}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => void handleGenerate()}
            >
              {copy.mindClearGenerate}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <blockquote className="font-serif text-base leading-relaxed text-foreground/90 [text-wrap:pretty]">
              <span
                aria-hidden
                className="select-none text-muted-foreground/60"
              >
                &ldquo;
              </span>
              {result.quote_text}
              <span
                aria-hidden
                className="select-none text-muted-foreground/60"
              >
                &rdquo;
              </span>
            </blockquote>
            {result.source_author ? (
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                {result.source_author}
                {result.source_context
                  ? ` — ${result.source_context}`
                  : ""}
              </p>
            ) : null}
            {result.reason ? (
              <p className="text-sm leading-relaxed text-foreground/75 [text-wrap:pretty]">
                {result.reason}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => void handleSave()}
                disabled={save.isPending || savedId !== null}
              >
                {save.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Plus className="mr-1.5 size-3.5" aria-hidden />
                )}
                {savedId ? copy.mindClearAddedToast : copy.mindClearAddToLibrary}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void handleGenerate()}
                disabled={contextual.isPending}
              >
                {copy.mindClearGenerate}
              </Button>
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
