"use client";

import {
  ArrowRight,
  Eye,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { Badge } from "@/components/ui/badge";
import type { AIAnalyticsInsight } from "@/lib/analytics/types";

export function AIInterventionPanel({ insight }: { insight: AIAnalyticsInsight }) {
  return (
    <GlassTintPanel tint="pink" className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">AI Intervention</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {insight.summary}
          </p>
        </div>
        <Badge variant="outline">Confidence: {insight.confidence}</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background/35 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="size-4 text-emerald-600" />
            What improved
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {insight.progress.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/35 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Eye className="size-4 text-amber-600" />
            Not improving
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {insight.blindSpots.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/35 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <ArrowRight className="size-4 text-primary" />
            Next best move
          </div>
          <p className="text-sm text-muted-foreground">{insight.nextBestMove}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background/25 p-4">
          <p className="mb-2 text-sm font-medium">Hidden pattern</p>
          <p className="text-sm text-muted-foreground">{insight.hiddenPattern}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/25 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <PauseCircle className="size-4" />
            Stop doing
          </div>
          <p className="text-sm text-muted-foreground">{insight.stopDoing}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/25 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4" />
            Protect
          </div>
          <p className="text-sm text-muted-foreground">{insight.protect}</p>
        </div>
      </div>
    </GlassTintPanel>
  );
}
