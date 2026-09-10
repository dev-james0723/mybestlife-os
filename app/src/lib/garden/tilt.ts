/** Device orientation → calibrated, camera-relative analogue movement.
 * Relative heading steers in all directions; no geographic north is needed.
 * All angles stay on the device, never persisted.
 */
export type TiltSensitivity = "gentle" | "balanced" | "sensitive";
export type TiltStatus = "calibrating" | "ready" | "suspended" | "stale";
export type TiltVector = { x: number; z: number };
export const TILT_TUNING = {
  gentle: { deadZone: 0.9, fullTilt: 26 },
  balanced: { deadZone: 0.6, fullTilt: 18 },
  sensitive: { deadZone: 0.3, fullTilt: 12 },
} as const;
export const TILT_STALE_MS = 1200;
const CALIBRATION_MS = 450;
const RAD = Math.PI / 180;
const ZERO: TiltVector = Object.freeze({ x: 0, z: 0 });
const wrap = (degrees: number) => (((degrees % 360) + 540) % 360) - 180;

/** Gravity in device coordinates from W3C's Z-X′-Y″ rotation convention.
 * Rotating gravity into screen coordinates avoids Euler wrap/landscape flips.
 * x is rightward lean, z decreases when the top of the screen tips down.
 */
export function screenTilt(beta: number | null, gamma: number | null, screenAngle: number): TiltVector | null {
  if (beta === null || gamma === null || ![beta, gamma, screenAngle].every(Number.isFinite)) return null;
  if (Math.abs(beta) > 180 || Math.abs(gamma) > 90) return null;
  const b = beta * RAD, g = gamma * RAD, a = screenAngle * RAD;
  const gx = -Math.cos(b) * Math.sin(g), gy = Math.sin(b), gz = Math.cos(b) * Math.cos(g);
  const right = gx * Math.cos(a) - gy * Math.sin(a);
  const top = gx * Math.sin(a) + gy * Math.cos(a);
  // A screen held exactly edge-on has no gravity-based forward direction.
  if (Math.hypot(top, gz) < 0.05) return null;
  return { x: Math.asin(Math.max(-1, Math.min(1, -right))) / RAD, z: Math.atan2(top, gz) / RAD };
}

/** Fused yaw from the full Z-X′-Y″ quaternion, corrected for screen rotation.
 * It stays continuous through an upright grip, unlike top-edge projection.
 * See Allgeuer & Behnke, IROS 2015, equation 36. Face-down yaw is undefined.
 */
export function screenHeading(alpha: number | null, beta: number, gamma: number, screenAngle: number): number | null {
  if (alpha === null || ![alpha, beta, gamma, screenAngle].every(Number.isFinite)) return null;
  const a = alpha * RAD / 2, b = beta * RAD / 2, g = gamma * RAD / 2;
  const w = Math.cos(a) * Math.cos(b) * Math.cos(g) - Math.sin(a) * Math.sin(b) * Math.sin(g);
  const z = Math.sin(a) * Math.cos(b) * Math.cos(g) + Math.cos(a) * Math.sin(b) * Math.sin(g);
  return Math.hypot(w, z) < 0.05 ? null : wrap(2 * Math.atan2(z, w) / RAD - screenAngle);
}

export function tiltToInput(tilt: TiltVector, sensitivity: TiltSensitivity): TiltVector {
  const length = Math.hypot(tilt.x, tilt.z);
  const { deadZone, fullTilt } = TILT_TUNING[sensitivity];
  if (!Number.isFinite(length) || length <= deadZone) return ZERO;
  // Continuous onset; a small deliberate lean produces a slow walk, never full speed.
  const speed = Math.pow(Math.min(1, (length - deadZone) / (fullTilt - deadZone)), 0.85);
  return { x: tilt.x / length * speed, z: tilt.z / length * speed };
}

