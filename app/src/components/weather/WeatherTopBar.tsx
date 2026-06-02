"use client";

import { Loader2, RefreshCw } from "lucide-react";

import { OSControl } from "@/components/ui/os-primitives";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";
import type { WeatherLocation } from "@/lib/weather/types";

import { WeatherLocationSearch } from "./WeatherLocationSearch";

interface WeatherTopBarProps {
  copy: WeatherUiCopy;
  selectedLabel?: string;
  onSelect: (location: WeatherLocation) => void;
  onClear: () => void;
  onUseMyLocation: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Page-local sub-bar that sits below the global topbar. Holds the
 * location search + a manual refresh affordance. Position-sticky so it
 * stays accessible while the user scrolls through forecast cards.
 */
export function WeatherTopBar({
  copy,
  selectedLabel,
  onSelect,
  onClear,
  onUseMyLocation,
  onRefresh,
  refreshing,
}: WeatherTopBarProps) {
  return (
    <div className="weather-glass-panel relative z-[60] flex flex-col gap-3 overflow-visible px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <WeatherLocationSearch
        copy={copy}
        selectedLabel={selectedLabel}
        onSelect={onSelect}
        onClear={onClear}
        onUseMyLocation={onUseMyLocation}
      />
      <OSControl
        type="button"
        osSize="compact"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label={copy.retry}
        className="self-end gap-1.5 text-xs"
      >
        {refreshing ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-3.5" aria-hidden />
        )}
        <span>{copy.retry}</span>
      </OSControl>
    </div>
  );
}
