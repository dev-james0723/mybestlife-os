"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Headphones,
  Loader2,
  Radio,
  RefreshCw,
} from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AIAnalyticsContext,
  AnalyticsAudioOverview,
} from "@/lib/analytics/types";

type AudioOverviewPanelProps = {
  metrics: AIAnalyticsContext;
};

function AudioBars({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex h-12 items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => (
        <motion.span
          key={index}
          className="w-1.5 rounded-full bg-primary/70"
          initial={{ height: 10 + ((index * 7) % 24) }}
          animate={
            active && !reduceMotion
              ? {
                  height: [
                    10 + ((index * 7) % 24),
                    30 + ((index * 5) % 18),
                    12 + ((index * 3) % 20),
                  ],
                }
              : undefined
          }
          transition={{
            duration: 0.75,
            repeat: active && !reduceMotion ? Infinity : 0,
            repeatType: "mirror",
            delay: index * 0.035,
          }}
        />
      ))}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

const AUDIO_OVERVIEW_ERROR_HINTS: Record<string, string> = {
  voxcpm_unreachable:
    "VoxCPM TTS is not running. In a separate terminal run: npm run dev:tts",
  audio_provider_not_configured:
    "Set VOXCPM_BASE_URL in app/.env.local (see services/voxcpm-tts/README.md).",
  audio_generation_failed: "Audio synthesis failed.",
  unauthenticated: "Sign in again to generate audio.",
};

function errorMessageFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Audio overview failed.";
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }
  if (typeof record.error === "string") {
    return AUDIO_OVERVIEW_ERROR_HINTS[record.error] ?? record.error;
  }
  return "Audio overview failed.";
}

export function AudioOverviewPanel({ metrics }: AudioOverviewPanelProps) {
  const params = useParams<{ locale?: string }>();
  const [overview, setOverview] = useState<AnalyticsAudioOverview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateOverview() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/analytics/audio-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics,
          language: params.locale ?? "en",
          voiceGender: "female",
        }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(errorMessageFromPayload(payload));
      }
      setOverview(payload as AnalyticsAudioOverview);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Audio overview failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <GlassTintPanel tint="teal" className="p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Headphones className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Audio Overview</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Generate a spoken briefing from this range: progress, friction, action items, and the next adjustment.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={generateOverview}
              disabled={isGenerating}
              className="h-11 gap-2 px-4 sm:h-8 sm:px-2.5"
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : overview ? (
                <RefreshCw className="size-4" />
              ) : (
                <Radio className="size-4" />
              )}
              {isGenerating
                ? "Generating"
                : overview
                  ? "Regenerate Audio Overview"
                  : "Generate Audio Overview"}
            </Button>
            {overview ? (
              <>
                <Badge variant="outline">
                  <Clock3 className="size-3" />
                  {formatDuration(overview.durationSeconds)}
                </Badge>
                <Badge variant="outline">
                  <CheckCircle2 className="size-3" />
                  {overview.provider}
                </Badge>
              </>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-sm text-amber-900 dark:text-amber-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/55 bg-background/34 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <AudioBars active={isGenerating || overview != null} />
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                {overview ? "ready" : isGenerating ? "building" : "idle"}
              </p>
              <p className="mt-1 text-sm font-medium">
                {overview?.title ?? "Life Pulse Briefing"}
              </p>
            </div>
          </div>

          {overview ? (
            <div className="space-y-4">
              <audio controls className="w-full" src={overview.audioUrl} />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                  action items
                </p>
                <ul className="space-y-2">
                  {overview.actionItems.slice(0, 3).map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-border/50 bg-background/35 px-3 py-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                {overview.summary}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
              The briefing appears here after generation.
            </div>
          )}
        </div>
      </div>
    </GlassTintPanel>
  );
}
