export const GARDEN_PRESENTATION_EVENT = "mblos:garden-presentation-changed";
export type GardenTimeMode = "account" | "dawn" | "day" | "dusk" | "night";
export type GardenWeather = "clear" | "cloudy" | "rain" | "mist";
export type GardenPresentation = {
  objectives: boolean;
  hints: boolean;
  buddyInfo: boolean;
  buddyVisible: boolean;
  highContrast: boolean;
  hand: "left" | "right";
  pet: "account" | "xiaoba" | "doge" | `custom:${string}`;
  time: GardenTimeMode;
  weather: "dynamic" | GardenWeather;
};
export const defaultGardenPresentation: GardenPresentation = {
  objectives: true,
  hints: true,
  buddyInfo: true,
  buddyVisible: true,
  highContrast: false,
  hand: "left",
  pet: "account",
  time: "account",
  weather: "dynamic",
};
export function normalizeGardenPresentation(raw: unknown): GardenPresentation {
  const p =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = { ...defaultGardenPresentation };
  for (const k of [
    "objectives",
    "hints",
    "buddyInfo",
    "buddyVisible",
    "highContrast",
  ] as const)
    if (typeof p[k] === "boolean") result[k] = p[k];
  if (p.hand === "right") result.hand = "right";
  if (p.pet === "xiaoba" || p.pet === "doge") result.pet = p.pet;
  if (typeof p.pet === "string" && /^custom:[0-9a-f-]{36}$/i.test(p.pet))
    result.pet = p.pet as GardenPresentation["pet"];
  if (["dawn", "day", "dusk", "night"].includes(String(p.time)))
    result.time = p.time as GardenTimeMode;
  if (["clear", "cloudy", "rain", "mist"].includes(String(p.weather)))
    result.weather = p.weather as GardenWeather;
  return result;
}
export function gardenPresentationKey(userId: string) {
  return `mblos:garden-presentation:v1:${userId}`;
}

export function resolveGardenTimezone(timezone?: string): string {
  const value =
    timezone && timezone !== "auto"
      ? timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return value;
  } catch {
    return "UTC";
  }
}
export function gardenLocalClock(now: number, timezone?: string) {
  const zone = resolveGardenTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (key: string) => parts.find((p) => p.type === key)?.value ?? "0";
  return {
    hour: Number(get("hour")) + Number(get("minute")) / 60,
    day: `${get("year")}-${get("month")}-${get("day")}`,
    timezone: zone,
  };
}
function hash(text: string) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function sampleGardenAtmosphere(
  now: number,
  timezone: string | undefined,
  p: Pick<GardenPresentation, "time" | "weather">,
) {
  const clock = gardenLocalClock(now, timezone);
  const hour =
    p.time === "account"
      ? clock.hour
      : ({ dawn: 6.2, day: 12, dusk: 18.4, night: 23 } as const)[p.time];
  const weather: GardenWeather =
    p.weather === "dynamic"
      ? (["clear", "clear", "cloudy", "rain", "mist"] as const)[
          hash(`${clock.day}:${Math.floor(clock.hour / 3)}`) % 5
        ]
      : p.weather;
  // Account wall clock drives atmosphere only. Gameplay stays on its existing fixed step.
  const sun = Math.sin(((hour - 6) / 24) * Math.PI * 2);
  const daylight = Math.min(1, Math.max(0, (sun + 0.15) / 0.65));
  const twilight =
    Math.max(0, 1 - Math.abs(sun) / 0.34) * (hour > 4 && hour < 21 ? 1 : 0);
  return {
    ...clock,
    hour,
    weather,
    daylight,
    twilight,
    night: daylight < 0.2,
    preview: p.time !== "account" || p.weather !== "dynamic",
  };
}
export type GardenAtmosphere = ReturnType<typeof sampleGardenAtmosphere>;

export function gardenWeatherInvitation(
  weather: GardenWeather,
  night: boolean,
  zh: boolean,
) {
  if (weather === "rain")
    return zh
      ? "花園正在下雨，要一起打開遮棚、收集雨水嗎？植物和夥伴都很安全。"
      : "It’s raining in your garden. Open the canopy and gather rainwater together? Your plants and companion are safe.";
  if (night)
    return zh
      ? "花園的月亮升起了，想在暖燈旁慢慢散步嗎？照料可以留待明天。"
      : "The garden moon is up. Fancy a slow walk by the lanterns? Tending can wait until tomorrow.";
  if (weather === "mist")
    return zh
      ? "花園飄起薄霧，想沿著燈光找找今天的小發現嗎？"
      : "Mist is drifting through your garden. Follow the lanterns and see what you find?";
  return zh
    ? "花園天色正好，想去澆點水、看看新開的花嗎？"
    : "A lovely sky in your garden. Shall we water a bed and see what’s blooming?";
}
