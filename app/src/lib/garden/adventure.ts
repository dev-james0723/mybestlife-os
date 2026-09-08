import { daySeed, distance, gardenDay, seededRandom, type Point } from "./game";

/** One deterministic, renderer-independent owner for Garden's interactive world. */
export type AdventurePhase = "ready" | "playing" | "paused";
export type BedStage = "empty" | "planted" | "growing" | "ripe" | "harvested";
export type AdventureAction =
  | `plant:${number}`
  | `water:${number}`
  | `harvest:${number}`
  | `forage:${number}`
  | `discover:${string}`
  | "butterfly"
  | "deliver";
export type AdventureFeedback =
  | "plant"
  | "water"
  | "harvest"
  | "forage"
  | "refill"
  | "discover"
  | "deliver"
  | "dash"
  | "trail-start"
  | "trail-stop"
  | "trail-won"
  | "trail-failed"
  | "need-water"
  | "growing"
  | "need-basket"
  | "cancelled";
export type AdventureEvent = {
  seq: number;
  kind: AdventureFeedback;
  at: Point;
  action?: AdventureAction;
};
export type AdventureInput = {
  x: number;
  z: number;
  yaw: number;
  interact?: boolean;
  dash?: boolean;
};
export type Bed = Point & { id: number; stage: BedStage; growth: number };
export type Forage = Point & {
  id: number;
  kind: "apple" | "mushroom" | "berry";
  collected: boolean;
};
export type AdventureTarget = {
  kind: "bed" | "well" | "forage" | "landmark" | "home" | "butterfly";
  id: string;
  point: Point;
};
export type AdventureState = {
  day: string;
  phase: AdventurePhase;
  elapsed: number;
  revision: number;
  player: Point & {
    vx: number;
    vz: number;
    facing: number;
    dash: number;
    cooldown: number;
  };
  buddy: Point & { facing: number };
  target: Point | null;
  waypoints: Point[];
  nearby: AdventureTarget | null;
  beds: Bed[];
  forage: Forage[];
  water: number;
  discoveries: string[];
  trail: {
    phase: "idle" | "following" | "won" | "failed";
    index: number;
    elapsed: number;
    timed: boolean;
    stops: Point[];
    best: number | null;
  };
  action: { target: AdventureTarget; elapsed: number; duration: number } | null;
  earned: AdventureAction[];
  delivered: boolean;
  events: AdventureEvent[];
  eventSeq: number;
};

export const ADVENTURE = {
  speed: 4.2,
  dashSpeed: 9,
  dashDuration: 0.24,
  dashCooldown: 1.5,
  acceleration: 24,
  radiusX: 15.1,
  radiusZ: 12.8,
  playerRadius: 0.32,
  reach: 1.65,
  growthSeconds: 16,
  trailSeconds: 38,
  waterCapacity: 3,
} as const;
export const HOME: Point = { x: 0, z: 6.8 };
export const WELL: Point = { x: 6.5, z: 1.1 };
export const ADVENTURE_POND = { x: 8.5, z: -0.8, radius: 2.4 };
export const BED_SPOTS: Point[] = [
  { x: -4.2, z: 4.8 },
  { x: -6.8, z: -1.5 },
  { x: 2.6, z: -4.5 },
];
export const LANDMARKS = [
  { id: "pond", x: 10.1, z: 3.5 },
  { id: "orchard", x: -7.4, z: -7.2 },
  { id: "lookout", x: 4.8, z: -9.3 },
] as const;
export const TRAIL_START: Point = { x: -1.7, z: -6.4 };
export const COLLIDERS = [
  ADVENTURE_POND,
  { x: -9.8, z: -5.8, radius: 0.65 },
  { x: -5.4, z: -9.7, radius: 0.6 },
  { x: 7.9, z: -7.1, radius: 0.8 },
  { x: 12.3, z: 6.1, radius: 0.55 },
  { x: -11.3, z: 3.2, radius: 0.6 },
  { x: -1.8, z: 11.2, radius: 0.6 },
];

