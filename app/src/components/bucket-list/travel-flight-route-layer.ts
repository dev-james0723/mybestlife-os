import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
} from "leaflet";

import {
  buildFlightArcPoints,
  buildScreenArcCache,
  FLIGHT_LOOP_BASE_SPEED,
  FLIGHT_LOOP_MAX_SPEED,
  FLIGHT_LOOP_MIN_SPEED,
  positionOnScreenArc,
  snapContainerPointToArc,
  type ScreenArcCache,
} from "@/lib/bucket-list/travel-route-arc";
import type { TravelMapRoute } from "./travel-google-map-inner";

/** ✈️ at rotate(0) points upper-right (~−45° from east on screen). */
const PLANE_EMOJI_BASE_SCREEN_DEG = -45;
const ROUTE_DASH = "8 10";
const ROUTE_DASH_CYCLE = 36;
const ROUTE_LINE_CLASS = "travel-flight-route-line";
const HEADING_SMOOTH_ALPHA = 0.1;
const HEADING_MIN_MOVE_PX = 1.25;

export type FlightRouteRuntime = {
  routeId: string;
  arcPoints: [number, number][];
  screenCache: ScreenArcCache;
  progress: number;
  speed: number;
  displayHeadingDeg: number;
  lastScreenX: number | null;
  lastScreenY: number | null;
  isDragging: boolean;
  polyline: LeafletPolyline;
  marker: LeafletMarker;
  dashPhase: number;
  lastDragAt: number | null;
  lastDragProgress: number | null;
};

function createPlaneIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "travel-flight-plane-icon",
    html: `<div class="travel-flight-plane" aria-hidden="true">✈️</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function planeElement(marker: LeafletMarker): HTMLElement | null {
  const root = marker.getElement();
  if (!root) return null;
  return root.querySelector<HTMLElement>(".travel-flight-plane");
}

function applyPlaneHeading(marker: LeafletMarker, headingDeg: number) {
  const el = planeElement(marker);
  if (el) {
    el.style.transform = `rotate(${headingDeg.toFixed(2)}deg)`;
  }
}

function smoothHeading(current: number, target: number, alpha: number): number {
  let diff = target - current;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  if (Math.abs(diff) < 0.2) return target;
  return current + diff * alpha;
}

function headingFromScreenDelta(dx: number, dy: number): number | null {
  if (Math.hypot(dx, dy) < HEADING_MIN_MOVE_PX) return null;
  const screenDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return screenDeg - PLANE_EMOJI_BASE_SCREEN_DEG;
}

function rebuildScreenCache(map: LeafletMap, state: FlightRouteRuntime) {
  state.screenCache = buildScreenArcCache(map, state.arcPoints);
  state.lastScreenX = null;
  state.lastScreenY = null;
}

export function rebuildAllScreenArcCaches(
  map: LeafletMap,
  runtimeRef: Map<string, FlightRouteRuntime>,
) {
  for (const state of runtimeRef.values()) {
    rebuildScreenCache(map, state);
    if (!state.isDragging) {
      const pos = positionOnScreenArc(map, state.screenCache, state.progress);
      state.marker.setLatLng([pos.lat, pos.lng]);
      state.lastScreenX = pos.x;
      state.lastScreenY = pos.y;
    }
  }
}

function routeLineStyle(route: TravelMapRoute) {
  const color = route.completed ? "#f472b6" : "#c8e53a";
  return {
    color,
    weight: route.completed ? 2 : 2.25,
    opacity: route.completed ? 0.55 : 0.42,
    dashArray: ROUTE_DASH,
    className: route.completed
      ? `${ROUTE_LINE_CLASS} ${ROUTE_LINE_CLASS}--completed`
      : ROUTE_LINE_CLASS,
    lineCap: "round" as const,
    lineJoin: "round" as const,
  };
}

function applyRouteDashOffset(polyline: LeafletPolyline, phase: number) {
  const path = polyline.getElement() as SVGPathElement | null | undefined;
  if (!path) return;
  path.style.strokeDashoffset = `${-(phase % ROUTE_DASH_CYCLE)}`;
}

function seedHeadingFromArc(
  map: LeafletMap,
  state: FlightRouteRuntime,
  progress: number,
) {
  const pos = positionOnScreenArc(map, state.screenCache, progress);
  let forward = progress + 0.03;
  if (forward > 1) forward -= 1;
  const next = positionOnScreenArc(map, state.screenCache, forward);
  const heading = headingFromScreenDelta(next.x - pos.x, next.y - pos.y);
  if (heading != null) {
    state.displayHeadingDeg = heading;
    applyPlaneHeading(state.marker, state.displayHeadingDeg);
  }
  state.lastScreenX = pos.x;
  state.lastScreenY = pos.y;
}

function updateHeadingFromScreenMotion(
  state: FlightRouteRuntime,
  x: number,
  y: number,
  opts?: { snap?: boolean },
) {
  if (state.lastScreenX != null && state.lastScreenY != null) {
    const heading = headingFromScreenDelta(
      x - state.lastScreenX,
      y - state.lastScreenY,
    );
    if (heading != null) {
      state.displayHeadingDeg = opts?.snap
        ? heading
        : smoothHeading(state.displayHeadingDeg, heading, HEADING_SMOOTH_ALPHA);
      applyPlaneHeading(state.marker, state.displayHeadingDeg);
    }
  }
  state.lastScreenX = x;
  state.lastScreenY = y;
}

function applyDragSnap(
  map: LeafletMap,
  state: FlightRouteRuntime,
  containerX: number,
  containerY: number,
) {
  const snapped = snapContainerPointToArc(
    map,
    state.arcPoints,
    containerX,
    containerY,
  );
  state.progress = snapped.progress;
  const pos = positionOnScreenArc(map, state.screenCache, state.progress);
  state.marker.setLatLng([pos.lat, pos.lng]);
  updateHeadingFromScreenMotion(state, pos.x, pos.y, { snap: true });

  const now = performance.now();
  if (state.lastDragAt != null && state.lastDragProgress != null) {
    const dt = (now - state.lastDragAt) / 1000;
    if (dt > 0.03) {
      let delta = state.progress - state.lastDragProgress;
      if (delta > 0.5) delta -= 1;
      if (delta < -0.5) delta += 1;
      const dragSpeed = Math.abs(delta / dt);
      state.speed = Math.min(
        FLIGHT_LOOP_MAX_SPEED,
        Math.max(FLIGHT_LOOP_MIN_SPEED, dragSpeed),
      );
      state.lastDragAt = now;
      state.lastDragProgress = state.progress;
    }
  }
}

function updatePlaneMarker(
  map: LeafletMap,
  state: FlightRouteRuntime,
  opts?: { snapHeading?: boolean },
) {
  const pos = positionOnScreenArc(map, state.screenCache, state.progress);
  state.marker.setLatLng([pos.lat, pos.lng]);
  if (opts?.snapHeading) {
    seedHeadingFromArc(map, state, state.progress);
  } else {
    updateHeadingFromScreenMotion(state, pos.x, pos.y);
  }
}

export function syncFlightRoutes(
  L: typeof import("leaflet"),
  map: LeafletMap,
  routes: TravelMapRoute[],
  runtimeRef: Map<string, FlightRouteRuntime>,
) {
  const nextIds = new Set(routes.map((r) => r.id));

  for (const [id, state] of runtimeRef) {
    if (!nextIds.has(id)) {
      state.polyline.remove();
      state.marker.remove();
      runtimeRef.delete(id);
    }
  }

  for (const route of routes) {
    const arcPoints = buildFlightArcPoints(route.from, route.to);
    const existing = runtimeRef.get(route.id);

    if (existing) {
      existing.arcPoints = arcPoints;
      existing.polyline.setLatLngs(arcPoints);
      existing.polyline.setStyle(routeLineStyle(route));
      rebuildScreenCache(map, existing);
      applyRouteDashOffset(existing.polyline, existing.dashPhase);
      if (!existing.isDragging) {
        updatePlaneMarker(map, existing, { snapHeading: true });
      }
      continue;
    }

    const polyline = L.polyline(arcPoints, routeLineStyle(route)).addTo(map);
    const screenCache = buildScreenArcCache(map, arcPoints);
    const initial = positionOnScreenArc(map, screenCache, 0);

    const marker = L.marker([initial.lat, initial.lng], {
      icon: createPlaneIcon(L),
      draggable: true,
      autoPan: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map);

    const state: FlightRouteRuntime = {
      routeId: route.id,
      arcPoints,
      screenCache,
      progress: 0,
      speed: FLIGHT_LOOP_BASE_SPEED,
      displayHeadingDeg: 0,
      lastScreenX: null,
      lastScreenY: null,
      isDragging: false,
      polyline,
      marker,
      dashPhase: 0,
      lastDragAt: null,
      lastDragProgress: null,
    };

    applyRouteDashOffset(polyline, state.dashPhase);
    updatePlaneMarker(map, state, { snapHeading: true });

    marker.on("dragstart", () => {
      state.isDragging = true;
      state.lastDragAt = performance.now();
      state.lastDragProgress = state.progress;
      map.dragging.disable();
      const pt = map.latLngToContainerPoint(marker.getLatLng());
      applyDragSnap(map, state, pt.x, pt.y);
    });

    marker.on("drag", () => {
      const pt = map.latLngToContainerPoint(marker.getLatLng());
      applyDragSnap(map, state, pt.x, pt.y);
    });

    marker.on("dragend", () => {
      const pt = map.latLngToContainerPoint(marker.getLatLng());
      applyDragSnap(map, state, pt.x, pt.y);
      state.isDragging = false;
      state.lastDragAt = null;
      state.lastDragProgress = null;
      map.dragging.enable();
      state.speed = Math.min(
        FLIGHT_LOOP_MAX_SPEED,
        Math.max(FLIGHT_LOOP_MIN_SPEED, state.speed),
      );
    });

    runtimeRef.set(route.id, state);
  }
}

export function clearFlightRoutes(
  _map: LeafletMap | null,
  runtimeRef: Map<string, FlightRouteRuntime>,
) {
  for (const state of runtimeRef.values()) {
    state.polyline.remove();
    state.marker.remove();
  }
  runtimeRef.clear();
}

export function tickRouteDashAnimation(
  runtimeRef: Map<string, FlightRouteRuntime>,
  deltaSeconds: number,
) {
  const step = deltaSeconds * 24;
  for (const state of runtimeRef.values()) {
    state.dashPhase = (state.dashPhase + step) % ROUTE_DASH_CYCLE;
    applyRouteDashOffset(state.polyline, state.dashPhase);
  }
}

export function tickFlightRoutes(
  map: LeafletMap,
  runtimeRef: Map<string, FlightRouteRuntime>,
  deltaSeconds: number,
) {
  for (const state of runtimeRef.values()) {
    if (state.isDragging) continue;

    const prevProgress = state.progress;
    state.progress += state.speed * deltaSeconds;
    if (state.progress >= 1) {
      state.progress %= 1;
      if (prevProgress < 1) {
        state.lastScreenX = null;
        state.lastScreenY = null;
      }
    }

    updatePlaneMarker(map, state);
  }
}
