"use client";

/**
 * Weather badge — glass pill between the search and the utility pill.
 *
 * Tapping the pill navigates to the dedicated Weather page under Command
 * Center (between Calendar and Analytics). Falls back to a muted
 * "Weather unavailable" badge whenever any part of the pipeline fails
 * (no key, no location, network error) so the top bar never "breaks".
 */

import Link from "next/link";

import { Cloud, CloudOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useWeather } from "@/hooks/use-weather";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { resolveWeatherAnimationKey } from "@/lib/weather/lottie-animation";
import { WeatherLottie } from "@/components/weather/WeatherLottie";

type Props = {
  className?: string;
  /** Hide the description on narrow viewports. */
  compact?: boolean;
  /** Phone-sized badge: icon + terse value only. */
  mobile?: boolean;
};

export function WeatherBadge({
  className,
  compact = false,
  mobile = false,
}: Props) {
  const { result } = useWeather();
  const localeSlug = useLocaleSlug();
  const weatherHref = withLocalePrefix(localeSlug, "/weather");
  const badgeClassName = cn(
    "topbar-weather-badge",
    mobile && "topbar-weather-badge--mobile",
    className
  );

  if (!result) {
    return (
      <Link
        href={weatherHref}
        prefetch={false}
        className={badgeClassName}
        aria-label="Weather loading — open Weather page"
      >
        <span
          className={cn(
            "inline-flex items-center animate-pulse",
            mobile ? "gap-1" : "gap-2"
          )}
        >
          <Cloud className="h-4 w-4 opacity-85" />
          <span className="opacity-85">—</span>
        </span>
      </Link>
    );
  }

  if (result.status !== "ok") {
    return (
      <Link
        href={weatherHref}
        prefetch={false}
        className={badgeClassName}
        aria-label="Weather unavailable — open Weather page"
        title="Weather unavailable"
      >
        <CloudOff className="h-4 w-4 opacity-85" />
        {mobile ? (
          <span className="opacity-90">N/A</span>
        ) : (
          <>
            <span className="hidden opacity-90 sm:inline">
              Weather unavailable
            </span>
            <span className="opacity-90 sm:hidden">N/A</span>
          </>
        )}
      </Link>
    );
  }

  const animationKey = resolveWeatherAnimationKey({
    weatherId: result.weatherId,
    icon: result.icon,
    main: result.main,
  });

  return (
    <Link
      href={weatherHref}
      prefetch={false}
      className={badgeClassName}
      aria-label={`Weather: ${result.description}, ${result.tempC} degrees Celsius — open Weather page`}
      title={result.city ? `${result.city} • ${result.description}` : result.description}
    >
      <span className="topbar-weather-badge__fg">
        <WeatherLottie
          mode="icon"
          animationKey={animationKey}
          className="topbar-weather-badge__icon"
        />
        <span className="font-semibold tabular-nums">{result.tempC}°C</span>
        {!compact ? (
          <span className="hidden opacity-95 md:inline">{result.description}</span>
        ) : null}
      </span>
    </Link>
  );
}
