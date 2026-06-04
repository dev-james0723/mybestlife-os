"use client";

/**
 * Page-level Asset Intelligence shown above the gallery:
 *   - Pattern banner: the "stacks" the user's assets form.
 *   - Cluster cards: assets grouped into life systems, with value + weakest link.
 *   - Risk radar: high-value/low-doc, missing serial, sell candidates, etc.
 *
 * All computed client-side from the assets list (instant, no AI cost). The
 * deep, narrative intelligence lives per-asset in the Intelligence Modal.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Layers, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import { useHydrationSafeReducedMotion } from "@/hooks/use-hydration-safe-reduced-motion";
import { useAppStore } from "@/stores/app-store";
import { getAssetIntelUiCopy } from "@/lib/i18n/asset-intelligence-ui";
import {
  clusterAssets,
  computeDocumentHealth,
  computeRiskFlags,
} from "@/lib/assets/asset-intelligence-client";
import type { Asset } from "@/types/assets";
import type { AssetRiskFlag } from "@/types/asset-intelligence";

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AssetPageIntelligence({ assets }: { assets: Asset[] }) {
  const language = useAppStore((s) => s.language);
  const t = getAssetIntelUiCopy(language).page;
  const prefersReduced = useHydrationSafeReducedMotion();

  const clusters = useMemo(() => clusterAssets(assets), [assets]);

  // Aggregate risk flags (field-derived; usage is unknown at list level so we
  // treat linked activity as 0 and keep only documentation/value-based flags).
  const riskCounts = useMemo(() => {
    const counts = new Map<AssetRiskFlag, number>();
    for (const asset of assets) {
      const health = computeDocumentHealth({
        asset,
        documentRoles: [],
        imageTypes: [],
      });
      const flags = computeRiskFlags({
        asset,
        documentHealthScore: health.score,
        linkedActivityCount: 1, // suppress usage-based flags at the list level
      });
      for (const f of flags) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    return counts;
  }, [assets]);

  const topClusters = clusters.slice(0, 4);
  const patternText = topClusters
    .map((c) => t.clusterNames[c.key])
    .join(" + ");

  if (assets.length < 2) return null;

  const riskEntries = Array.from(riskCounts.entries())
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {/* Pattern banner */}
      <motion.div
        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
        className="relative overflow-hidden rounded-2xl border border-[var(--accent-pink)]/20 bg-gradient-to-br from-[var(--accent-pink)]/8 to-transparent p-4"
      >
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-[var(--accent-pink)]" />
          <p className="text-sm">
            <span className="text-muted-foreground">{t.patternBannerPrefix} </span>
            <span className="font-semibold">{patternText}</span>
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Clusters */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Layers className="size-4 text-[var(--accent-pink)]" />
            {t.clustersTitle}
          </h3>
          <div className="space-y-2">
            {topClusters.map((c, i) => (
              <motion.div
                key={c.key}
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, ease: EASE_OUT_EXPO }}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {t.clusterNames[c.key]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.assets.length} · {formatMoney(c.totalValue)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Risk radar */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldAlert className="size-4 text-[var(--accent-pink)]" />
            {t.riskRadarTitle}
          </h3>
          {riskEntries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {riskEntries.map(([flag, count], i) => (
                <motion.span
                  key={flag}
                  initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, ease: EASE_OUT_EXPO }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400",
                  )}
                >
                  {t.riskLabels[flag]}
                  <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px]">
                    {count}
                  </span>
                </motion.span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noRisks}</p>
          )}
        </section>
      </div>
    </div>
  );
}
