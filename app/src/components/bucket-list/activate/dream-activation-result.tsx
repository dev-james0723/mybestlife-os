"use client";

import { CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { ActivationChecklistContext } from "@/lib/bucket-list/activation";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

import { DreamActivationChecklist } from "./dream-activation-checklist";
import { bucketStaggerContainer, bucketStaggerItem } from "../bucket-motion";

export type ActivationCreatedCounts = {
  project: number;
  tasks: number;
  savings: number;
  calendar: number;
  notes: number;
  knowledge: number;
};

export function DreamActivationResult({
  item,
  created,
  checklistCtx,
  copy,
  onViewDream,
  onDone,
}: {
  item: BucketItem;
  created: ActivationCreatedCounts;
  checklistCtx: ActivationChecklistContext;
  copy: BucketListUiCopy;
  onViewDream: () => void;
  onDone: () => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const rows: { label: string; n: number }[] = [
    { label: copy.groupProject, n: created.project },
    { label: copy.groupTasks, n: created.tasks },
    { label: copy.groupSavings, n: created.savings },
    { label: copy.groupCalendar, n: created.calendar },
    { label: copy.groupNotes, n: created.notes },
    { label: copy.groupKnowledge, n: created.knowledge },
  ].filter((r) => r.n > 0);

  const total = rows.reduce((acc, r) => acc + r.n, 0);

  return (
    <motion.div
      variants={bucketStaggerContainer(reduceMotion)}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <motion.div variants={bucketStaggerItem(reduceMotion, 8)} className="flex flex-col items-center gap-2 py-2 text-center">
        <motion.span
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.35 }}
        >
          <CheckCircle2 className="h-8 w-8 text-lime-500" />
        </motion.span>
        <p className="text-base font-medium">{copy.activateResultTitle}</p>
        <p className="text-sm text-muted-foreground">
          {copy.activateResultSummary(total)}
        </p>
      </motion.div>

      {rows.length > 0 ? (
        <motion.div
          variants={bucketStaggerContainer(reduceMotion)}
          className="flex flex-wrap justify-center gap-2"
        >
          {rows.map((r) => (
            <motion.span
              key={r.label}
              variants={bucketStaggerItem(reduceMotion, 6)}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[12px]"
            >
              {r.label}: {r.n}
            </motion.span>
          ))}
        </motion.div>
      ) : null}

      <DreamActivationChecklist item={item} ctx={checklistCtx} copy={copy} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onViewDream}>
          {copy.activateResultView}
        </Button>
        <Button
          size="sm"
          className="bg-lime-400 text-black hover:bg-lime-300"
          onClick={onDone}
        >
          {copy.aiNextDone}
        </Button>
      </div>
    </motion.div>
  );
}
