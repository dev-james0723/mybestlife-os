"use client";

import {
  Car,
  Dumbbell,
  Heart,
  Plane,
  Shirt,
  Sparkles,
  Trees,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  WeatherImpactCategory,
  WeatherInsight,
} from "@/lib/weather/types";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

interface WeatherImpactPanelProps {
  copy: WeatherUiCopy;
  insight: WeatherInsight | null;
}

const ICON_MAP: Record<WeatherImpactCategory, LucideIcon> = {
  commute: Car,
  exercise: Dumbbell,
  clothing: Shirt,
  outdoor: Trees,
  travel: Plane,
  health: Heart,
};

export function WeatherImpactPanel({
  copy,
  insight,
}: WeatherImpactPanelProps) {
  const items = insight?.impact ?? [];

  return (
    <section
      className="weather-glass-dark space-y-5 p-6"
      aria-labelledby="weather-impact-heading"
    >
      <header className="flex items-center gap-2 text-[var(--weather-text-primary)]">
        <Sparkles
          className="size-5 text-[var(--weather-accent-lime)]"
          aria-hidden
        />
        <h3 id="weather-impact-heading" className="text-base font-medium">
          {copy.aiImpactTitle}
        </h3>
      </header>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--weather-text-secondary)]">
          No notable impact for current conditions.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, idx) => {
            const Icon = ICON_MAP[item.category] ?? Sparkles;
            return (
              <li
                key={idx}
                className="weather-glass-card flex items-start gap-3 p-3"
              >
                <Icon
                  className="mt-0.5 size-5 text-[var(--weather-accent-lime)]"
                  aria-hidden
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--weather-accent-lime)]">
                    {categoryLabel(copy, item.category)} — {item.headline}
                  </span>
                  <span className="text-sm text-[var(--weather-text-secondary)]">
                    {item.detail}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function categoryLabel(
  copy: WeatherUiCopy,
  category: WeatherImpactCategory,
): string {
  switch (category) {
    case "commute":
      return copy.impactCommute;
    case "exercise":
      return copy.impactExercise;
    case "clothing":
      return copy.impactClothing;
    case "outdoor":
      return copy.impactOutdoor;
    case "travel":
      return copy.impactTravel;
    case "health":
      return copy.impactHealth;
  }
}
