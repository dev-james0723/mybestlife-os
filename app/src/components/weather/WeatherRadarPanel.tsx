"use client";

import { useState } from "react";
import {
  Minus,
  LocateFixed,
  Pause,
  Play,
  Plus,
  Radio,
  Satellite,
} from "lucide-react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

// Lazy-load the inner placeholder so the radar SVG / canvas never runs
// during SSR (matches the project's pattern for 3D / heavy canvas content).
const RadarInner = dynamic(() => import("./WeatherRadarInner"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />
  ),
});

interface WeatherRadarPanelProps {
  copy: WeatherUiCopy;
  /** Coordinates the radar should centre on. */
  latitude?: number;
  longitude?: number;
}

/**
 * Live Radar / Satellite panel. The header + toolbar are production-ready;
 * the actual radar surface is rendered by `WeatherRadarInner`, a
 * placeholder marked "coming soon" so we can swap in a real radar tile
 * provider (e.g. RainViewer) without changing this shell.
 */
export function WeatherRadarPanel({ copy }: WeatherRadarPanelProps) {
  const [view, setView] = useState<"satellite" | "street">("satellite");
  const [playing, setPlaying] = useState(false);

  return (
    <section
      className="weather-glass-dark relative flex min-h-[320px] flex-col overflow-hidden p-6"
      aria-labelledby="weather-radar-heading"
    >
      <header className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-[var(--weather-text-primary)]">
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute size-2 animate-ping rounded-full bg-[var(--weather-accent-lime)] opacity-75" />
              <span className="relative size-2 rounded-full bg-[var(--weather-accent-lime)]" />
            </span>
            <h3 id="weather-radar-heading" className="text-base font-medium">
              {copy.radarTitle}
            </h3>
          </span>
          <div
            role="tablist"
            aria-label="Radar view"
            className="weather-glass-pill !h-8 gap-0 p-0.5"
          >
            <button
              role="tab"
              aria-selected={view === "satellite"}
              onClick={() => setView("satellite")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
                view === "satellite"
                  ? "bg-[var(--weather-accent-lime-bg)] text-[var(--weather-accent-lime)]"
                  : "text-[var(--weather-text-secondary)]",
              )}
            >
              <Satellite className="size-3.5" aria-hidden />
              {copy.radarSatellite}
            </button>
            <button
              role="tab"
              aria-selected={view === "street"}
              onClick={() => setView("street")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
                view === "street"
                  ? "bg-[var(--weather-accent-lime-bg)] text-[var(--weather-accent-lime)]"
                  : "text-[var(--weather-text-secondary)]",
              )}
            >
              <Radio className="size-3.5" aria-hidden />
              {copy.radarStreet}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RoundIconButton label="Zoom in">
            <Plus className="size-4" />
          </RoundIconButton>
          <RoundIconButton label="Zoom out">
            <Minus className="size-4" />
          </RoundIconButton>
          <RoundIconButton label="Recenter on me" accent>
            <LocateFixed className="size-4" />
          </RoundIconButton>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden rounded-xl border border-[var(--weather-glass-border-subtle)] bg-black/30">
        <RadarInner view={view} />

        {/* Floating playback controls. */}
        <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-2">
          <div className="weather-glass-pill !h-9 gap-3 px-4">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause radar" : "Play radar"}
              className="text-[var(--weather-text-primary)]"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-1/2 bg-[var(--weather-accent-lime)]" />
            </div>
            <span className="text-xs tabular-nums text-[var(--weather-text-secondary)]">
              14:30
            </span>
          </div>
          <PrecipLegend />
        </div>
      </div>
    </section>
  );
}

function RoundIconButton({
  children,
  accent,
  label,
}: {
  children: React.ReactNode;
  accent?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-full border border-[var(--weather-glass-border)] bg-[var(--weather-glass-elevated)] transition-colors hover:bg-white/10",
        accent
          ? "text-[var(--weather-accent-lime)]"
          : "text-[var(--weather-text-primary)]",
      )}
    >
      {children}
    </button>
  );
}

function PrecipLegend() {
  const stops = [
    "#5A8F7B",
    "#8BA870",
    "#C8E53A",
    "#FFD700",
    "#FF4500",
  ];
  return (
    <div
      className="weather-glass-pill !h-9 gap-1 px-2"
      role="img"
      aria-label="Precipitation intensity legend"
    >
      {stops.map((stop) => (
        <span
          key={stop}
          className="size-4 rounded-sm"
          style={{ background: stop }}
        />
      ))}
    </div>
  );
}
