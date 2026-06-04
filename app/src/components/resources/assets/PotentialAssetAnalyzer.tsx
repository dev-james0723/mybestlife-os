"use client";

/**
 * Potential Asset Analyzer — "Thinking of buying something?"
 *
 * The user describes a candidate purchase; AI weighs it against what they
 * already own and their projects/goals and returns honest buy / wait / rent /
 * repair / buy-used / skip guidance. Coverage gaps, never aggressive selling.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Loader2, Sparkles } from "lucide-react";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import { useHydrationSafeReducedMotion } from "@/hooks/use-hydration-safe-reduced-motion";
import { useAppStore } from "@/stores/app-store";
import { getAssetIntelUiCopy } from "@/lib/i18n/asset-intelligence-ui";
import { useAnalyzePotentialAsset } from "@/hooks/use-asset-ai";
import type { Asset } from "@/types/assets";
import type { PotentialAssetAnalysis } from "@/types/asset-intelligence";

export type PotentialAssetAnalyzerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
};

export function PotentialAssetAnalyzer({
  open,
  onOpenChange,
  assets,
}: PotentialAssetAnalyzerProps) {
  const language = useAppStore((s) => s.language);
  const t = getAssetIntelUiCopy(language).potential;
  const prefersReduced = useHydrationSafeReducedMotion();
  const analyze = useAnalyzePotentialAsset();

  const [item, setItem] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<PotentialAssetAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!item.trim()) return;
    setError(null);
    setResult(null);
    try {
      const res = await analyze.mutateAsync({
        itemName: item.trim(),
        notes: notes.trim() || undefined,
        context: {
          // A compact slice of what's already owned (names + category only).
          similarAssets: assets.slice(0, 30).map((a) => ({
            id: a.id,
            title: a.name,
            kind: a.category_key ?? "asset",
          })),
        },
      });
      setResult(res.result);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-[var(--accent-pink)]" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>

          <div className="space-y-2">
            <Label>{t.title}</Label>
            <Input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder={t.itemPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={2}
            />
          </div>

          <Button
            variant="gradient-pink"
            onClick={handleAnalyze}
            disabled={!item.trim() || analyze.isPending}
          >
            {analyze.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {t.analyzing}
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> {t.analyzeCta}
              </>
            )}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <motion.div
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
              className="space-y-3"
            >
              <div className="rounded-2xl border border-[var(--accent-pink)]/30 bg-[var(--accent-pink)]/5 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t.recommendation}
                </p>
                <p className="text-lg font-bold text-[var(--accent-pink)]">
                  {result.recommendationLabel}
                </p>
                <p className="mt-1 text-sm">{result.summary}</p>
              </div>

              <Detail label={t.alreadyOwn} value={result.alreadyOwnSimilar} />
              {result.supportedProjects.length > 0 && (
                <Detail
                  label={t.supports}
                  value={result.supportedProjects.join(", ")}
                />
              )}
              <Detail label={t.needVsDesire} value={result.needVsDesire} />
              <Detail label={t.opportunityCost} value={result.opportunityCost} />
              <Detail label={t.wouldReplace} value={result.whatItWouldReplace} />
              {result.documentsToCollect.length > 0 && (
                <Detail
                  label={t.documentsToCollect}
                  value={result.documentsToCollect.join(", ")}
                />
              )}
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}
