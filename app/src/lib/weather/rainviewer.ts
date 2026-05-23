/**
 * RainViewer adapter — free, key-less weather radar tiles.
 * Docs: https://www.rainviewer.com/api.html
 *
 * The public weather-maps endpoint returns the list of available radar
 * frames (≈2h of past observations + ≈30min nowcast). Each frame has a
 * `path`; the tile URL is assembled as:
 *
 *   {host}{path}/{size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
 *
 * No API key, no rate-limit headaches for a page that refreshes at most
 * once a minute.
 */

const RAINVIEWER_INDEX = "https://api.rainviewer.com/public/weather-maps.json";

export type RadarFrame = {
  /** Unix seconds. */
  time: number;
  /** Tile path fragment, e.g. "/v2/radar/1700000000". */
  path: string;
  /** True for nowcast (future) frames. */
  nowcast: boolean;
};

export type RadarFrames = {
  host: string;
  frames: RadarFrame[];
  /** Index into `frames` of the most recent *observed* frame. */
  nowIndex: number;
};

type RainViewerIndexResponse = {
  host?: string;
  radar?: {
    past?: Array<{ time: number; path: string }>;
    nowcast?: Array<{ time: number; path: string }>;
  };
};

export async function fetchRadarFrames(): Promise<RadarFrames | null> {
  try {
    const res = await fetch(RAINVIEWER_INDEX, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as RainViewerIndexResponse;
    const host = data.host ?? "https://tilecache.rainviewer.com";
    const past = (data.radar?.past ?? []).map((f) => ({
      time: f.time,
      path: f.path,
      nowcast: false,
    }));
    const nowcast = (data.radar?.nowcast ?? []).map((f) => ({
      time: f.time,
      path: f.path,
      nowcast: true,
    }));
    const frames = [...past, ...nowcast];
    if (frames.length === 0) return null;
    // The last "past" frame is "now".
    const nowIndex = Math.max(0, past.length - 1);
    return { host, frames, nowIndex };
  } catch {
    return null;
  }
}

/**
 * Build a Leaflet-compatible tile URL template for a given frame.
 *
 * color scheme 4 = "The Weather Channel" (green → yellow → red), which
 * matches the precipitation legend in the card design.
 */
export function radarTileUrl(
  host: string,
  frame: RadarFrame,
  opts?: { size?: 256 | 512; color?: number; smooth?: boolean; snow?: boolean },
): string {
  const size = opts?.size ?? 256;
  const color = opts?.color ?? 4;
  const smooth = opts?.smooth === false ? 0 : 1;
  const snow = opts?.snow === false ? 0 : 1;
  return `${host}${frame.path}/${size}/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`;
}

/** Legend stops for RainViewer color scheme 4 (light → heavy). */
export const RADAR_LEGEND_STOPS = [
  { color: "#7ec0a6", label: "Light" },
  { color: "#a7cf6b", label: "" },
  { color: "#c8e53a", label: "Moderate" },
  { color: "#f4c20d", label: "" },
  { color: "#e8542a", label: "Heavy" },
];
