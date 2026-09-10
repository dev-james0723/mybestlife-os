import type { Point } from "./game";

export type GardenObstacle = Point & (
  | { radius: number; halfX?: never; halfZ?: never }
  | { radius?: never; halfX: number; halfZ: number }
);

/** Ground capsule against a circle or the actual footprint of a raised prop. */
export function pushOutside(point: Point, obstacle: GardenObstacle, radius: number): Point {
  const dx = point.x - obstacle.x, dz = point.z - obstacle.z;
  if (obstacle.radius !== undefined) {
    const length = Math.hypot(dx, dz), clearance = obstacle.radius + radius;
    if (length >= clearance) return point;
    return { x: obstacle.x + (length ? dx / length : 1) * clearance,
      z: obstacle.z + (length ? dz / length : 0) * clearance };
  }
  const nearX = Math.max(-obstacle.halfX, Math.min(obstacle.halfX, dx));
  const nearZ = Math.max(-obstacle.halfZ, Math.min(obstacle.halfZ, dz));
  const ox = dx - nearX, oz = dz - nearZ, length = Math.hypot(ox, oz);
  if (length >= radius) return point;
  if (length > 0) return { x: obstacle.x + nearX + ox / length * radius,
    z: obstacle.z + nearZ + oz / length * radius };
  // Recover an old/spawn position inside a prop through the nearest face.
  return obstacle.halfX - Math.abs(dx) < obstacle.halfZ - Math.abs(dz)
    ? { x: obstacle.x + (dx < 0 ? -1 : 1) * (obstacle.halfX + radius), z: point.z }
    : { x: point.x, z: obstacle.z + (dz < 0 ? -1 : 1) * (obstacle.halfZ + radius) };
}

/** Visibility graph uses a conservative expanded box, so routes clear every corner. */
export function obstacleBlocksSegment(a: Point, b: Point, o: GardenObstacle, radius: number): boolean {
  const dx = b.x - a.x, dz = b.z - a.z;
  if (o.radius !== undefined) {
    const square = dx * dx + dz * dz;
    const t = square ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / square)) : 0;
    return Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) < o.radius + radius;
  }
  let enter = 0, leave = 1;
  for (const [start, delta, centre, extent] of [
    [a.x, dx, o.x, o.halfX + radius], [a.z, dz, o.z, o.halfZ + radius],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (start <= centre - extent || start >= centre + extent) return false;
    } else {
      const first = (centre - extent - start) / delta, second = (centre + extent - start) / delta;
      enter = Math.max(enter, Math.min(first, second)); leave = Math.min(leave, Math.max(first, second));
      if (enter >= leave) return false;
    }
  }
  return enter < leave;
}
