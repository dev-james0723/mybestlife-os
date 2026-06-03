"use client";

/**
 * QuickInteractionLogger
 *
 * Spec §5 — the fast "one messy note → structured update" flow. The user
 * picks a person (or one is pre-selected), pastes a note, and AI extracts a
 * diff. The user reviews the diff and applies it; nothing is written silently.
 *
 * On apply we:
 *   1. store the raw interaction (relationship_interactions),
 *   2. patch the relationship via the existing optimistic update mutation,
 *   3. optionally create promises for each extracted commitment (opt-in).
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { PenLine, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { OSControl, OSDialogSurface, OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import { useUpdateRelationship } from "@/hooks/use-relationships";
import {
  useCreateRelationshipInteraction,
  useCreateRelationshipPromise,
} from "@/hooks/use-relationship-intelligence";
import {
  relationshipDialogBodyClassName,
  relationshipDialogFooterClassName,
  relationshipDialogHeaderClassName,
  relationshipSelectTriggerClassName,
  relationshipTextAreaClassName,
} from "@/components/relationship/relationship-os";
import { requestLogInteraction } from "@/lib/relationships/insight-api";
import type {
  InteractionExtraction,
  InteractionFieldDiff,
} from "@/types/relationship-intelligence";
import type { RelationshipUpdate } from "@/types/relationship";
import type { Relationship, Json } from "@/types/database";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationships: readonly Relationship[];
  /** Pre-selected person (e.g. opened from a card or the detail modal). */
  preselectedId?: string | null;
};

