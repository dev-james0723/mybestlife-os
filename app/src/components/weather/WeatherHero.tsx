"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Info, MapPin, Sparkles, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { resolveWeatherAnimationKey } from "@/lib/weather/lottie-animation";
import { WeatherLottie } from "@/components/weather/WeatherLottie";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";
import type {
  CurrentWeather,
  WeatherInsight,
  WeatherLocation,
  WeatherImpactTag,
} from "@/lib/weather/types";

interface WeatherHeroProps {
  copy: WeatherUiCopy;
  location: WeatherLocation;
  current: CurrentWeather;
  insight: WeatherInsight | null;
}

/**
 * Emotional + visual centre of the weather page.
 *
 * Layout:
 *   ┌─────────────────────────────┬───────────────┐
 *   │  location · precision        │  Celestial    │
 *   │                              │  UV + sun     │
 *   │  27°  ☔ Heavy Rain          │               │
 *   │  Feels 30°  H 31° L 25°     │               │
 *   │                              │               │
 *   │  short tip                   │               │
 *   │                              │               │
 *   │  AI Executive Brief block    │               │
 *   └─────────────────────────────┴───────────────┘
 */
export function WeatherHero({
  copy,
  location,
  current,
  insight,
}: WeatherHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="weather-glass-panel relative flex flex-col gap-8 p-6 sm:p-8 lg:flex-row"
    >
      {/* Left — core info. */}
      <div className="flex flex-1 flex-col justify-between gap-8">
        {/* Location header. */}
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--weather-text-primary)] sm:text-3xl">
              {location.displayLabel}
            </h2>
            <span className="weather-glass-pill" data-accent="lime">
              <MapPin className="size-3.5" aria-hidden />
              {precisionLabel(copy, location.precision)}
            </span>
          </div>
          <p className="text-sm text-[var(--weather-text-secondary)]">
            {formatUpdatedAt(copy, current.updatedAt)}
          </p>
        </header>

        {/* Temperature + condition. */}
        <div className="flex items-center gap-4 sm:gap-5">
          <WeatherLottie
            mode="icon"
            animationKey={resolveWeatherAnimationKey({
              conditionCode: current.conditionCode,
            })}
            className="-ml-2 size-28 shrink-0 sm:size-44"
          />
          <div className="flex items-end gap-5">
            <div className="leading-[0.95] text-[var(--weather-text-primary)]">
              <span className="text-6xl font-semibold tracking-tighter sm:text-7xl">
                {current.temperature}°C
              </span>
            </div>
            <div className="flex flex-col pb-2">
              <span className="text-lg font-medium text-[var(--weather-accent-lime)]">
                {current.condition}
              </span>
              <p className="mt-1 text-sm text-[var(--weather-text-secondary)]">
                {copy.feelsLike(current.feelsLike)} ·{" "}
                {copy.highLow(current.high, current.low)}
              </p>
            </div>
          </div>
        </div>

        {/* AI Executive Brief. */}
        {insight ? (
          <div
            className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--weather-accent-lime)_30%,transparent)] p-4"
            style={{ background: "var(--weather-accent-lime-bg)" }}
          >
            <header className="flex items-center gap-2 text-[var(--weather-accent-lime)]">
              <Sparkles className="size-4" aria-hidden />
              <h3 className="text-sm font-semibold uppercase tracking-wide">
                {copy.aiBriefTitle}
              </h3>
            </header>
            <p className="text-sm leading-relaxed text-[var(--weather-text-primary)]">
              {insight.brief}
            </p>
            {insight.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {insight.tags.map((t) => (
                  <ImpactTag key={t} tag={t} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          /* Quick tip without AI insight. */
          <div className="weather-glass-pill self-start gap-2">
            <Info className="size-4" aria-hidden />
            <span>{shortTip(current)}</span>
          </div>
        )}
      </div>

      {/* Right — celestial + UV. */}
      <CelestialPanel copy={copy} current={current} />
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CelestialPanel({
  copy,
  current,
}: {
  copy: WeatherUiCopy;
  current: CurrentWeather;
}) {
  const sunrise = formatClock(current.sunrise);
  const sunset = formatClock(current.sunset);
  const sunArcProgress = computeSunArcProgress(current.sunrise, current.sunset);

  return (
    <aside className="hidden w-[280px] flex-col gap-6 border-l border-[var(--weather-glass-border-subtle)] pl-6 lg:flex">
      <header className="flex items-center justify-between text-[var(--weather-text-secondary)]">
        <span className="text-sm">Celestial &amp; UV</span>
        <Sun className="size-4" aria-hidden />
      </header>

      <div className="relative h-[110px] w-full">
        <svg
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          aria-hidden
        >
          {/* Full arc track. */}
          <path
            d="M 10 90 A 90 80 0 0 1 190 90"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="3 5"
            strokeWidth="2"
          />
          {/* Travelled portion. */}
          <path
            d={describeSunArc(sunArcProgress)}
            fill="none"
            stroke="var(--weather-accent-lime)"
            strokeWidth="2"
          />
        </svg>
        {sunArcProgress != null ? (
          <Sun
            className="absolute size-5 text-[var(--weather-accent-lime)] drop-shadow-[0_0_8px_rgba(200,229,58,0.5)]"
            style={{
              left: `${sunCirclePosition(sunArcProgress).x}%`,
              top: `${sunCirclePosition(sunArcProgress).y}%`,
              transform: "translate(-50%, -50%)",
            }}
            aria-hidden
          />
        ) : null}
        <div className="absolute -bottom-1 left-2 flex flex-col items-center text-[10px] uppercase tracking-wide text-[var(--weather-text-secondary)]">
          <span>↑ {sunrise ?? "—"}</span>
        </div>
        <div className="absolute -bottom-1 right-2 flex flex-col items-center text-[10px] uppercase tracking-wide text-[var(--weather-text-secondary)]">
          <span>↓ {sunset ?? "—"}</span>
        </div>
      </div>

      <div className="weather-glass-card flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--weather-text-secondary)]">
            {copy.metricUvIndex}
          </p>
          <p className="mt-1 flex items-end gap-2">
            <span className="text-3xl font-semibold tabular-nums text-[var(--weather-text-primary)]">
              {current.uvIndex != null ? current.uvIndex : "—"}
            </span>
            {current.uvIndex != null ? (
              <span className="pb-1 text-xs text-[var(--weather-accent-lime)]">
                {uvLabelToCopy(copy, current.uvLabel)}
              </span>
            ) : null}
          </p>
        </div>
        <UvGauge value={current.uvIndex ?? null} />
      </div>
    </aside>
  );
}

function UvGauge({ value }: { value: number | null }) {
  const ratio = value != null ? Math.max(0, Math.min(1, value / 11)) : 0;
  const dash = 2 * Math.PI * 20;
  const offset = dash - dash * ratio;
  const display = value != null ? String(value) : "—";

  return (
    <div
      className="relative size-12 shrink-0"
      role="img"
      aria-label={value != null ? `UV index ${value}` : "UV index unavailable"}
    >
      <svg className="size-12 -rotate-90" viewBox="0 0 44 44" aria-hidden>
        <circle
          cx="22"
          cy="22"
          r="20"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="4"
        />
        <circle
          cx="22"
          cy="22"
          r="20"
          fill="none"
          stroke="var(--weather-accent-lime)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms ease-out" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-[var(--weather-text-primary)]">
        {display}
      </span>
    </div>
  );
}

function ImpactTag({ tag }: { tag: WeatherImpactTag }) {
  const variant: "high" | "default" =
    tag === "heavy-rain" || tag === "high-impact-commute" || tag === "heat-wave" || tag === "cold-snap"
      ? "high"
      : "default";
  return (
    <span
      className={cn(
        "weather-glass-pill text-[10px] font-medium uppercase tracking-wide",
        variant === "high"
          ? "!border-red-500/30 !bg-red-500/15 !text-red-200"
          : null,
      )}
    >
      {humanizeTag(tag)}
    </span>
  );
}

function humanizeTag(tag: WeatherImpactTag): string {
  return tag.replace(/-/g, " ");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function precisionLabel(
  copy: WeatherUiCopy,
  precision: WeatherLocation["precision"],
): string {
  switch (precision) {
    case "gps":
      return copy.precisionGps;
    case "district":
      return copy.precisionDistrict;
    case "nearest_station":
      return copy.precisionNearestStation;
    case "city":
      return copy.precisionCity;
    case "manual":
      return copy.precisionManual;
    case "fallback":
      return copy.precisionFallback;
  }
}

function formatUpdatedAt(copy: WeatherUiCopy, iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return copy.updatedJustNow;
    if (diff < 3_600_000) {
      const m = Math.floor(diff / 60_000);
      return copy.updatedAt(`${m}m ago`);
    }
    return copy.updatedAt(
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    );
  } catch {
    return copy.updatedJustNow;
  }
}

function uvLabelToCopy(copy: WeatherUiCopy, label: CurrentWeather["uvLabel"]): string {
  switch (label) {
    case "Low":
      return copy.uvLow;
    case "Moderate":
      return copy.uvModerate;
    case "High":
      return copy.uvHigh;
    case "Very High":
      return copy.uvVeryHigh;
    case "Extreme":
      return copy.uvExtreme;
  }
}

function formatClock(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return null;
  }
}

/**
 * 0 (sunrise) .. 1 (sunset). Returns null when we don't have both bounds
 * or when the current time is outside the daylight window.
 */
function computeSunArcProgress(sunrise?: string, sunset?: string): number | null {
  if (!sunrise || !sunset) return null;
  const sr = new Date(sunrise).getTime();
  const ss = new Date(sunset).getTime();
  const now = Date.now();
  if (now < sr || now > ss) return null;
  return (now - sr) / (ss - sr);
}

function describeSunArc(progress: number | null): string {
  if (progress == null) return "M 10 90 A 90 80 0 0 1 10 90";
  // Quadratic arc from (10,90) to (190,90) with apex at (100,10).
  // Approximate the travelled portion by sampling.
  const target = sunCirclePosition(progress);
  // Map the % position back to the arc path. We approximate by drawing an
  // arc that ends at the sun's current position.
  const x = (target.x / 100) * 200;
  const y = (target.y / 100) * 100;
  return `M 10 90 A 90 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
}

function sunCirclePosition(progress: number): { x: number; y: number } {
  // x is linear; y follows an inverted parabola so the sun arcs over.
  const t = progress;
  const x = 5 + t * 90; // 5%..95%
  // Parabola peaks at t=0.5 (y=10%), bottoms at t=0/1 (y=90%).
  const y = 90 - 320 * t * (1 - t); // 90%..10%
  return { x, y: Math.max(10, y) };
}

function shortTip(current: CurrentWeather): string {
  if (current.conditionCode === "heavy-rain") return "Bring an umbrella";
  if (current.conditionCode === "rain") return "Light rain expected";
  if (current.conditionCode === "snow") return "Snowy conditions";
  if (current.conditionCode === "clear-day") return "Clear skies ahead";
  return current.condition;
}

