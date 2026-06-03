/**
 * Sensor fusion: pick the best active source and (later) fuse multiple readings.
 *
 * Phase 1 implements the fallback selection policy (fully tested) and a trivial
 * single-source passthrough. Stereo/depth fusion plugs in later behind the same
 * `selectBestSource` seam so the runtime always degrades gracefully to the best
 * available single source.
 */

import type { AirTouchReading, SourceHealth } from "./types";
import type { OSBuddyAirControlQuality } from "../os-buddy-air-control-types";

/** Higher rank = more trustworthy sensor family when quality is comparable. */
const SENSOR_MODE_RANK: Record<SourceHealth["sensorMode"], number> = {
  depth: 5,
  stereo: 4,
  "phone-ar": 3,
  "phone-rgb": 2,
  "rgb-webcam": 1,
  "fallback-2d": 0,
};

const QUALITY_RANK: Record<OSBuddyAirControlQuality, number> = {
  good: 3,
  ok: 2,
  poor: 1,
  uncalibrated: 0,
};

/** Max age (ms) before a source is considered stale and skipped. */
export const SOURCE_STALE_MS = 180;

/**
 * Choose the best source id given health snapshots and the current time.
 * Stale sources are excluded. Ranking: quality, then sensor family, then
 * confidence, then recency. Returns null when every source is stale/empty.
 */
export function selectBestSource(
  sources: SourceHealth[],
  now: number,
  staleMs = SOURCE_STALE_MS,
): string | null {
  const fresh = sources.filter((s) => now - s.lastSampleAt <= staleMs);
  if (fresh.length === 0) return null;

  let best = fresh[0];
  for (const candidate of fresh.slice(1)) {
    if (compareHealth(candidate, best) > 0) best = candidate;
  }
  return best.sourceId;
}

function compareHealth(a: SourceHealth, b: SourceHealth): number {
  const q = QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality];
  if (q !== 0) return q;
  const mode = SENSOR_MODE_RANK[a.sensorMode] - SENSOR_MODE_RANK[b.sensorMode];
  if (mode !== 0) return mode;
  const conf = a.confidence - b.confidence;
  if (Math.abs(conf) > 1e-6) return conf;
  return a.lastSampleAt - b.lastSampleAt;
}

/**
 * Fuse readings into a single reading. Phase 1 = passthrough of the highest
 * confidence reading (single-source). The seam stays stable for true stereo/depth
 * fusion (e.g. averaging triangulated fingertips) added later.
 */
export function fuseReadings(readings: AirTouchReading[]): AirTouchReading | null {
  if (readings.length === 0) return null;
  let best = readings[0];
  for (const reading of readings.slice(1)) {
    if (reading.confidence > best.confidence) best = reading;
  }
  return best;
}
