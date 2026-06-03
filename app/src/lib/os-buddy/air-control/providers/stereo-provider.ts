/**
 * Stereo SensorProvider (Layer 1) — EXPERIMENTAL scaffold.
 *
 * Fuses two calibrated camera sources (e.g. desktop webcam + phone, or two
 * webcams) by triangulating matched index landmarks into a shared frame. The
 * triangulation math is real and tested ({@link triangulateDLT}); full automatic
 * extrinsic calibration (stereoCalibrate via OpenCV.js) is a setup-time step and
 * cannot be completed without real multi-camera hardware. When stereo quality is
 * unavailable the system falls back to the best single source via sensor fusion.
 */

import { triangulateDLT, type ProjectionMatrix } from "../triangulation";
import type { AirControlSample, SensorProvider, SourceHealth } from "../types";
import type { Vec3 } from "../geometry";

const INDEX_TIP = 8;

export type StereoProviderOptions = {
  sourceId?: string;
  left: SensorProvider;
  right: SensorProvider;
  /** Calibrated projection matrices for each camera (from setup-time calibration). */
  projection: { left: ProjectionMatrix; right: ProjectionMatrix } | null;
  /** Max time delta (ms) to accept a left/right frame pair. */
  maxPairDeltaMs?: number;
};

export function createStereoProvider(options: StereoProviderOptions): SensorProvider {
  const sourceId = options.sourceId ?? "stereo";
  const maxDelta = options.maxPairDeltaMs ?? 40;
  const listeners = new Set<(sample: AirControlSample) => void>();
  let unsubLeft: (() => void) | null = null;
  let unsubRight: (() => void) | null = null;
  let latestLeft: AirControlSample | null = null;
  let latestRight: AirControlSample | null = null;
  let lastSampleAt = 0;
  let lastConfidence = 0;

  const tryFuse = () => {
    if (!latestLeft || !latestRight || !options.projection) return;
    if (Math.abs(latestLeft.timestamp - latestRight.timestamp) > maxDelta) return;
    const lTip = latestLeft.primaryHand?.landmarks[INDEX_TIP];
    const rTip = latestRight.primaryHand?.landmarks[INDEX_TIP];
    if (!lTip || !rTip) return;

    const point3D: Vec3 | null = triangulateDLT(
      options.projection.left,
      options.projection.right,
      { x: lTip.x, y: lTip.y },
      { x: rTip.x, y: rTip.y },
    );
    if (!point3D) return;

    lastSampleAt = Math.max(latestLeft.timestamp, latestRight.timestamp);
    lastConfidence = Math.min(latestLeft.confidence, latestRight.confidence);
    const sample: AirControlSample = {
      timestamp: lastSampleAt,
      sourceId,
      sensorMode: "stereo",
      handCount: 1,
      primaryHand: latestLeft.primaryHand,
      worldFingertip: point3D,
      confidence: lastConfidence,
    };
    listeners.forEach((l) => l(sample));
  };

  return {
    sourceId,
    sensorMode: "stereo",
    async start() {
      await options.left.start();
      await options.right.start();
      unsubLeft = options.left.onSample((s) => {
        latestLeft = s;
        tryFuse();
      });
      unsubRight = options.right.onSample((s) => {
        latestRight = s;
        tryFuse();
      });
    },
    stop() {
      unsubLeft?.();
      unsubRight?.();
      unsubLeft = null;
      unsubRight = null;
      options.left.stop();
      options.right.stop();
      latestLeft = null;
      latestRight = null;
    },
    onSample(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getHealth(): SourceHealth {
      return {
        sourceId,
        sensorMode: "stereo",
        lastSampleAt,
        confidence: lastConfidence,
        // Without verified extrinsics we never claim better than "ok".
        quality: options.projection ? "ok" : "uncalibrated",
      };
    },
  };
}
