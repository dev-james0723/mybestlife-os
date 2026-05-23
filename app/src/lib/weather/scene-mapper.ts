/**
 * Maps weather + location + time-of-day → a deterministic "scene"
 * descriptor that the `WeatherBackgroundScene` component uses to pick a
 * CSS animation layer set (rain, fog, sun glow, snow particles, …).
 *
 * The scene is purely visual; data accuracy never depends on it.
 */

import type {
  WeatherConditionCode,
  WeatherIntensity,
  WeatherTimeOfDay,
} from "./types";

export type WeatherScene = {
  /** Stable identifier used as a className suffix (e.g. `scene-heavy-rain-night`). */
  id: string;
  conditionCode: WeatherConditionCode;
  intensity: WeatherIntensity;
  timeOfDay: WeatherTimeOfDay;
  /** Visual layer toggles for CSS animations. */
  layers: {
    rain: false | "light" | "moderate" | "heavy";
    fog: boolean;
    snow: boolean;
    sun: boolean;
    starfield: boolean;
    lightning: boolean;
  };
  /** Gradient tokens for the base background when no Unsplash photo is present. */
  baseGradient: string;
};

export function getWeatherScene(input: {
  conditionCode: WeatherConditionCode;
  intensity: WeatherIntensity;
  timeOfDay: WeatherTimeOfDay;
}): WeatherScene {
  const { conditionCode, intensity, timeOfDay } = input;
  const id = `scene-${conditionCode}-${timeOfDay}`;

  const isNight = timeOfDay === "night" || timeOfDay === "evening";

  const layers: WeatherScene["layers"] = {
    rain: false,
    fog: false,
    snow: false,
    sun: false,
    starfield: isNight && (conditionCode === "clear-night" || conditionCode === "partly-cloudy-night"),
    lightning: conditionCode === "thunderstorm",
  };

  if (conditionCode === "heavy-rain" || conditionCode === "thunderstorm") {
    layers.rain = "heavy";
  } else if (conditionCode === "rain") {
    layers.rain = intensity === "heavy" ? "heavy" : "moderate";
  } else if (conditionCode === "light-rain" || conditionCode === "sleet") {
    layers.rain = "light";
  }

  if (conditionCode === "fog") {
    layers.fog = true;
  }

  if (conditionCode === "snow") {
    layers.snow = true;
  }

  if (
    !isNight &&
    (conditionCode === "clear-day" || conditionCode === "partly-cloudy-day")
  ) {
    layers.sun = true;
  }

  return {
    id,
    conditionCode,
    intensity,
    timeOfDay,
    layers,
    baseGradient: gradientForCondition(conditionCode, timeOfDay),
  };
}

/**
 * Time-of-day from a Date + an IANA timezone (best-effort). We don't need
 * astronomical accuracy — buckets are enough for picking the scene.
 */
export function timeOfDayFromDate(date: Date = new Date()): WeatherTimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "midday";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

function gradientForCondition(
  code: WeatherConditionCode,
  tod: WeatherTimeOfDay,
): string {
  const night = tod === "night" || tod === "evening";
  switch (code) {
    case "clear-day":
      return "linear-gradient(180deg, #4a8cd6 0%, #87b8e8 50%, #f9d29e 100%)";
    case "clear-night":
      return "linear-gradient(180deg, #050818 0%, #0c1638 50%, #1a2455 100%)";
    case "partly-cloudy-day":
      return "linear-gradient(180deg, #6e94be 0%, #95b6d6 50%, #d8c8a0 100%)";
    case "partly-cloudy-night":
      return "linear-gradient(180deg, #0a0e22 0%, #1c2543 50%, #2a3865 100%)";
    case "cloudy":
      return night
        ? "linear-gradient(180deg, #131520 0%, #1d2030 100%)"
        : "linear-gradient(180deg, #7c8694 0%, #9aa3b0 100%)";
    case "fog":
      return night
        ? "linear-gradient(180deg, #1a1c22 0%, #2a2e36 100%)"
        : "linear-gradient(180deg, #a0a8b0 0%, #c5cdd4 100%)";
    case "light-rain":
    case "rain":
      return night
        ? "linear-gradient(180deg, #0c1118 0%, #142030 100%)"
        : "linear-gradient(180deg, #44525c 0%, #6e7d88 100%)";
    case "heavy-rain":
      return "linear-gradient(180deg, #060912 0%, #0c1626 100%)";
    case "thunderstorm":
      return "linear-gradient(180deg, #040712 0%, #0a0f1e 100%)";
    case "snow":
      return night
        ? "linear-gradient(180deg, #1c2030 0%, #2c3144 100%)"
        : "linear-gradient(180deg, #c0c8d2 0%, #e0e6ec 100%)";
    case "sleet":
      return "linear-gradient(180deg, #20252e 0%, #353c46 100%)";
    default:
      return "linear-gradient(180deg, #1a1c22 0%, #2a2e36 100%)";
  }
}
