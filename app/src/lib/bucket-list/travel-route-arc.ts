import type { Map as LeafletMap } from "leaflet";

export type LatLng = { lat: number; lng: number };

/** Leaflet map methods used by flight arc screen projection. */
export type TravelRouteLeafletMap = Pick<
  LeafletMap,
  "latLngToContainerPoint" | "containerPointToLatLng"
>;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toCartesian(lat: number, lng: number) {
  const phi = lat * DEG;
  const lam = lng * DEG;
  return {
    x: Math.cos(phi) * Math.cos(lam),
    y: Math.cos(phi) * Math.sin(lam),
    z: Math.sin(phi),
  };
}

function toLatLng(x: number, y: number, z: number): LatLng {
  const hyp = Math.sqrt(x * x + y * y);
  return {
    lat: Math.atan2(z, hyp) * RAD,
    lng: Math.atan2(y, x) * RAD,
  };
}

/** Spherical linear interpolation between two coordinates. */
export function slerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  const p = toCartesian(a.lat, a.lng);
  const q = toCartesian(b.lat, b.lng);
  const dot = clamp(p.x * q.x + p.y * q.y + p.z * q.z, -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-6) {
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    };
  }
  const sinOmega = Math.sin(omega);
  const w1 = Math.sin((1 - t) * omega) / sinOmega;
  const w2 = Math.sin(t * omega) / sinOmega;
  return toLatLng(
    w1 * p.x + w2 * q.x,
    w1 * p.y + w2 * q.y,
    w1 * p.z + w2 * q.z,
  );
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const lat1 = a.lat * DEG;
  const lat2 = b.lat * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function initialBearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = a.lat * DEG;
  const lat2 = b.lat * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * RAD) + 360) % 360;
}

/** Offset a point by distance (km) along a bearing (degrees). */
export function offsetLatLng(
  point: LatLng,
  bearingDeg: number,
  distanceKm: number,
): LatLng {
  const angular = distanceKm / EARTH_RADIUS_KM;
  const bearing = bearingDeg * DEG;
  const lat1 = point.lat * DEG;
  const lng1 = point.lng * DEG;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: lat2 * RAD, lng: lng2 * RAD };
}

function quadraticBezier(a: LatLng, c: LatLng, b: LatLng, t: number): LatLng {
  const u = 1 - t;
  return {
    lat: u * u * a.lat + 2 * u * t * c.lat + t * t * b.lat,
    lng: u * u * a.lng + 2 * u * t * c.lng + t * t * b.lng,
  };
}

/** Curved flight path from origin to destination (great-circle arc with visual bulge). */
export function buildFlightArcPoints(
  from: LatLng,
  to: LatLng,
  segmentCount = 128,
): [number, number][] {
  const distanceKm = haversineKm(from, to);
  const bulgeKm = clamp(distanceKm * 0.14, 40, 1200);
  const mid = slerpLatLng(from, to, 0.5);
  const bearing = initialBearingDeg(from, to);
  const control = offsetLatLng(mid, bearing + 90, bulgeKm);

  const points: [number, number][] = [];
  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const p = quadraticBezier(from, control, to, t);
    points.push([p.lat, p.lng]);
  }
  return points;
}

function segmentLengthKm(a: [number, number], b: [number, number]): number {
  return haversineKm({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
}

/** Cumulative arc length fractions (same length as `points`). */
function buildCumulativeProgress(points: [number, number][]): number[] {
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += segmentLengthKm(points[i - 1]!, points[i]!);
    cumulative.push(total);
  }
  if (total <= 0) {
    return points.map((_, i) => i / Math.max(1, points.length - 1));
  }
  return cumulative.map((d) => d / total);
}

export function positionOnArc(
  points: [number, number][],
  progress: number,
): { lat: number; lng: number; bearingDeg: number } {
  if (points.length === 0) {
    return { lat: 0, lng: 0, bearingDeg: 0 };
  }
  if (points.length === 1) {
    return { lat: points[0]![0], lng: points[0]![1], bearingDeg: 0 };
  }

  const t =
    progress >= 1 ? 1 : progress <= 0 ? 0 : ((progress % 1) + 1) % 1;
  const cumulative = buildCumulativeProgress(points);

  let idx = cumulative.findIndex((c) => c >= t);
  if (idx <= 0) idx = 1;
  const t0 = cumulative[idx - 1]!;
  const t1 = cumulative[idx]!;
  const segT = t1 > t0 ? (t - t0) / (t1 - t0) : 0;

  const a = points[idx - 1]!;
  const b = points[idx]!;
  const lat = a[0] + (b[0] - a[0]) * segT;
  const lng = a[1] + (b[1] - a[1]) * segT;
  const bearingDeg = initialBearingDeg(
    { lat: a[0], lng: a[1] },
    { lat: b[0], lng: b[1] },
  );

  return { lat, lng, bearingDeg };
}

/** Nearest progress [0,1] on the arc for a dragged marker position. */
export function progressFromLatLng(
  points: [number, number][],
  lat: number,
  lng: number,
): number {
  if (points.length < 2) return 0;

  const cumulative = buildCumulativeProgress(points);
  let bestDist = Infinity;
  let bestProgress = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segLen = segmentLengthKm(a, b);
    if (segLen <= 0) continue;

    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];

    const dx = bx - ax;
    const dy = by - ay;
    const rawT =
      ((lat - ax) * dx + (lng - ay) * dy) / (dx * dx + dy * dy + 1e-12);
    const t = clamp(rawT, 0, 1);
    const px = ax + dx * t;
    const py = ay + dy * t;
    const dist = haversineKm({ lat, lng }, { lat: px, lng: py });

    if (dist < bestDist) {
      bestDist = dist;
      const segStart = cumulative[i - 1]!;
      const segEnd = cumulative[i]!;
      bestProgress = segStart + (segEnd - segStart) * t;
    }
  }

  return clamp(bestProgress, 0, 1);
}

function projectToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { t: number; distSq: number; x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const rawT =
    lenSq > 1e-12
      ? ((px - ax) * dx + (py - ay) * dy) / lenSq
      : 0;
  const t = clamp(rawT, 0, 1);
  const x = ax + dx * t;
  const y = ay + dy * t;
  const distSq = (px - x) ** 2 + (py - y) ** 2;
  return { t, distSq, x, y };
}

/** Lock a map click/drag position to the nearest point on the flight arc. */
export function snapToArc(
  points: [number, number][],
  lat: number,
  lng: number,
): { lat: number; lng: number; progress: number } {
  const progress = progressFromLatLng(points, lat, lng);
  const { lat: snappedLat, lng: snappedLng } = positionOnArc(points, progress);
  return { lat: snappedLat, lng: snappedLng, progress };
}

/** Screen-space snap — matches what the user sees on the curved line. */
export function snapContainerPointToArc(
  map: TravelRouteLeafletMap,
  points: [number, number][],
  x: number,
  y: number,
): { lat: number; lng: number; progress: number } {
  if (points.length < 2) {
    const p = points[0] ?? [0, 0];
    return { lat: p[0], lng: p[1], progress: 0 };
  }

  const cumulative = buildCumulativeProgress(points);
  let bestDistSq = Infinity;
  let bestProgress = 0;
  let bestX = x;
  let bestY = y;

  for (let i = 1; i < points.length; i++) {
    const a = map.latLngToContainerPoint(points[i - 1]!);
    const b = map.latLngToContainerPoint(points[i]!);
    const hit = projectToSegment(x, y, a.x, a.y, b.x, b.y);
    if (hit.distSq < bestDistSq) {
      bestDistSq = hit.distSq;
      bestX = hit.x;
      bestY = hit.y;
      const segStart = cumulative[i - 1]!;
      const segEnd = cumulative[i]!;
      bestProgress = segStart + (segEnd - segStart) * hit.t;
    }
  }

  const latlng = map.containerPointToLatLng([bestX, bestY]);
  return {
    lat: latlng.lat,
    lng: latlng.lng,
    progress: clamp(bestProgress, 0, 1),
  };
}

export type ScreenArcCache = {
  screenPoints: { x: number; y: number }[];
  cumulative: number[];
};

/** Screen-space polyline matching what Leaflet draws (removes geo/screen drift). */
export function buildScreenArcCache(
  map: TravelRouteLeafletMap,
  arcPoints: [number, number][],
): ScreenArcCache {
  const screenPoints = arcPoints.map((p) => map.latLngToContainerPoint(p));
  const cumulative: number[] = [0];
  let total = 0;

  for (let i = 1; i < screenPoints.length; i++) {
    const a = screenPoints[i - 1]!;
    const b = screenPoints[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
    cumulative.push(total);
  }

  if (total <= 0) {
    return {
      screenPoints,
      cumulative: arcPoints.map((_, i) => i / Math.max(1, arcPoints.length - 1)),
    };
  }

  return { screenPoints, cumulative: cumulative.map((d) => d / total) };
}

export function positionOnScreenArc(
  map: TravelRouteLeafletMap,
  cache: ScreenArcCache,
  progress: number,
): { lat: number; lng: number; x: number; y: number } {
  if (cache.screenPoints.length === 0) {
    return { lat: 0, lng: 0, x: 0, y: 0 };
  }
  if (cache.screenPoints.length === 1) {
    const p = cache.screenPoints[0]!;
    const ll = map.containerPointToLatLng([p.x, p.y]);
    return { lat: ll.lat, lng: ll.lng, x: p.x, y: p.y };
  }

  const t =
    progress >= 1 ? 1 : progress <= 0 ? 0 : ((progress % 1) + 1) % 1;

  let idx = 1;
  while (idx < cache.cumulative.length && cache.cumulative[idx]! < t) {
    idx += 1;
  }
  if (idx >= cache.cumulative.length) idx = cache.cumulative.length - 1;

  const t0 = cache.cumulative[idx - 1]!;
  const t1 = cache.cumulative[idx]!;
  const segT = t1 > t0 ? (t - t0) / (t1 - t0) : 0;

  const a = cache.screenPoints[idx - 1]!;
  const b = cache.screenPoints[idx]!;
  const x = a.x + (b.x - a.x) * segT;
  const y = a.y + (b.y - a.y) * segT;
  const latlng = map.containerPointToLatLng([x, y]);

  return { lat: latlng.lat, lng: latlng.lng, x, y };
}

export const FLIGHT_LOOP_BASE_SPEED = 0.035;
export const FLIGHT_LOOP_MIN_SPEED = 0.012;
export const FLIGHT_LOOP_MAX_SPEED = 0.22;
