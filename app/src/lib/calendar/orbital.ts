/**
 * Orbital layout math — deterministic, pure, no DOM access.
 *
 * Given "today" and a list of surrounding dates + their CalendarItems,
 * computes stable ellipse parameters for each bubble so the view renders
 * identically across renders (no jitter) while the animation layer
 * (`useOrbitalAnimation`) drives angular progression per frame.
 *
 * Orbits sit on a 1000x1000 SVG viewbox centered on (500, 500). Bubbles
 * closer to today orbit on smaller ellipses and revolve slightly faster
 * (loose approximation of Kepler — shorter period = smaller orbit).
 *
 * Determinism: all "randomness" is seeded from the date string so the
 * same day always produces the same layout. This matters because the
 * animation loop re-reads these parameters on every frame.
 */

import {
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type {
  CalendarItem,
  OrbitalCenter,
  OrbitalDay,
  OrbitalLayout,
} from "./types";

/** Simple string hash → 32-bit int (xmur3-style). Deterministic. */
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Map hash → [0, 1). */
function seedRand(seed: number, salt: number): number {
  const h = Math.imul(seed ^ salt, 2654435761) >>> 0;
  return h / 0x100000000;
}

const CENTER_SIZE = 150;
// Rings placed so even on the tightest phase, bubbles on adjacent rings
// never kiss (gap ≥ max bubble radius on the outer ring).
const BASE_RADIUS = 235;
const RADIUS_STEP = 115;
/** Minimum centre-to-centre clearance between two bubbles, as a fraction
 *  of the SUM of their radii. 1.0 = tangent; > 1 = guaranteed gap. */
const MIN_CLEARANCE = 1.35;

/**
 * Compute the orbital layout for `today` and `days` (ordered by date).
 *
 * Bubbles are binned into concentric rings by temporal proximity; per-bubble
 * ellipses sit on those rings with small eccentricity for organic feel. The
 * initial phase is chosen so bubbles on the same ring are evenly spread —
 * no "stitched together" clusters. Inter-ring clearance is enforced by the
 * ring spacing (`RADIUS_STEP`) relative to the largest bubble radius, so
 * bubbles on adjacent rings are always separated even at crossing phase.
 *
 * Stable across renders: all "randomness" is seeded from the date string.
 */
export function computeOrbitalLayout(
  today: Date,
  days: Array<{ date: string; items: CalendarItem[] }>
): OrbitalLayout {
  const todayIso = format(today, "yyyy-MM-dd");

  const centerDay = days.find((d) => d.date === todayIso);
  const center: OrbitalCenter = {
    date: todayIso,
    items: centerDay?.items ?? [],
  };

  const surrounding = days
    .filter((d) => d.date !== todayIso)
    .map((d) => {
      const parsed = parseISO(d.date);
      const distance = differenceInCalendarDays(parsed, today);
      return { ...d, distance };
    })
    // Preserve temporal order so evenly-spaced phase-assignment below
    // yields a logical clockwise timeline around the center.
    .sort((a, b) => a.distance - b.distance);

  // Bin into rings by proximity. Keep ring-1 uncrowded so it reads as
  // "this week" clearly.
  type Binned = (typeof surrounding)[number] & { ring: number };
  const binned: Binned[] = surrounding.map((d) => {
    const abs = Math.abs(d.distance);
    const ring = abs <= 2 ? 1 : abs <= 5 ? 2 : 3;
    return { ...d, ring };
  });

  // Group by ring so we can assign evenly-spread phases within each ring.
  const byRing = new Map<number, Binned[]>();
  for (const b of binned) {
    const arr = byRing.get(b.ring) ?? [];
    arr.push(b);
    byRing.set(b.ring, arr);
  }

  const orbitDays: OrbitalDay[] = [];
  for (const [ring, members] of byRing) {
    const n = members.length;
    const baseR = BASE_RADIUS + (ring - 1) * RADIUS_STEP;

    // A per-ring phase jitter so the entire ring doesn't line up exactly
    // with ring-above's phase, but it's ring-wide (not per-bubble) so
    // inter-bubble spacing stays uniform.
    const ringSeed = hashString(`ring:${ring}:${members.map((m) => m.date).join(",")}`);
    const ringPhaseOffset = seedRand(ringSeed, 1) * Math.PI * 2;

    members.forEach((d, i) => {
      const seed = hashString(d.date);
      const absDistance = Math.abs(d.distance);

      // Size decreases with temporal distance — clamped so the smallest
      // bubble still has room for "Apr 29" label.
      const size = Math.max(62, CENTER_SIZE - 32 - absDistance * 5);

      // Mild per-bubble eccentricity, but shared enough on the ring
      // that crossings don't collapse the spacing.
      const ecc = 0.92 + seedRand(seed, 1) * 0.14; // 0.92..1.06
      const radius_x = baseR * ecc;
      const radius_y = baseR * (2 - ecc); // mirror so avg stays ≈ baseR

      // EVENLY spread initial phases around the ring, then add ring-wide
      // offset. This prevents bubbles from stacking on top of each other.
      const angle = ringPhaseOffset + (i / Math.max(n, 1)) * Math.PI * 2;

      // Period: inner rings revolve a bit faster (Kepler-lite).
      const basePeriod = 85_000 + seedRand(seed, 3) * 35_000; // 85–120s
      const period_ms = Math.round(basePeriod * Math.sqrt(ring));

      // Direction: per RING, not per bubble — bubbles on the same ring
      // moving in opposite directions would pass and briefly overlap.
      // All bubbles on a ring share direction so spacing is preserved.
      const direction: 1 | -1 = ring % 2 === 0 ? 1 : -1;

      orbitDays.push({
        date: d.date,
        distance_from_today: d.distance,
        size,
        angle,
        radius_x,
        radius_y,
        period_ms,
        direction,
        items: d.items,
      });
    });
  }

  // Sort for stable rendering order (outer rings first → inner on top).
  orbitDays.sort((a, b) => b.radius_x - a.radius_x);

  return { center, days: orbitDays };
}

/**
 * Minimum safe centre gap between two bubbles on the same ring.
 * Exposed for tests / dev-only layout asserts.
 */
export function minCenterGap(a: number, b: number): number {
  return ((a + b) / 2) * MIN_CLEARANCE;
}

/**
 * Convert an orbital day's current angle into an (x, y) pair on the
 * 1000x1000 viewbox. Call this per frame in the animation loop.
 */
export function orbitalPosition(
  day: OrbitalDay,
  currentAngle: number,
  cx = 500,
  cy = 500
): { x: number; y: number } {
  const a = currentAngle;
  return {
    x: cx + day.radius_x * Math.cos(a),
    y: cy + day.radius_y * Math.sin(a),
  };
}