export function createAdventure(
  day = gardenDay(),
  earned: AdventureAction[] = [],
): AdventureState {
  const rng = seededRandom(daySeed(day));
  const forageSpots = [
    { x: -8.2, z: -5.8 },
    { x: -5, z: -7 },
    { x: 3.2, z: -8 },
    { x: 9, z: 4.5 },
    { x: -11, z: 0.1 },
    { x: 3, z: 6.8 },
  ];
  const state: AdventureState = {
    day,
    phase: "ready",
    elapsed: 0,
    revision: 0,
    player: {
      x: HOME.x,
      z: HOME.z,
      vx: 0,
      vz: 0,
      facing: Math.PI,
      dash: 0,
      cooldown: 0,
    },
    buddy: { x: HOME.x + 1.1, z: HOME.z + 0.5, facing: Math.PI },
    target: null,
    waypoints: [],
    nearby: null,
    beds: BED_SPOTS.map((p, id) => ({ ...p, id, stage: "empty", growth: 0 })),
    forage: forageSpots.map((p, id) => ({
      id,
      x: p.x + (rng() - 0.5) * 0.6,
      z: p.z + (rng() - 0.5) * 0.6,
      kind: (["apple", "mushroom", "berry"] as const)[id % 3],
      collected: false,
    })),
    water: 2,
    discoveries: [],
    trail: {
      phase: "idle",
      index: 0,
      elapsed: 0,
      timed: false,
      best: null,
      stops: [
        { x: -0.5, z: -7.8 },
        { x: 3.7 + rng(), z: -6.6 },
        { x: 5.3, z: -9.4 },
      ],
    },
    action: null,
    earned: [],
    delivered: false,
    events: [],
    eventSeq: 0,
  };
  restoreAdventureFacts(state, earned);
  state.nearby = nearestAdventureTarget(state);
  return state;
}

/** Earned facts only ever merge; refetching cannot erase active or already-earned progress. */
export function restoreAdventureFacts(
  state: AdventureState,
  facts: AdventureAction[],
  wateredAt: Record<string, string> = {},
  now = 0,
): void {
  for (const fact of facts) {
    if (state.earned.includes(fact)) continue;
    state.earned.push(fact);
    const [kind, raw] = fact.split(":");
    const id = Number(raw);
    const bed = state.beds[id];
    if (kind === "plant" && bed?.stage === "empty") bed.stage = "planted";
    if (kind === "water" && bed && bed.stage !== "harvested") {
      const elapsed = (now - Date.parse(wateredAt[fact] ?? "")) / 1000;
      bed.growth = Number.isFinite(elapsed)
        ? Math.max(0, Math.min(ADVENTURE.growthSeconds, elapsed))
        : 0;
      bed.stage = bed.growth >= ADVENTURE.growthSeconds ? "ripe" : "growing";
    }
    if (kind === "harvest" && bed) bed.stage = "harvested";
    if (kind === "forage" && state.forage[id])
      state.forage[id].collected = true;
    if (
      kind === "discover" &&
      LANDMARKS.some((p) => p.id === raw) &&
      !state.discoveries.includes(raw)
    )
      state.discoveries.push(raw);
    if (fact === "butterfly") state.trail.phase = "won";
    if (fact === "deliver") state.delivered = true;
  }
  state.revision++;
}

function emit(
  state: AdventureState,
  kind: AdventureFeedback,
  at: Point,
  action?: AdventureAction,
) {
  if (action && !state.earned.includes(action)) state.earned.push(action);
  state.events.push({
    seq: ++state.eventSeq,
    kind,
    at: { x: at.x, z: at.z },
    action,
  });
  // The consumer drains every frame; bounded as a second line of defence.
  if (state.events.length > 30) state.events.shift();
  state.revision++;
}

