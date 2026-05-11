"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import {
  MIND_SWEEP_KINDS,
  parseMindSweepKind,
  type MindSweepKind,
} from "@/lib/bio-lab/flow-types";
import { BIO_LAB_MIND_SWEEP_DRAFT_MAX } from "@/lib/bio-lab/bio-lab-field-limits";
import { getBioLabFlowsCopy } from "@/lib/i18n/bio-lab-flows-ui";
import { getBioLabAIAssistCopy } from "@/lib/i18n/bio-lab-ai-assist-ui";
import { useAppStore } from "@/stores/app-store";
import { useBioLabStore } from "@/stores/bio-lab-store";
import { useCreateBioLabMindSweep } from "@/hooks/use-bio-lab-history";
import { fetchMindLabel, fetchMindTriage } from "@/lib/ai/bio-lab/clients/mind-sweep";
import type {
  MindLabelResult,
  MindTriageResult,
} from "@/lib/ai/bio-lab/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToolCompletionCard } from "@/components/bio-lab/shared/tool-completion-card";
import { MindSweepReleaseRitual } from "@/components/bio-lab/mind-sweep-release-ritual";
import { MindSweepQuoteCard } from "@/components/quote-library/mind-sweep-quote-card";
import type {
  MindSweepResult,
  MindSweepItem,
  ToolType,
} from "@/lib/bio-lab/completion-types";
import { cn } from "@/lib/utils";

const LABEL_DEBOUNCE_MS = 600;
const TRIAGE_DEBOUNCE_MS = 1200;
const TRIAGE_MIN_ITEMS = 3;
/** Per-entry storage of the AI's confidence so the completion summary can
 *  truthfully report `aiLabelConfidence`. Keyed by entry id. */
type LabelConfidenceMap = Record<string, "high" | "low" | null>;

