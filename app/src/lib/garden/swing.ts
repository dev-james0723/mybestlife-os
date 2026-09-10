/** One measured frame shared by rendering, interaction and ground collision. */
export const GARDEN_SWING = {
  x: -10.2, z: -2.6, pivotY: 2.8, length: 2.08,
  seatHalfWidth: 0.46, entryZ: -1.45,
} as const;
export type GardenSwingState = {
  mode: "idle" | "boarding" | "riding" | "stopping" | "dismounting";
  angle: number;
  velocity: number;
  seated: number;
};
export const createSwing = (): GardenSwingState => ({ mode: "idle", angle: 0, velocity: 0, seated: 0 });

export function advanceSwing(swing: GardenSwingState, dt: number, pump = 0) {
  if (swing.mode === "idle" || swing.mode === "boarding") return false;
  if (swing.mode === "dismounting") {
    swing.seated = Math.max(0, swing.seated - dt * 2.5);
    if (swing.seated === 0) { Object.assign(swing, createSwing()); return true; }
    return false;
  }
  swing.seated = Math.min(1, swing.seated + dt * 2.5);
  // Gravity, damping and a small phase-aligned push. The rider supplies energy
  // without teleporting the seat; both ropes retain their original length.
  const stopping = swing.mode === "stopping";
  const energy = 0.5 * swing.velocity ** 2 + 9.81 / GARDEN_SWING.length * (1 - Math.cos(swing.angle));
  const drive = !stopping && swing.seated === 1 && energy < (Math.abs(pump) > 0.1 ? 1 : 0.55)
    ? Math.sign(swing.velocity || 1) * 0.65 : 0;
  swing.velocity += (-9.81 / GARDEN_SWING.length * Math.sin(swing.angle)
    - (stopping ? 4.6 : 0.12) * swing.velocity + drive) * dt;
  swing.angle += swing.velocity * dt;
  if (stopping && Math.abs(swing.angle) < 0.015 && Math.abs(swing.velocity) < 0.045) {
    swing.mode = "dismounting";
    swing.angle = swing.velocity = 0;
  }
  return false;
}
