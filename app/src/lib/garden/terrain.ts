export type GardenPathStone = { x: number; z: number; radius: number; yaw: number };

/** Height above the lawn at a point on an authored, rotated stepping stone. */
export function gardenSurfaceRise(x: number, z: number, stones: GardenPathStone[]) {
  for (const stone of stones) {
    const dx = x - stone.x, dz = z - stone.z;
    const localX = dx * Math.cos(stone.yaw) - dz * Math.sin(stone.yaw);
    const localZ = dx * Math.sin(stone.yaw) + dz * Math.cos(stone.yaw);
    if ((localX / stone.radius) ** 2 + (localZ / (stone.radius * 0.72)) ** 2 <= 1) return 0.095;
  }
  return 0;
}
