/**
 * Brain Page — 3D Sphere Mode types.
 *
 * Discriminated unions for the focus and rotation state machines so the
 * runtime never has to inspect 4+ independent boolean flags. The whole
 * sphere experience reads from these unions; if a state isn't in the
 * union, it isn't representable.
 *
 * Scope: these types only describe the 3D Sphere Mode. The 2D global /
 * local orbit modes have their own (older) state.
 */

import type { ConstellationNode } from "@/types/constellation";

/** Stable identifier for a node within the sphere. */
export type SphereNodeId = ConstellationNode["id"];

/**
 * Focus state machine for the camera + selection lifecycle.
 *
 *   idle ──click──▶ transitioning-in ──fly-in done──▶ focused
 *     ▲                                                  │
 *     └────fly-out done── transitioning-out ◀──exit──────┘
 *
 * - `transitioning-in` and `transitioning-out` carry the timestamp the
 *   animation started from so the render loop can compute progress
 *   without writing React state every frame (no React state writes
 *   inside `useFrame`).
 * - The discriminated `phase` field is the only way to tell which slot
 *   of the machine we're in — never check `selectedNodeId !== null` to
 *   infer focus, always check `focusState.phase`.
 */
export type SphereFocusState =
  | { phase: "idle" }
  | { phase: "transitioning-in"; nodeId: SphereNodeId; startedAt: number }
  | { phase: "focused"; nodeId: SphereNodeId }
  | {
      phase: "transitioning-out";
      previousNodeId: SphereNodeId;
      startedAt: number;
    };

/**
 * Rotation state machine.
 *
 *   - `rotating`: ambient earth-like spin
 *   - `paused`: explicit pause caused by an active long press; only
 *     released when the user releases the press
 *   - `drag-paused`: transient pause while the user is dragging the
 *     camera (orbiting). Resumes automatically a short idle window
 *     after pointer release — never snaps back, just picks up from
 *     the current angle
 *   - `disabled`: user toggled Auto Rotate off entirely. Does not
 *     auto-resume.
 *
 * Rendering uses a single derived flag (`isSpinning`) so per-frame
 * code stays branchless.
 */
export type SphereRotationState =
  | { kind: "rotating" }
  | { kind: "paused"; reason: "longpress" }
  | { kind: "drag-paused"; resumeAt: number }
  | { kind: "disabled" };

/**
 * Speed preset for the ambient self-rotation.
 *
 *   - "off"   : no auto rotation at all (same effect as a disabled
 *               rotationState; kept distinct so the user can flip the
 *               toggle without losing their preferred speed)
 *   - "slow"  : default — gentle, contemplative
 *   - "normal": noticeably faster but still earth-like
 */
export type SphereRotationSpeed = "off" | "slow" | "normal";

/**
 * High-level gesture events emitted by `useNodeGesture`. Consumers
 * react to these without caring about pointer plumbing.
 */
export type SphereGestureEvent =
  | { kind: "click"; nodeId: SphereNodeId | null }
  | { kind: "longpress-start"; nodeId: SphereNodeId | null }
  | { kind: "longpress-end"; nodeId: SphereNodeId | null }
  | { kind: "drag-start" }
  | { kind: "drag-end" }
  | { kind: "hover"; nodeId: SphereNodeId | null };

/**
 * Gesture timing & threshold constants (per spec — non-tunable from UI).
 *
 *   - 350ms: long-press detection
 *   - 8px: drag escape distance — anything farther cancels the click
 *     and long-press timers and routes the gesture to camera orbit
 */
export const SPHERE_LONG_PRESS_THRESHOLD_MS = 350;
export const SPHERE_DRAG_CANCEL_THRESHOLD_PX = 8;

/**
 * After the user releases a drag gesture, we wait this many ms of pure
 * idle before quietly resuming auto-rotation. Long enough not to feel
 * jumpy, short enough that the sphere doesn't sit dead.
 */
export const SPHERE_DRAG_RESUME_DELAY_MS = 1200;

/**
 * Animation timings — also non-tunable from UI per spec.
 */
export const SPHERE_FLY_IN_MS = 1000;
export const SPHERE_FLY_OUT_MS = 800;
export const SPHERE_REDUCED_MOTION_FADE_MS = 200;

/**
 * Ambient rotation speeds (radians per second). Slow is the default —
 * earth-like, contemplative, calibrated to feel like a barely-moving
 * planet rather than an animated logo. Normal is the same shape just a
 * bit livelier; off disables auto rotation entirely.
 *
 * Tuning history: 0.085 read as "fast" to multiple reviewers. The
 * second-brain metaphor wants a horizon that's perceptibly drifting,
 * not a globe that's spinning. New baseline ≈ ½ revolution per
 * minute on slow.
 */
export const SPHERE_AMBIENT_YAW_BY_SPEED: Record<
  SphereRotationSpeed,
  number
> = {
  off: 0,
  slow: 0.045,
  normal: 0.1,
};

/**
 * Subtle secondary-axis drift, scaled by the same speed preset.
 * Keeps the sphere from looking mechanically lathe-like. Halved
 * alongside the yaw retune above.
 */
export const SPHERE_AMBIENT_DRIFT_BY_SPEED: Record<
  SphereRotationSpeed,
  number
> = {
  off: 0,
  slow: 0.008,
  normal: 0.02,
};

/** Half-speed reduced-motion factor (per spec — reduce, don't remove). */
export const SPHERE_REDUCED_MOTION_FACTOR = 0.5;
