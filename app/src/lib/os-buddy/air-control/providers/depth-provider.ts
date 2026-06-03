/**
 * Depth / WebXR SensorProvider (Layer 1) — EXPERIMENTAL scaffold.
 *
 * Intended for a future native depth source or a WebXR immersive-ar session with
 * depth-sensing. We do NOT pretend phone LiDAR/depth is reachable through normal
 * getUserMedia; this provider only activates when WebXR depth is feature-detected
 * (see capabilities.ts). Until then `start()` reports unsupported and the system
 * falls back to phone-RGB / RGB webcam, with the UI labelled honestly.
 */

import type { AirControlSample, SensorProvider, SourceHealth } from "../types";

export type DepthProviderOptions = {
  sourceId?: string;
  /** Supplies frames from a depth/XR source when one exists. */
  attach?: (emit: (sample: AirControlSample) => void) => Promise<() => void>;
};

export function createDepthProvider(options: DepthProviderOptions = {}): SensorProvider {
  const sourceId = options.sourceId ?? "depth";
  const listeners = new Set<(sample: AirControlSample) => void>();
  let detach: (() => void) | null = null;
  let lastSampleAt = 0;
  let lastConfidence = 0;

  return {
    sourceId,
    sensorMode: "depth",
    async start() {
      if (!options.attach) {
        throw new Error("Depth sensing is unavailable on this device.");
      }
      detach = await options.attach((sample) => {
        lastSampleAt = sample.timestamp;
        lastConfidence = sample.confidence;
        listeners.forEach((l) => l(sample));
      });
    },
    stop() {
      detach?.();
      detach = null;
    },
    onSample(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getHealth(): SourceHealth {
      return {
        sourceId,
        sensorMode: "depth",
        lastSampleAt,
        confidence: lastConfidence,
        quality: detach ? "ok" : "uncalibrated",
      };
    },
  };
}
