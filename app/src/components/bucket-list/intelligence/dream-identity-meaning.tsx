"use client";

import { Compass, Heart, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketDreamIntelligenceReport } from "@/types/bucket-list";
import { bucketStaggerContainer, bucketStaggerItem } from "../bucket-motion";

/** Why it matters deeply · the life chapter it belongs to · why now. */
export function DreamIdentityMeaning({
  report,
  copy,
}: {
  report: BucketDreamIntelligenceReport;
  copy: BucketListUiCopy;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  return (
    <motion.section
      variants={bucketStaggerItem(reduceMotion, 10)}
      className="space-y-3 rounded-xl border p-4"
    >
      <motion.div variants={bucketStaggerItem(reduceMotion, 8)}>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Heart className="h-4 w-4 text-rose-500" />
          {copy.whyMattersDeeplyHeading}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {report.whyThisMattersDeeply}
        </p>
      </motion.div>

      <motion.div
        variants={bucketStaggerContainer(reduceMotion)}
        initial="hidden"
        animate="show"
        className="grid gap-3 sm:grid-cols-2"
      >
        <motion.div variants={bucketStaggerItem(reduceMotion, 8)} className="rounded-lg bg-muted/30 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold">
            <Compass className="h-3.5 w-3.5 text-sky-500" />
            {copy.identityChapterHeading}
          </h4>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {report.identityChapter}
          </p>
        </motion.div>
        <motion.div variants={bucketStaggerItem(reduceMotion, 8)} className="rounded-lg bg-muted/30 p-3">
          <h4 className="text-xs font-semibold">{copy.emotionalMeaningHeading}</h4>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {report.emotionalMeaning}
          </p>
        </motion.div>
      </motion.div>

      {report.whyNow ? (
        <motion.div
          variants={bucketStaggerItem(reduceMotion, 8)}
          className="rounded-lg border border-lime-400/30 bg-lime-400/5 p-3"
        >
          <h4 className="flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-lime-500" />
            {copy.whyNowHeading}
          </h4>
          <p className="mt-1 text-[13px] text-muted-foreground">{report.whyNow}</p>
        </motion.div>
      ) : null}
    </motion.section>
  );
}
