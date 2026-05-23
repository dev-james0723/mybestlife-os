"use client";

import { Activity, CloudRain, Eye, Gauge, Sun, Wind, Droplets } from "lucide-react";

import type { CurrentWeather } from "@/lib/weather/types";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

import { WeatherMetricCard } from "./WeatherMetricCard";

interface WeatherMetricsGridProps {
  copy: WeatherUiCopy;
  current: CurrentWeather;
}

/**
 * Bento grid of headline metrics (UV / Humidity / Wind / Rain chance /
 * Visibility / Pressure / Dew point). Matches the Stitch prototype's
 * 4-col desktop / 2-col mobile layout.
 */
export function WeatherMetricsGrid({ copy, current }: WeatherMetricsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <WeatherMetricCard
        icon={Sun}
        label={copy.metricUvIndex}
        value={current.uvIndex ? String(current.uvIndex) : "—"}
        trailing={current.uvIndex ? uvLabelToCopy(copy, current.uvLabel) : undefined}
      />
      <WeatherMetricCard
        icon={Droplets}
        label={copy.metricHumidity}
        value={`${current.humidity}%`}
      />
      <WeatherMetricCard
        icon={Wind}
        label={copy.metricWind}
        value={`${current.windSpeed}`}
        trailing={`km/h ${current.windDirection ?? ""}`.trim()}
      />
      <WeatherMetricCard
        icon={CloudRain}
        label={copy.metricRainChance}
        value={`${current.rainChance}%`}
        accent={current.rainChance >= 60}
      />
      <WeatherMetricCard
        icon={Eye}
        label={copy.metricVisibility}
        value={current.visibility != null ? `${current.visibility} km` : "—"}
      />
      <WeatherMetricCard
        icon={Gauge}
        label={copy.metricPressure}
        value={current.pressure != null ? `${current.pressure}` : "—"}
        trailing={current.pressure != null ? "hPa" : undefined}
      />
      <WeatherMetricCard
        icon={Droplets}
        label={copy.metricDewPoint}
        value={current.dewPoint != null ? `${current.dewPoint}°` : "—"}
      />
      <WeatherMetricCard
        icon={Activity}
        label={copy.metricAirQuality}
        value={current.airQualityIndex != null ? String(current.airQualityIndex) : "—"}
      />
    </div>
  );
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