export function boundAdventure(point: Point): Point {
  let x = point.x,
    z = point.z;
  const edge = Math.hypot(x / ADVENTURE.radiusX, z / ADVENTURE.radiusZ);
  if (edge > 1) {
    x /= edge;
    z /= edge;
  }
  for (const obstacle of COLLIDERS) {
    const dx = x - obstacle.x,
      dz = z - obstacle.z,
      length = Math.hypot(dx, dz);
    const radius = obstacle.radius + ADVENTURE.playerRadius;
    if (length < radius) {
      x = obstacle.x + (length ? dx / length : 1) * radius;
      z = obstacle.z + (length ? dz / length : 0) * radius;
    }
  }
  return { x, z };
}

export function nearestAdventureTarget(
  state: AdventureState,
): AdventureTarget | null {
  const choices: AdventureTarget[] = [
    ...state.beds
      .filter((b) => b.stage !== "harvested")
      .map((b) => ({ kind: "bed" as const, id: String(b.id), point: b })),
    ...state.forage
      .filter((f) => !f.collected)
      .map((f) => ({ kind: "forage" as const, id: String(f.id), point: f })),
    ...LANDMARKS.filter((p) => !state.discoveries.includes(p.id)).map((p) => ({
      kind: "landmark" as const,
      id: p.id,
      point: p,
    })),
    { kind: "well", id: "well", point: WELL },
    { kind: "home", id: "home", point: HOME },
    {
      kind: "butterfly",
      id: "butterfly",
      point:
        state.trail.phase === "following"
          ? state.trail.stops[state.trail.index]
          : TRAIL_START,
    },
  ];
  let closest: AdventureTarget | null = null;
  let best: number = ADVENTURE.reach;
  for (const target of choices) {
    const d = distance(state.player, target.point);
    if (d < best) {
      best = d;
      closest = target;
    }
  }
  return closest;
}

export function interactAdventure(state: AdventureState): void {
  if (state.phase !== "playing" || state.action) return;
  const target = nearestAdventureTarget(state);
  if (!target) return;
  if (target.kind === "bed") {
    const bed = state.beds[Number(target.id)];
    if (bed.stage === "growing") {
      emit(state, "growing", bed);
      return;
    }
    if (bed.stage === "planted" && state.water < 1) {
      emit(state, "need-water", bed);
      return;
    }
  }
  if (target.kind === "home" && !canDeliver(state)) {
    emit(state, "need-basket", HOME);
    return;
  }
  if (target.kind === "butterfly") {
    const trail = state.trail;
    if (trail.phase !== "following") {
      trail.phase = "following";
      trail.index = 0;
      trail.elapsed = 0;
      emit(state, "trail-start", TRAIL_START);
      return;
    }
    if (
      state.player.dash > 0 ||
      Math.hypot(state.player.vx, state.player.vz) > 3
    ) {
      trail.phase = "failed";
      emit(state, "trail-failed", target.point);
      return;
    }
  }
  state.target = null;
  state.action = {
    target,
    elapsed: 0,
    duration: target.kind === "forage" ? 0.38 : 0.75,
  };
  state.revision++;
}

export function canDeliver(state: AdventureState): boolean {
  return (
    !state.delivered &&
    state.beds.every((b) => b.stage === "harvested") &&
    state.forage.filter((f) => f.collected).length >= 3
  );
}
export function finishAdventureAction(state: AdventureState) {
  const target = state.action?.target;
  state.action = null;
  if (!target) return;
  switch (target.kind) {
    case "bed": {
      const bed = state.beds[Number(target.id)];
      if (bed.stage === "empty") {
        bed.stage = "planted";
        emit(state, "plant", bed, `plant:${bed.id}`);
      } else if (bed.stage === "planted" && state.water > 0) {
        bed.stage = "growing";
        bed.growth = 0;
        state.water--;
        emit(state, "water", bed, `water:${bed.id}`);
      } else if (bed.stage === "ripe") {
        bed.stage = "harvested";
        emit(state, "harvest", bed, `harvest:${bed.id}`);
      }
      break;
    }
    case "well":
      state.water = ADVENTURE.waterCapacity;
      emit(state, "refill", WELL);
      break;
    case "forage": {
      const forage = state.forage[Number(target.id)];
      if (!forage.collected) {
        forage.collected = true;
        emit(state, "forage", forage, `forage:${forage.id}`);
      }
      break;
    }
    case "landmark":
      if (!state.discoveries.includes(target.id)) {
        state.discoveries.push(target.id);
        emit(state, "discover", target.point, `discover:${target.id}`);
      }
      break;
    case "home":
      if (canDeliver(state)) {
        state.delivered = true;
        emit(state, "deliver", HOME, "deliver");
      }
      break;
    case "butterfly": {
      state.trail.index++;
      if (state.trail.index >= state.trail.stops.length) {
        state.trail.phase = "won";
        state.trail.index = state.trail.stops.length - 1;
        if (state.trail.timed)
          state.trail.best = Math.min(
            state.trail.best ?? Infinity,
            state.trail.elapsed,
          );
        emit(
          state,
          "trail-won",
          target.point,
          state.earned.includes("butterfly") ? undefined : "butterfly",
        );
      } else emit(state, "trail-stop", target.point);
      break;
    }
  }
  state.revision++;
}

