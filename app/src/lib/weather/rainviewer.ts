/**
 * RainViewer adapter — free, key-less weather radar tiles.
 * Docs: https://www.rainviewer.com/api.html
 *
 * The public weather-maps endpoint returns the list of available radar
 * frames (about 2h of past observations). Each frame has a
 * `path`; the tile URL is assembled as:
 *
 *   {host}{path}/{size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
 *
 * No API key is required. The public service is rate-limited, so callers
 * load the index once and cache tile layers while the panel is mounted.
 */

const RAINVIEWER_INDEX = "https://api.rainviewer.com/public/weather-maps.json";

/** Official RainViewer raster basemap; unlike CARTO's legacy public URL, it
 * does not return an "API KEY REQUIRED" watermark tile. */
export const RAINVIEWER_BASEMAP_URL =
  "https://maps.rainviewer.com/styles/m2_dark/256/{z}/{x}/{y}.png";

export const RAINVIEWER_ATTRIBUTION =
  'Basemap &amp; weather data <a href="https://www.rainviewer.com/">RainViewer</a>';

export type RadarFrame = {
  /** Unix seconds. */
  time: number;
  /** Tile path fragment, e.g. "/v2/radar/1700000000". */
  path: string;
  /** True only for legacy providers that still return future frames. */
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
 * RainViewer discontinued every free color scheme except Universal Blue
 * (scheme 2) in 2026.
 */
export function radarTileUrl(
  host: string,
  frame: RadarFrame,
  opts?: { size?: 256 | 512; color?: number; smooth?: boolean; snow?: boolean },
): string {
  const size = opts?.size ?? 256;
  const color = opts?.color ?? 2;
  const smooth = opts?.smooth === false ? 0 : 1;
  const snow = opts?.snow === false ? 0 : 1;
  return `${host}${frame.path}/${size}/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`;
}

/** Representative stops from RainViewer's Universal Blue scale. */
export const RADAR_LEGEND_STOPS = [
  { color: "#88ddee", label: "Light" },
  { color: "#00a3e0", label: "" },
  { color: "#005588", label: "Moderate" },
  { color: "#ffaa00", label: "" },
  { color: "#c10000", label: "Heavy" },
];
