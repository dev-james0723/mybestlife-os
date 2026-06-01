"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

import { RealizedDreamStoryCard } from "./memory/realized-dream-story-card";
import {
  bucketEntrance,
  bucketStaggerContainer,
  bucketStaggerItem,
} from "./bucket-motion";

type RealizedStripProps = {
  items: BucketItem[];
  onSelect: (bucketId: string) => void;
};

/**
 * Bottom strip — the "Realized Dreams (Memories)" row from the screenshot.
 * Horizontal scroll on small screens, grid on wider ones.
 */
export function BucketRealizedStrip({ items, onSelect }: RealizedStripProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);
  const reduceMotion = useReducedMotion() ?? false;

  if (items.length === 0) return null;

  return (
    <motion.section
      {...bucketEntrance(reduceMotion, 0.1, 12)}
      aria-labelledby="realized-dreams-heading"
      className="space-y-3"
    >
      <h2
        id="realized-dreams-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55"
      >
        {copy.realizedDreamsHeader}
      </h2>
      <motion.div
        variants={bucketStaggerContainer(reduceMotion)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:snap-none md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <motion.div key={item.id} variants={bucketStaggerItem(reduceMotion, 10)}>
            <RealizedDreamStoryCard
              item={item}
              onClick={() => onSelect(item.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