/** Call at a fixed timestep. Delta clamps protect the boundary even for alternative consumers. */
export function stepAdventure(
  state: AdventureState,
  delta: number,
  input: AdventureInput,
): void {
  if (state.phase !== "playing") return;
  const dt = Math.min(0.05, Math.max(0, delta));
  state.elapsed += dt;
  const player = state.player;
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.dash = Math.max(0, player.dash - dt);
  let ix = input.x,
    iz = input.z;
  const inputLength = Math.hypot(ix, iz);
  if (inputLength > 1) {
    ix /= inputLength;
    iz /= inputLength;
  }
  let dx = ix * Math.cos(input.yaw) + iz * Math.sin(input.yaw);
  let dz = -ix * Math.sin(input.yaw) + iz * Math.cos(input.yaw);
  if (inputLength > 0.06) {
    state.target = null;
    state.waypoints = [];
  } else if (state.target) {
    const next = state.waypoints[0] ?? state.target;
    const length = distance(player, next);
    if (length < 0.15) {
      if (state.waypoints.length) state.waypoints.shift();
      else state.target = null;
    } else {
      dx = (next.x - player.x) / length;
      dz = (next.z - player.z) / length;
    }
  }
  const moving = Math.hypot(dx, dz) > 0.06;
  if (input.dash && player.cooldown === 0 && moving) {
    player.dash = ADVENTURE.dashDuration;
    player.cooldown = ADVENTURE.dashCooldown;
    emit(state, "dash", player);
  }
  if (moving && state.action) {
    state.action = null;
    emit(state, "cancelled", player);
  }
  const speed = player.dash > 0 ? ADVENTURE.dashSpeed : ADVENTURE.speed;
  const smoothing = 1 - Math.exp(-ADVENTURE.acceleration * dt);
  player.vx += (dx * speed - player.vx) * smoothing;
  player.vz += (dz * speed - player.vz) * smoothing;
  const moved = boundAdventure({
    x: player.x + player.vx * dt,
    z: player.z + player.vz * dt,
  });
  player.x = moved.x;
  player.z = moved.z;
  if (moving) player.facing = Math.atan2(dx, dz);
  const buddyGap = distance(state.buddy, player);
  if (buddyGap > 1.15) {
    const rate = Math.min(1, (buddyGap > 3 ? 6 : 3) * dt);
    state.buddy.facing = Math.atan2(
      player.x - state.buddy.x,
      player.z - state.buddy.z,
    );
    const next = boundAdventure({
      x: state.buddy.x + (player.x - state.buddy.x) * rate,
      z: state.buddy.z + (player.z - state.buddy.z) * rate,
    });
    state.buddy.x = next.x;
    state.buddy.z = next.z;
  }
  for (const bed of state.beds)
    if (bed.stage === "growing") {
      bed.growth += dt;
      if (bed.growth >= ADVENTURE.growthSeconds) {
        bed.stage = "ripe";
        state.revision++;
      }
    }
  if (state.trail.phase === "following") {
    state.trail.elapsed += dt;
    if (state.trail.timed && state.trail.elapsed >= ADVENTURE.trailSeconds) {
      state.trail.phase = "failed";
      state.action = null;
      emit(state, "trail-failed", player);
    }
  }
  if (input.interact) interactAdventure(state);
  if (state.action) {
    if (distance(player, state.action.target.point) > ADVENTURE.reach + 0.2) {
      state.action = null;
      emit(state, "cancelled", player);
    } else {
      state.action.elapsed += dt;
      if (state.action.elapsed >= state.action.duration)
        finishAdventureAction(state);
    }
  }
  const nearby = nearestAdventureTarget(state);
  if (nearby?.kind !== state.nearby?.kind || nearby?.id !== state.nearby?.id)
    state.revision++;
  state.nearby = nearby;
}

