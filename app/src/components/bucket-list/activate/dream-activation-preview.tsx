"use client";

import { AlertTriangle, Info } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketDreamActivationPlan,
  BucketStatus,
} from "@/types/bucket-list";

import { DreamActionPreviewCard } from "./dream-action-preview-card";
import { bucketStaggerContainer, bucketStaggerItem } from "../bucket-motion";

export type ActivationArrayKey = "tasks" | "calendar" | "notes" | "knowledge";
export type ActivationScalarKey = "project" | "savings" | "advanceStatus";

export type ActivationSelections = {
  project: boolean;
  savings: boolean;
  advanceStatus: boolean;
  tasks: boolean[];
  calendar: boolean[];
  notes: boolean[];
  knowledge: boolean[];
};

export function DreamActivationPreview({
  plan,
  selections,
  nextStatus,
  currentStatus,
  copy,
  creating,
  onToggleScalar,
  onToggleArray,
  onSelectAll,
  onCreate,
  onBack,
  onCancel,
}: {
  plan: BucketDreamActivationPlan;
  selections: ActivationSelections;
  nextStatus: BucketStatus | null;
  currentStatus: BucketStatus;
  copy: BucketListUiCopy;
  creating: boolean;
  onToggleScalar: (key: ActivationScalarKey) => void;
  onToggleArray: (key: ActivationArrayKey, index: number) => void;
  onSelectAll: (value: boolean) => void;
  onCreate: () => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const anySelected =
    (plan.suggestedProject ? selections.project : false) ||
    (plan.suggestedSavingsGoal ? selections.savings : false) ||
    selections.tasks.some(Boolean) ||
    selections.calendar.some(Boolean) ||
    selections.notes.some(Boolean) ||
    selections.knowledge.some(Boolean);

  return (
    <div className="space-y-4">
      <motion.p
        variants={bucketStaggerItem(reduceMotion, 8)}
        initial="hidden"
        animate="show"
        className="rounded-lg bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground"
      >
        {plan.activationSummary}
      </motion.p>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{copy.activateReviewNote}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => onSelectAll(true)}>
            {copy.activateSelectAll}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSelectAll(false)}>
            {copy.activateSelectNone}
          </Button>
        </div>
      </div>

      <motion.div
        variants={bucketStaggerContainer(reduceMotion)}
        initial="hidden"
        animate="show"
        className="max-h-[42vh] space-y-4 overflow-y-auto pr-1"
      >
        {plan.suggestedProject ? (
          <Group title={copy.groupProject}>
            <DreamActionPreviewCard
              title={plan.suggestedProject.name}
              subtitle={plan.suggestedProject.description}
              checked={selections.project}
              onToggle={() => onToggleScalar("project")}
            />
          </Group>
        ) : null}

        {plan.suggestedTasks.length > 0 ? (
          <Group title={copy.groupTasks}>
            {plan.suggestedTasks.map((t, i) => (
              <DreamActionPreviewCard
                key={`task-${i}`}
                title={t.title}
                subtitle={t.description}
                meta={[t.priority, t.dueDate].filter(Boolean).join(" · ") || null}
                checked={selections.tasks[i] ?? false}
                onToggle={() => onToggleArray("tasks", i)}
              />
            ))}
          </Group>
        ) : null}

        {plan.suggestedSavingsGoal ? (
          <Group title={copy.groupSavings}>
            <DreamActionPreviewCard
              title={plan.suggestedSavingsGoal.name}
              meta={`≈ ${plan.suggestedSavingsGoal.targetAmount} ${plan.suggestedSavingsGoal.currency}${
                plan.suggestedSavingsGoal.targetDate
                  ? ` · ${plan.suggestedSavingsGoal.targetDate}`
                  : ""
              }`}
              checked={selections.savings}
              onToggle={() => onToggleScalar("savings")}
            />
          </Group>
        ) : null}

        {plan.suggestedCalendarPlaceholders.length > 0 ? (
          <Group title={copy.groupCalendar}>
            {plan.suggestedCalendarPlaceholders.map((c, i) => (
              <DreamActionPreviewCard
                key={`cal-${i}`}
                title={c.title}
                subtitle={c.notes}
                meta={c.date ?? null}
                checked={selections.calendar[i] ?? false}
                onToggle={() => onToggleArray("calendar", i)}
              />
            ))}
          </Group>
        ) : null}

        {plan.suggestedNotes.length > 0 ? (
          <Group title={copy.groupNotes}>
            {plan.suggestedNotes.map((n, i) => (
              <DreamActionPreviewCard
                key={`note-${i}`}
                title={n.title}
                subtitle={n.content}
                checked={selections.notes[i] ?? false}
                onToggle={() => onToggleArray("notes", i)}
              />
            ))}
          </Group>
        ) : null}

        {plan.suggestedKnowledgeResources.length > 0 ? (
          <Group title={copy.groupKnowledge}>
            {plan.suggestedKnowledgeResources.map((k, i) => (
              <DreamActionPreviewCard
                key={`know-${i}`}
                title={k.title}
                subtitle={k.notes}
                meta={k.url ?? null}
                checked={selections.knowledge[i] ?? false}
                onToggle={() => onToggleArray("knowledge", i)}
              />
            ))}
          </Group>
        ) : null}
      </motion.div>

      {plan.warnings.length > 0 ? (
        <ul className="space-y-0.5">
          {plan.warnings.map((w) => (
            <li
              key={w}
              className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      <Separator />

      {nextStatus ? (
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <Checkbox
            checked={selections.advanceStatus}
            onCheckedChange={() => onToggleScalar("advanceStatus")}
          />
          {copy.activateAdvanceStatus(
            copy[`status${capitalize(currentStatus)}` as keyof BucketListUiCopy] as string,
            copy[`status${capitalize(nextStatus)}` as keyof BucketListUiCopy] as string,
          )}
        </label>
      ) : null}

      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Info className="h-3 w-3" />
        {copy.activateNoSilentNote}
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={creating}>
          {copy.cancel}
        </Button>
        <Button variant="outline" size="sm" onClick={onBack} disabled={creating}>
          {copy.activateBack}
        </Button>
        <Button
          size="sm"
          className="bg-lime-400 text-black hover:bg-lime-300"
          disabled={creating || !anySelected}
          onClick={onCreate}
        >
          {creating ? copy.activateCreating : copy.activateCreateSelected}
        </Button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion() ?? false;
  return (
    <motion.section variants={bucketStaggerItem(reduceMotion, 8)} className="space-y-1.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </motion.section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
