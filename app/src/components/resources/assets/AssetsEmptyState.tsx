"use client";

import { motion } from "framer-motion";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHydrationSafeReducedMotion } from "@/hooks/use-hydration-safe-reduced-motion";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";

type AssetsEmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
};

/**
 * Custom empty state for the Assets sub-tab.
 * Visually distinct from the shared EmptyState: uses the accent-pink gradient
 * on the icon halo and CTA so the zero-state still reads as "Resources".
 */
export function AssetsEmptyState({
  title,
  description,
  ctaLabel,
  onCtaClick,
}: AssetsEmptyStateProps) {
  const prefersReduced = useHydrationSafeReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 py-16 px-6 text-center"
    >
      <motion.div
        aria-hidden
        initial={prefersReduced ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.05 }}
        className="relative mb-5 flex size-16 items-center justify-center rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-pink-from), var(--accent-pink-to))",
        }}
      >
        <Package className="size-7 text-[var(--accent-pink-foreground)]" />
        <span
          className="absolute inset-0 -z-10 rounded-2xl blur-xl opacity-40"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-pink-from), var(--accent-pink-to))",
          }}
        />
      </motion.div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {ctaLabel && onCtaClick && (
        <Button
          variant="gradient-pink"
          size="lg"
          onClick={onCtaClick}
          className="mt-6"
        >
          <Plus className="size-4" />
          {ctaLabel}
        </Button>
      )}
    </motion.div>
  );
}
