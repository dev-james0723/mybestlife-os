"use client";

import { Footprints, Leaf, Loader2, Rocket, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import {
  BUCKET_ACTIVATION_MODES,
  type BucketActivationMode,
} from "@/types/bucket-list";
import {
  bucketHoverLift,
  bucketStaggerContainer,
  bucketStaggerItem,
} from "../bucket-motion";

const MODE_ICON: Record<BucketActivationMode, LucideIcon> = {
  gentle: Leaf,
  practical: Wrench,
  ambitious: Rocket,
  minimal: Footprints,
};

function modeLabel(m: BucketActivationMode, copy: BucketListUiCopy): string {
  return {
    gentle: copy.modeGentle,
    practical: copy.modePractical,
    ambitious: copy.modeAmbitious,
    minimal: copy.modeMinimal,
  }[m];
}

function modeDesc(m: BucketActivationMode, copy: BucketListUiCopy): string {
  return {
    gentle: copy.modeGentleDesc,
    practical: copy.modePracticalDesc,
    ambitious: copy.modeAmbitiousDesc,
    minimal: copy.modeMinimalDesc,
  }[m];
}

export function DreamActivationModeStep({
  mode,
  onSelect,
  onGenerate,
  generating,
  copy,
}: {
  mode: BucketActivationMode;
  onSelect: (mode: BucketActivationMode) => void;
  onGenerate: () => void;
  generating: boolean;
  copy: BucketListUiCopy;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.activateModeHeading}</p>
      <motion.div
        variants={bucketStaggerContainer(reduceMotion)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {BUCKET_ACTIVATION_MODES.map((m) => {
          const Icon = MODE_ICON[m];
          const active = m === mode;
          return (
            <motion.button
              key={m}
              variants={bucketStaggerItem(reduceMotion, 8)}
              whileHover={bucketHoverLift(reduceMotion)}
              type="button"
              onClick={() => onSelect(m)}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                active
                  ? "border-lime-400/60 bg-lime-400/10"
                  : "border-border bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-background/70">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {modeLabel(m, copy)}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {modeDesc(m, copy)}
                </span>
              </span>
            </motion.button>
          );
        })}
      </motion.div>
      <div className="flex justify-end">
        <Button
          className="bg-lime-400 text-black hover:bg-lime-300"
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.activateGenerating}
            </>
          ) : (
            copy.activateGenerate
          )}
        </Button>
      </div>
    </div>
  );
}
