"use client";

import { ArrowRight, Footprints } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketDreamActionType,
  BucketDreamNextStep,
} from "@/types/bucket-list";

/** One clear next step. Acting on it opens a confirm-first flow — never auto-runs. */
export function DreamNextStepPanel({
  nextStep,
  copy,
  onRunAction,
}: {
  nextStep: BucketDreamNextStep;
  copy: BucketListUiCopy;
  onRunAction: (actionType: BucketDreamActionType | null) => void;
}) {
  return (
    <section className="rounded-xl border border-lime-400/40 bg-lime-400/5 p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <Footprints className="h-4 w-4 text-lime-600" />
        {copy.nextStepHeading}
      </h3>
      <p className="text-sm font-medium">{nextStep.title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{nextStep.description}</p>
      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          className="bg-lime-400 text-black hover:bg-lime-300"
          onClick={() => onRunAction(nextStep.actionType ?? null)}
        >
          {copy.nextStepStart}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {copy.actionConfirmNote}
        </span>
      </div>
    </section>
  );
}
