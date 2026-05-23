"use client";

import {
  AlarmClock,
  Bell,
  Droplet,
  Shirt,
  Sun,
  Umbrella,
  Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { WeatherInsight } from "@/lib/weather/types";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

interface WeatherSmartRemindersProps {
  copy: WeatherUiCopy;
  insight: WeatherInsight | null;
}

const ICON_MAP: Record<WeatherInsight["reminders"][number]["iconKey"], LucideIcon> = {
  umbrella: Umbrella,
  departure: AlarmClock,
  apparel: Shirt,
  sun: Sun,
  wind: Wind,
  hydration: Droplet,
};

export function WeatherSmartReminders({
  copy,
  insight,
}: WeatherSmartRemindersProps) {
  const reminders = insight?.reminders ?? [];

  return (
    <section
      className="weather-glass-dark space-y-5 p-6"
      aria-labelledby="weather-reminders-heading"
    >
      <header className="flex items-center gap-2 text-[var(--weather-text-primary)]">
        <Bell className="size-5 text-[var(--weather-accent-lime)]" aria-hidden />
        <h3
          id="weather-reminders-heading"
          className="text-base font-medium"
        >
          {copy.smartRemindersTitle}
        </h3>
      </header>
      {reminders.length === 0 ? (
        <p className="text-sm text-[var(--weather-text-secondary)]">
          No reminders for current conditions.
        </p>
      ) : (
        <ul className="space-y-3">
          {reminders.map((r, idx) => {
            const Icon = ICON_MAP[r.iconKey] ?? Bell;
            return (
              <li
                key={idx}
                className="flex items-center gap-3 rounded-xl border border-[var(--weather-glass-border-subtle)] bg-white/5 p-3"
              >
                <Icon
                  className="size-5 text-[var(--weather-accent-lime)]"
                  aria-hidden
                />
                <span className="text-sm text-[var(--weather-text-primary)]">
                  {r.message}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