export function QuickInteractionLogger({
  open,
  onOpenChange,
  relationships,
  preselectedId,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();

  const updateRel = useUpdateRelationship();
  const createInteraction = useCreateRelationshipInteraction();
  const createPromise = useCreateRelationshipPromise();

  const [selectedId, setSelectedId] = useState<string | null>(
    preselectedId ?? null,
  );
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "review">("input");
  const [extraction, setExtraction] = useState<InteractionExtraction | null>(
    null,
  );
  const [acceptedDiffs, setAcceptedDiffs] = useState<Set<string>>(new Set());
  const [createPromises, setCreatePromises] = useState(true);

  const selected = useMemo(
    () => relationships.find((r) => r.id === (selectedId ?? preselectedId)) ?? null,
    [relationships, selectedId, preselectedId],
  );

  function reset() {
    setNote("");
    setPhase("input");
    setExtraction(null);
    setAcceptedDiffs(new Set());
    setCreatePromises(true);
    setSelectedId(preselectedId ?? null);
  }

  function close() {
    onOpenChange(false);
    setTimeout(reset, 200);
  }

  async function runExtraction() {
    if (!selected) return;
    setPhase("loading");
    try {
      const { result } = await requestLogInteraction({
        relationshipId: selected.id,
        note,
        locale: language,
        current: {
          person_name: selected.person_name,
          next_action: selected.next_action,
          preferences_and_details: selected.preferences_and_details,
          commitments_made: selected.commitments_made,
          tags: selected.tags,
        },
      });
      setExtraction(result);
      // Default: accept every proposed diff (user can untick).
      setAcceptedDiffs(new Set(result.diffs.map((d) => d.field)));
      setPhase("review");
    } catch {
      toast.error(copy.loggerError);
      setPhase("input");
    }
  }

  function toggleDiff(field: string) {
    setAcceptedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  function buildUpdate(): RelationshipUpdate {
    if (!extraction || !selected) return {};
    const patch: RelationshipUpdate = {};
    for (const diff of extraction.diffs) {
      if (!acceptedDiffs.has(diff.field)) continue;
      applyDiff(patch, selected, diff);
    }
    if (extraction.suggested_strength && acceptedDiffs.has("suggested_strength")) {
      patch.relationship_strength = extraction.suggested_strength;
    }
    return patch;
  }

  async function handleApply() {
    if (!selected || !extraction) return;
    const patch = buildUpdate();

    // 1. Store the raw interaction (best-effort; failure shouldn't block).
    let interactionId: string | undefined;
    try {
      const created = await createInteraction.mutateAsync({
        relationship_id: selected.id,
        interaction_date: extraction.interaction_date ?? new Date().toISOString().slice(0, 10),
        interaction_type: extraction.interaction_type,
        raw_note: note,
        summary: extraction.summary,
        extracted_json: JSON.parse(JSON.stringify(extraction)) as Json,
      });
      interactionId = created.id;
    } catch {
      /* non-fatal */
    }

    // 2. Patch the relationship.
    if (Object.keys(patch).length > 0) {
      updateRel.mutate({ id: selected.id, data: patch });
    }

    // 3. Opt-in: create promises for each commitment.
    if (createPromises && extraction.commitments.length > 0) {
      for (const text of extraction.commitments) {
        createPromise.mutate({
          relationship_id: selected.id,
          promise_text: text,
          due_date: null,
          status: "open",
          source_interaction_id: interactionId ?? null,
        });
      }
    }

    toast.success(copy.loggerSaved);
    close();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <OSDialogSurface
        size="2xl"
        className="flex max-h-[88dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className={relationshipDialogHeaderClassName}>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" />
            {copy.loggerTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className={relationshipDialogBodyClassName}>
            <AnimatePresence mode="wait" initial={false}>
              {phase === "input" && (
                <motion.div
                  key="input"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  className="space-y-4"
                >
                  {!preselectedId && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">
                        {copy.loggerSelectPerson}
                      </p>
                      <Select
                        value={selectedId ?? ""}
                        onValueChange={(v) => setSelectedId(v)}
                      >
                        <SelectTrigger className={relationshipSelectTriggerClassName}>
                          <SelectValue placeholder={copy.loggerSelectPerson} />
                        </SelectTrigger>
                        <SelectContent>
                          {relationships.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.person_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Textarea
                    className={relationshipTextAreaClassName}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={copy.loggerNotePlaceholder}
                    rows={6}
                    autoFocus
                  />

                  <div className={relationshipDialogFooterClassName}>
                    <OSControl variant="ghost" onClick={close}>
                      {copy.cancel}
                    </OSControl>
                    <OSPrimaryAction
                      onClick={runExtraction}
                      disabled={!selected || note.trim().length === 0}
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      {copy.loggerExtract}
                    </OSPrimaryAction>
                  </div>
                </motion.div>
              )}

              {phase === "loading" && (
                <motion.div
                  key="loading"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {copy.loggerExtracting}
                </motion.div>
              )}

              {phase === "review" && extraction && (
                <motion.div
                  key="review"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  className="space-y-4"
                >
                  <p className="text-sm font-medium">{copy.loggerWillUpdate}</p>

                  {extraction.diffs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {copy.loggerNoChanges}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {extraction.diffs.map((diff) => (
                        <DiffRow
                          key={diff.field}
                          diff={diff}
                          accepted={acceptedDiffs.has(diff.field)}
                          onToggle={() => toggleDiff(diff.field)}
                        />
                      ))}
                    </div>
                  )}

                  {extraction.commitments.length > 0 && (
                    <label className="flex items-start gap-2 rounded-xl border border-slate-200/75 bg-white/72 px-3 py-2.5 text-sm dark:border-white/8 dark:bg-white/[0.035]">
                      <Checkbox
                        checked={createPromises}
                        onCheckedChange={(c) => setCreatePromises(Boolean(c))}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">
                          {copy.loggerAlsoCreatePromises}
                        </span>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground">
                          {extraction.commitments.map((c, i) => (
                            <li key={i}>· {c}</li>
                          ))}
                        </ul>
                      </span>
                    </label>
                  )}

                  {extraction.warnings.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {extraction.warnings.map((w, i) => (
                        <li key={i}>· {w}</li>
                      ))}
                    </ul>
                  )}

                  <div className={relationshipDialogFooterClassName}>
                    <OSControl variant="ghost" onClick={() => setPhase("input")}>
                      {copy.wizardBack}
                    </OSControl>
                    <OSPrimaryAction onClick={handleApply}>{copy.loggerApply}</OSPrimaryAction>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </OSDialogSurface>
    </Dialog>
  );
}

function DiffRow({
  diff,
  accepted,
  onToggle,
}: {
  diff: InteractionFieldDiff;
  accepted: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm transition-[background,border-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px motion-reduce:transition-none ${
        accepted
          ? "border-lime-300/45 bg-lime-300/10"
          : "border-slate-200/75 bg-white/72 dark:border-white/8 dark:bg-white/[0.035]"
      }`}
    >
      <Checkbox
        checked={accepted}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {diff.label}
        </span>
        {diff.previous && (
          <span className="block text-xs text-muted-foreground line-through">
            {diff.previous}
          </span>
        )}
        <span className="block text-foreground text-pretty">
          {diff.mode === "append" && diff.previous ? "+ " : "→ "}
          {diff.next}
        </span>
      </span>
    </label>
  );
}

/** Mutates `patch` in place to apply one accepted diff against the live row. */
function applyDiff(
  patch: RelationshipUpdate,
  current: Relationship,
  diff: InteractionFieldDiff,
) {
  switch (diff.field) {
    case "last_contact_date":
      patch.last_contact_date = diff.next;
      break;
    case "last_interaction_notes":
      patch.last_interaction_notes = diff.next;
      break;
    case "next_action":
      patch.next_action = diff.next;
      break;
    case "next_action_date":
      patch.next_action_date = diff.next;
      break;
    case "preferences_and_details":
      patch.preferences_and_details = mergeAppend(
        current.preferences_and_details,
        diff.next,
      );
      break;
    case "commitments_made":
      patch.commitments_made = mergeAppend(current.commitments_made, diff.next);
      break;
    case "tags":
      patch.tags = diff.next
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      break;
  }
}

function mergeAppend(existing: string | null, addition: string): string {
  const base = (existing ?? "").trim();
  if (!base) return addition.trim();
  if (base.includes(addition.trim())) return base;
  return `${base}\n${addition.trim()}`;
}
