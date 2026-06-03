/**
 * Shared types for the layered Air Touch architecture.
 *
 * Layer 1 (providers) emit {@link AirControlSample}. Layer 2 (resolver) turns a
 * sample into an {@link AirTouchReading}. Layer 3 (grab machine) turns readings +
 * a hitbox into commands. This file bridges the pure geometry types and the public
 * command/gesture types in os-buddy-air-control-types.ts without duplicating them.
 */

import type { Vec2, Vec3 } from "./geometry";
import type {
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
  OSBuddyAirControlPoint,
  OSBuddyAirControlQuality,
  OSBuddyAirControlSensorMode,
} from "../os-buddy-air-control-types";

export type { Hitbox, Vec2, Vec3 } from "./geometry";
export type { Plane, ScreenBasis } from "./geometry";

/** Output of a sensor provider for one inference tick. */
export type AirControlSample = {
  timestamp: number;
  sourceId: string;
  sensorMode: OSBuddyAirControlSensorMode;
  handCount: number;
  primaryHand: OSBuddyAirControlHand | null;
  /** True 3D hand points when the source provides them (depth/stereo/AR). */
  worldFingertip?: Vec3 | null;
  /** Per-sample provider confidence (0..1). */
  confidence: number;
};

/**
 * Resolver output. `mode` is the honest source of the fingertip:
 *  - "2d": image-space landmark mapped to the viewport (no real depth)
 *  - "3d": projected from a calibrated screen plane + a usable 3D source
 */
export type AirTouchReading = {
  timestamp: number;
  fingertip: Vec2 | null;
  isIndexExtended: boolean;
  gesture: OSBuddyAirControlGesture;
  confidence: number;
  mode: "2d" | "3d";
  sensorMode: OSBuddyAirControlSensorMode;
};

/** Persisted, video-free calibration summary. */
export type CalibrationData = {
  createdAt: number;
  screenCssSize: { width: number; height: number };
  quality: OSBuddyAirControlQuality;
  rmsErrorPx: number | null;
  /** Optional per-source affine mapping from normalized image -> viewport. */
  mapping?: {
    sourceId: string;
    /** [a,b,c,d,e,f] for x' = a*x + b*y + c, y' = d*x + e*y + f (normalized in). */
    affine: [number, number, number, number, number, number];
  } | null;
  device?: string | null;
};

/** Health snapshot used by sensor fusion to pick the best active source. */
export type SourceHealth = {
  sourceId: string;
  sensorMode: OSBuddyAirControlSensorMode;
  lastSampleAt: number;
  confidence: number;
  quality: OSBuddyAirControlQuality;
};

/**
 * Provider interface. Every sensor (rgb-webcam, phone-rgb, phone-ar, stereo,
 * depth) implements this so fusion/UI can treat them uniformly. The worker vs
 * main-thread distinction is an internal detail of each provider.
 */
export type SensorProvider = {
  readonly sourceId: string;
  readonly sensorMode: OSBuddyAirControlSensorMode;
  start(): Promise<void>;
  stop(): void;
  /** Subscribe to samples; returns an unsubscribe function. */
  onSample(listener: (sample: AirControlSample) => void): () => void;
  getHealth(): SourceHealth;
};

export type { OSBuddyAirControlPoint };