export class GardenTiltController {
  status: TiltStatus = "calibrating";
  sensitivity: TiltSensitivity = "balanced";
  output: TiltVector = ZERO;
  private neutral: TiltVector | null = null;
  private latest: TiltVector | null = null;
  private anchor: TiltVector | null = null;
  private anchorAt = 0;
  private lastSignal = -Infinity;
  private lastFrame: number | null = null;
  private angle: number | null = null;
  private filtered: TiltVector = { ...ZERO };
  private latestHeading: number | null = null;
  private neutralHeading: number | null = null;
  private anchorHeading: number | null = null;
  private filteredHeading = 0;
  get headingAvailable() { return this.latestHeading !== null; }

  recalibrate() {
    this.neutral = this.anchor = this.latest = null;
    this.filtered = { ...ZERO };
    this.latestHeading = this.neutralHeading = this.anchorHeading = null;
    this.filteredHeading = 0;
    this.output = ZERO;
    this.lastFrame = null;
    this.status = "calibrating";
  }

  /** Motion is a heartbeat for browsers that only emit orientation on change. */
  heartbeat(now: number) { this.lastSignal = now; }

  sample(beta: number | null, gamma: number | null, screenAngle: number, now: number, alpha: number | null = 0) {
    const value = screenTilt(beta, gamma, screenAngle);
    if (!value) {
      this.recalibrate();
      this.lastSignal = -Infinity;
      this.status = "stale";
      return;
    }
    if (this.angle !== screenAngle || now - this.lastSignal > TILT_STALE_MS) this.recalibrate();
    this.angle = screenAngle;
    this.lastSignal = now;
    if (this.status === "suspended") return;
    this.latest = value;
    this.latestHeading = screenHeading(alpha, beta!, gamma!, screenAngle);
    if (!this.neutral) {
      const turning = this.anchorHeading !== null && this.latestHeading !== null && Math.abs(wrap(this.latestHeading - this.anchorHeading)) > 1;
      if (!this.anchor || turning || Math.hypot(wrap(value.x - this.anchor.x), wrap(value.z - this.anchor.z)) > 0.8) {
        this.anchor = value;
        this.anchorHeading = this.latestHeading;
        this.anchorAt = now;
      }
      // A fixed anchor bounds total calibration drift, even during a slow tilt.
    }
  }

  read(now: number, suspended = false): TiltVector {
    if (suspended) {
      if (this.status !== "suspended") this.recalibrate();
      this.status = "suspended";
      return this.output = ZERO;
    }
    if (this.status === "suspended") this.recalibrate();
    if (now - this.lastSignal > TILT_STALE_MS || !this.latest) {
      if (this.status === "ready") this.recalibrate();
      this.status = "stale";
      return this.output = ZERO;
    }
    if (!this.neutral) {
      this.status = "calibrating";
      if (!this.anchor || now - this.anchorAt < CALIBRATION_MS) return this.output = ZERO;
      this.neutral = { ...this.anchor };
      this.neutralHeading = this.anchorHeading;
      this.status = "ready";
    }
    const delta = { x: wrap(this.latest.x - this.neutral.x), z: wrap(this.latest.z - this.neutral.z) };
    const dt = this.lastFrame === null ? 1 / 60 : Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    // 35–65 ms time constant: suppress tremor without a sluggish start.
    const blend = 1 - Math.exp(-dt / (Math.hypot(delta.x, delta.z) > 5 ? 0.035 : 0.065));
    this.filtered.x += (delta.x - this.filtered.x) * blend;
    this.filtered.z += (delta.z - this.filtered.z) * blend;
    if (this.latestHeading !== null) {
      this.neutralHeading ??= this.latestHeading;
      const headingDelta = wrap(this.latestHeading - this.neutralHeading);
      this.filteredHeading += wrap(headingDelta - this.filteredHeading) * blend;
    }
    if (Math.hypot(delta.x, delta.z) <= TILT_TUNING[this.sensitivity].deadZone) {
      this.filtered = { ...ZERO };
      return this.output = ZERO;
    }
    this.status = "ready";
    const input = tiltToInput(this.filtered, this.sensitivity);
    const yaw = this.filteredHeading * RAD;
    return this.output = { x: input.x * Math.cos(yaw) + input.z * Math.sin(yaw), z: -input.x * Math.sin(yaw) + input.z * Math.cos(yaw) };
  }
}
