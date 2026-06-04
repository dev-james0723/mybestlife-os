"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Minus, Pause, Play, Plus } from "lucide-react";
import dynamic from "next/dynamic";

import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";
import {
  fetchRadarFrames,
  RADAR_LEGEND_STOPS,
  type RadarFrames,
} from "@/lib/weather/rainviewer";

import type { RadarMapHandle } from "./WeatherRadarInner";

const RadarInner = dynamic(() => import("./WeatherRadarInner"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />
  ),
});

interface WeatherRadarPanelProps {
  copy: WeatherUiCopy;
  latitude: number;
  longitude: number;
}

const FRAME_MS = 600;

/**
 * Live precipitation radar. Real RainViewer frames over a dark Carto
 * basemap centred on the user. Plays through the last ~2h of observed
 * radar plus the ~30min nowcast; the timeline scrubs frames and the
 * timestamp shows the frame time with a "nowcast" badge for future
 * frames.
 */
export function WeatherRadarPanel({
  copy,
  latitude,
  longitude,
}: WeatherRadarPanelProps) {
  const [frames, setFrames] = useState<RadarFrames | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const mapRef = useRef<RadarMapHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load radar frames once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const f = await fetchRadarFrames();
      if (cancelled || !f) return;
      setFrames(f);
      setFrameIndex(f.nowIndex);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Playback loop.
  useEffect(() => {
    if (!playing || !frames) return;
    timerRef.current = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.frames.length);
    }, FRAME_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, frames]);

  const currentFrame = frames?.frames[frameIndex];
  const isNowcast = currentFrame?.nowcast ?? false;
  const frameLabel = currentFrame
    ? new Date(currentFrame.time * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "--:--";
  const progress = frames
    ? ((frameIndex + 1) / frames.frames.length) * 100
    : 0;

  return (
    <section
      className="weather-glass-dark relative flex min-h-[360px] flex-col overflow-hidden p-6"
      aria-labelledby="weather-radar-heading"
    >
      <header className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[var(--weather-text-primary)]">
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute size-2 animate-ping rounded-full bg-[var(--weather-accent-lime)] opacity-75" />
            <span className="relative size-2 rounded-full bg-[var(--weather-accent-lime)]" />
          </span>
          <h3 id="weather-radar-heading" className="text-base font-medium">
            {copy.radarTitle}
          </h3>
        </span>

        <div className="flex items-center gap-2">
          <RoundIconButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
            <Plus className="size-4" />
          </RoundIconButton>
          <RoundIconButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
            <Minus className="size-4" />
          </RoundIconButton>
          <RoundIconButton
            label="Recenter on me"
            accent
            onClick={() => mapRef.current?.recenter()}
          >
            <LocateFixed className="size-4" />
          </RoundIconButton>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden rounded-xl border border-[var(--weather-glass-border-subtle)] bg-black/30">
        <RadarInner
          ref={mapRef}
          latitude={latitude}
          longitude={longitude}
          frames={frames}
          frameIndex={frameIndex}
        />

        {/* Floating playback controls. */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-2">
          <div className="weather-glass-pill pointer-events-auto min-h-11 gap-3 px-4 sm:!h-9 sm:min-h-9">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause radar animation" : "Play radar animation"}
              className="grid size-11 place-items-center rounded-full text-[var(--weather-text-primary)] sm:size-8"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={frames ? frames.frames.length - 1 : 0}
              value={frameIndex}
              onChange={(e) => {
                setPlaying(false);
                setFrameIndex(Number(e.target.value));
              }}
              aria-label="Radar timeline"
              className="weather-radar-scrubber w-28 sm:w-36"
              style={{ ["--progress" as string]: `${progress}%` }}
            />
            <span className="flex items-center gap-1.5 text-xs tabular-nums text-[var(--weather-text-secondary)]">
              {frameLabel}
              {isNowcast ? (
                <span className="rounded-full bg-[var(--weather-accent-lime-bg)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--weather-accent-lime)]">
                  Nowcast
                </span>
              ) : null}
            </span>
          </div>
          <PrecipLegend />
        </div>

        {/* Frame fetch failed — keep the panel meaningful. */}
        {frames === null ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="weather-glass-pill !h-7 text-[11px] text-[var(--weather-text-secondary)]">
              Loading radar…
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function RoundIconButton({
  children,
  accent,
  label,
  onClick,
}: {
  children: React.ReactNode;
  accent?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={
        "flex size-11 items-center justify-center rounded-full border border-[var(--weather-glass-border)] bg-[var(--weather-glass-elevated)] transition-colors hover:bg-white/10 sm:size-8 " +
        (accent
          ? "text-[var(--weather-accent-lime)]"
          : "text-[var(--weather-text-primary)]")
      }
    >
      {children}
    </button>
  );
}

function PrecipLegend() {
  return (
    <div
      className="weather-glass-pill pointer-events-auto !h-9 gap-1 px-2"
      role="img"
      aria-label="Precipitation intensity legend, light to heavy"
    >
      {RADAR_LEGEND_STOPS.map((stop, i) => (
        <span
          key={i}
          className="size-4 rounded-sm"
          style={{ background: stop.color }}
          title={stop.label || undefined}
        />
      ))}
    </div>
  );
}