export function MindSweepPanel() {
  const language = useAppStore((s) => s.language);
  const flows = getBioLabFlowsCopy(language);
  const copy = flows.mind;
  const aiCopy = getBioLabAIAssistCopy(language);
  const reduceMotion = useReducedMotion() ?? false;

  const { entries, add, updateKind, remove, clearEntries, openTool } = useBioLabStore(
    useShallow((s) => ({
      entries: s.mindSweepEntries,
      add: s.addMindSweepEntry,
      updateKind: s.updateMindSweepKind,
      remove: s.removeMindSweepEntry,
      clearEntries: s.clearMindSweepEntries,
      openTool: s.openTool,
    })),
  );
  const saveSweepMutation = useCreateBioLabMindSweep();

  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<MindSweepKind>("task");
  const [userPickedKind, setUserPickedKind] = useState(false);

  const [labelSuggestion, setLabelSuggestion] = useState<MindLabelResult | null>(null);
  const [labelPending, setLabelPending] = useState(false);

  const [triage, setTriage] = useState<MindTriageResult | null>(null);
  const [triagePending, setTriagePending] = useState(false);

  /** Captured per-entry AI confidence at the moment the entry was added. */
  const [labelConfidenceMap, setLabelConfidenceMap] = useState<LabelConfidenceMap>({});

  const [completion, setCompletion] = useState<MindSweepResult | null>(null);

  /** Snapshot of the result captured the moment the user pressed Done.
   *  The release ritual plays first; the actual save + completion card are
   *  deferred until the ritual resolves so the ceremony feels uninterrupted. */
  const [pendingResult, setPendingResult] = useState<{
    result: MindSweepResult;
    entryCount: number;
    entryTexts: string[];
  } | null>(null);

  // ----- AI: per-keystroke label suggestion (debounced) -----
  const labelAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const text = draft.trim();
    if (text.length < 4) {
      setLabelSuggestion(null);
      return;
    }
    const ctrl = new AbortController();
    labelAbortRef.current?.abort();
    labelAbortRef.current = ctrl;
    setLabelPending(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const payload = await fetchMindLabel({
            text,
            language,
            signal: ctrl.signal,
          });
          if (!ctrl.signal.aborted) {
            setLabelSuggestion(payload.content);
            // Auto-apply suggestions when the user hasn't manually picked a kind yet.
            if (!userPickedKind) {
              setKind(payload.content.kind);
            }
          }
        } catch {
          // Silent — the manual chips still work.
        } finally {
          if (!ctrl.signal.aborted) setLabelPending(false);
        }
      })();
    }, LABEL_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
      setLabelPending(false);
    };
    // We intentionally exclude `userPickedKind` from deps so flipping it
    // doesn't re-fire the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, language]);

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    add(text, kind);
    // Capture this entry's AI label confidence (if any) so the completion
    // card can later show whether the labels were AI-applied.
    const confidence = labelSuggestion?.kind === kind ? labelSuggestion.confidence : null;
    // The store generates the id; we look it up after insert via list[0]
    // is fragile, so we mark by text+createdAt next render via an effect.
    // Simpler: stash a "pending text → confidence" map keyed by text and
    // flush it once the entry appears.
    setPendingConfidence((prev) => ({ ...prev, [textKey(text, kind)]: confidence }));
    setDraft("");
    setLabelSuggestion(null);
    setUserPickedKind(false);
    setKind("task");
  }, [add, draft, kind, labelSuggestion]);

  // ----- Reconcile pending confidence into labelConfidenceMap once entry shows up -----
  const [pendingConfidence, setPendingConfidence] = useState<Record<string, "high" | "low" | null>>({});
  useEffect(() => {
    if (Object.keys(pendingConfidence).length === 0) return;
    setLabelConfidenceMap((prev) => {
      const next = { ...prev };
      let mutated = false;
      for (const e of entries) {
        const key = textKey(e.text, e.kind);
        if (key in pendingConfidence && next[e.id] === undefined) {
          next[e.id] = pendingConfidence[key];
          mutated = true;
        }
      }
      return mutated ? next : prev;
    });
    setPendingConfidence((prev) => {
      const next = { ...prev };
      for (const e of entries) {
        delete next[textKey(e.text, e.kind)];
      }
      return next;
    });
    // Run on entries change.
  }, [entries, pendingConfidence]);

  // ----- AI: triage when batch >= 3 (debounced) -----
  const triageAbortRef = useRef<AbortController | null>(null);
  const triageInputKeyRef = useRef<string>("");
  useEffect(() => {
    if (entries.length < TRIAGE_MIN_ITEMS) {
      setTriage(null);
      return;
    }
    const items = entries.slice(0, 30).map((e) => ({ text: e.text, kind: e.kind }));
    const inputKey = JSON.stringify(items);
    if (inputKey === triageInputKeyRef.current && triage) return;

    const ctrl = new AbortController();
    triageAbortRef.current?.abort();
    triageAbortRef.current = ctrl;
    setTriagePending(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const payload = await fetchMindTriage({
            items,
            language,
            signal: ctrl.signal,
          });
          if (!ctrl.signal.aborted) {
            setTriage(payload.content);
            triageInputKeyRef.current = inputKey;
          }
        } catch {
          // Silent — triage is a nice-to-have.
        } finally {
          if (!ctrl.signal.aborted) setTriagePending(false);
        }
      })();
    }, TRIAGE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
      setTriagePending(false);
    };
  }, [entries, language, triage]);

  const onDraftKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      if (!draft.trim()) return;
      submit();
    },
    [draft, submit],
  );

  /** Persist + reveal the completion card. Invoked once the release ritual
   *  finishes (or immediately if the user opts to skip it). */
  const finalizeSave = useCallback(
    (result: MindSweepResult) => {
      saveSweepMutation.mutate(
        {
          items: result.items.map((it) => ({
            text: it.text,
            kind: it.kind,
            ai_label_confidence: it.aiLabelConfidence,
          })),
          triageInsight: result.triageInsight,
          aiAssisted:
            result.triageInsight !== null ||
            result.items.some((it) => it.aiLabelConfidence !== null),
        },
        {
          onError: () => {
            toast.error(aiCopy.shared.saveFailed);
          },
        },
      );

      setCompletion(result);
      clearEntries();
      setLabelConfidenceMap({});
      triageInputKeyRef.current = "";
      setTriage(null);
    },
    [aiCopy.shared.saveFailed, clearEntries, saveSweepMutation],
  );

  const handleDone = () => {
    if (entries.length === 0) return;
    const items: MindSweepItem[] = entries.map((e) => ({
      text: e.text,
      kind: e.kind,
      aiLabelConfidence: labelConfidenceMap[e.id] ?? null,
    }));
    const triageInsight = triage?.insight ?? null;
    const result: MindSweepResult = { items, triageInsight };
    // Hand off to the release ritual; saving happens on its onComplete.
    setPendingResult({
      result,
      entryCount: items.length,
      entryTexts: items.map((it) => it.text),
    });
  };

  const handleRitualComplete = useCallback(() => {
    if (!pendingResult) return;
    const { result } = pendingResult;
    setPendingResult(null);
    finalizeSave(result);
  }, [finalizeSave, pendingResult]);

  const reset = () => {
    setCompletion(null);
    setDraft("");
    setKind("task");
    setUserPickedKind(false);
    setLabelSuggestion(null);
  };

  const handleOpenNext = (next: ToolType) => {
    reset();
    openTool(next);
  };


  if (pendingResult) {
    return (
      <MindSweepReleaseRitual
        entryCount={pendingResult.entryCount}
        entryTexts={pendingResult.entryTexts}
        onComplete={handleRitualComplete}
      />
    );
  }

  if (completion) {
    return (
      <ToolCompletionCard
        completion={{ tool: "mind-sweep", data: completion }}
        onOpenNext={handleOpenNext}
        onDismiss={reset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      <p className="text-sm text-muted-foreground">{copy.lead}</p>

      <div className="space-y-2">
        <Label htmlFor="mind-sweep-input" className="sr-only">
          {copy.placeholder}
        </Label>
        <Textarea
          id="mind-sweep-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, BIO_LAB_MIND_SWEEP_DRAFT_MAX))}
          onKeyDown={onDraftKeyDown}
          placeholder={copy.placeholder}
          rows={3}
          maxLength={BIO_LAB_MIND_SWEEP_DRAFT_MAX}
          className="min-h-[88px] resize-none text-base sm:text-sm"
        />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.65rem] leading-snug text-muted-foreground">
            {copy.draftKeyboardHint}
          </p>
          <p className="text-right text-[0.65rem] text-muted-foreground tabular-nums sm:shrink-0">
            {draft.length}/{BIO_LAB_MIND_SWEEP_DRAFT_MAX}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{copy.kindLabel}</p>
          {labelPending ? (
            <span className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {aiCopy.shared.thinking}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={copy.kindLabel}>
          {MIND_SWEEP_KINDS.map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={kind === k ? "default" : "outline"}
              className="min-h-9 rounded-full px-3"
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setUserPickedKind(true);
              }}
            >
              {copy.kinds[k]}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        className="min-h-11 w-full"
        onClick={submit}
        disabled={!draft.trim()}
      >
        {copy.add}
      </Button>

      <div className="space-y-2 border-t border-border/60 pt-4">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <>
            <ul className="max-h-[min(50dvh,22rem)] space-y-2 overflow-y-auto overscroll-contain pr-1">
              <AnimatePresence initial={false}>
                {entries.map((e) => (
                  <motion.li
                    key={e.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: 24, transition: { duration: 0.18 } }
                    }
                    transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
                    className="rounded-xl border border-border/70 bg-muted/15 px-3 py-2.5"
                  >
                    <p
                      className="line-clamp-6 text-sm break-words whitespace-pre-wrap text-foreground"
                      title={e.text.length > 180 ? e.text : undefined}
                    >
                      {e.text}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`kind-${e.id}`}>
                        {copy.changeKind}
                      </label>
                      <select
                        id={`kind-${e.id}`}
                        className={cn(
                          "h-9 min-w-[8.5rem] rounded-lg border border-input bg-background px-2 text-sm",
                          "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        )}
                        value={e.kind}
                        onChange={(ev) => {
                          const next = parseMindSweepKind(ev.target.value);
                          if (next) updateKind(e.id, next);
                        }}
                      >
                        {MIND_SWEEP_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {copy.kinds[k]}
                          </option>
                        ))}
                      </select>
                      {labelConfidenceMap[e.id] ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] text-primary"
                          aria-label={aiCopy.shared.aiBadge}
                        >
                          <Sparkles className="size-2.5" aria-hidden />
                          {aiCopy.shared.aiBadge}
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto min-h-9 text-destructive hover:text-destructive"
                        onClick={() => remove(e.id)}
                      >
                        {copy.remove}
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <AnimatePresence initial={false}>
              {triage || triagePending ? (
                <motion.div
                  key="triage"
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-primary/25 bg-primary/[0.04] px-3 py-2.5"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="mr-1 inline-block size-3 text-primary" aria-hidden />
                    {aiCopy.mindSweep.triageTitle}
                  </p>
                  {triagePending && !triage ? (
                    <p className="mt-1.5 text-xs italic text-muted-foreground">
                      {aiCopy.mindSweep.triageThinking}
                    </p>
                  ) : triage ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                      {triage.insight}
                    </p>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {entries.length >= TRIAGE_MIN_ITEMS ? (
              <MindSweepQuoteCard
                context={buildMindSweepContext({
                  entries,
                  triageInsight: triage?.insight ?? null,
                })}
                themes={uniqueKinds(entries)}
              />
            ) : null}

            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full"
              onClick={handleDone}
              disabled={saveSweepMutation.isPending}
            >
              {flows.sheetClose}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function textKey(text: string, kind: MindSweepKind): string {
  return `${kind}|${text}`;
}

function uniqueKinds(entries: { kind: MindSweepKind }[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) set.add(entry.kind);
  return Array.from(set);
}

function buildMindSweepContext(input: {
  entries: { text: string; kind: MindSweepKind }[];
  triageInsight: string | null;
}): string {
  const lines: string[] = [];
  if (input.triageInsight) {
    lines.push(`Current insight: ${input.triageInsight}`);
  }
  const top = input.entries.slice(0, 8);
  if (top.length > 0) {
    lines.push("");
    lines.push("Things on my mind right now:");
    for (const entry of top) {
      lines.push(`- [${entry.kind}] ${entry.text}`);
    }
  }
  return lines.join("\n");
}