export function adventureSnapshot(state: AdventureState): AdventureState {
  return {
    ...state,
    player: { ...state.player },
    buddy: { ...state.buddy },
    beds: state.beds.map((b) => ({ ...b })),
    forage: state.forage.map((f) => ({ ...f })),
    discoveries: [...state.discoveries],
    earned: [...state.earned],
    trail: { ...state.trail },
    action: state.action ? { ...state.action } : null,
    events: [...state.events],
  };
}

/** Small visibility graph routes taps around pond/trunks; manual motion shares collision. */
export function navigateAdventure(
  state: AdventureState,
  destination: Point,
): void {
  const end = boundAdventure(destination),
    nodes = [{ x: state.player.x, z: state.player.z }, end];
  for (const obstacle of COLLIDERS)
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        r =
          (obstacle.radius + ADVENTURE.playerRadius + 0.12) /
          Math.cos(Math.PI / 12);
      const p = {
        x: obstacle.x + Math.cos(a) * r,
        z: obstacle.z + Math.sin(a) * r,
      };
      if (Math.hypot(p.x / ADVENTURE.radiusX, p.z / ADVENTURE.radiusZ) < 0.99)
        nodes.push(p);
    }
  function clear(a: Point, b: Point) {
    const dx = b.x - a.x,
      dz = b.z - a.z,
      square = dx * dx + dz * dz;
    return COLLIDERS.every((o) => {
      const t = square
        ? Math.max(
            0,
            Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / square),
          )
        : 0;
      return (
        Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) >=
        o.radius + ADVENTURE.playerRadius - 0.005
      );
    });
  }
  const costs = nodes.map(() => Infinity),
    previous = nodes.map(() => -1),
    visited = new Set<number>();
  costs[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && (current === -1 || costs[i] < costs[current]))
        current = i;
    if (current < 0 || !Number.isFinite(costs[current]) || current === 1) break;
    visited.add(current);
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && clear(nodes[current], nodes[i])) {
        const cost = costs[current] + distance(nodes[current], nodes[i]);
        if (cost < costs[i]) {
          costs[i] = cost;
          previous[i] = current;
        }
      }
  }
  const route: Point[] = [];
  let index = 1;
  if (Number.isFinite(costs[1]))
    while (previous[index] >= 0) {
      route.unshift(nodes[index]);
      index = previous[index];
    }
  state.target = end;
  state.waypoints = route;
  state.action = null;
  state.revision++;
}

/** Reachable destination choices also drive the non-WebGL/keyboard alternative. */
export function adventureDestinations(
  state: AdventureState,
): AdventureTarget[] {
  return [
    ...state.beds.map((b) => ({
      kind: "bed" as const,
      id: String(b.id),
      point: { x: b.x, z: b.z + 1.1 },
    })),
    { kind: "well", id: "well", point: { x: WELL.x - 0.6, z: WELL.z + 0.4 } },
    ...state.forage
      .filter((f) => !f.collected)
      .map((f) => ({ kind: "forage" as const, id: String(f.id), point: f })),
    ...LANDMARKS.map((p) => ({
      kind: "landmark" as const,
      id: p.id,
      point: p,
    })),
    {
      kind: "butterfly",
      id: "butterfly",
      point:
        state.trail.phase === "following"
          ? state.trail.stops[state.trail.index]
          : TRAIL_START,
    },
    { kind: "home", id: "home", point: HOME },
  ];
}
