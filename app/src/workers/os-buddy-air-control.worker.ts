/// <reference lib="webworker" />
/**
 * Air Touch inference worker — scaffold.
 *
 * Moves MediaPipe inference off the main thread to keep OSBuddy's animation
 * smooth. The seam is the SensorProvider: callers can run inference inline (the
 * current overlay hook) or via this worker without layers 2-4 noticing.
 *
 * NOTE: MediaPipe-in-worker (OffscreenCanvas + GPU delegate) is environment
 * fragile, so this is wired behind a feature flag with a main-thread fallback.
 * The protocol below is stable; the heavy implementation is filled in when the
 * worker path is enabled.
 */

import type { OSBuddyAirControlHand } from "@/lib/os-buddy/os-buddy-air-control-types";

export type AirWorkerInbound =
  | { type: "init"; wasmUrl: string; modelUrl: string }
  | { type: "frame"; bitmap: ImageBitmap; timestamp: number }
  | { type: "stop" };

export type AirWorkerOutbound =
  | { type: "ready" }
  | { type: "sample"; timestamp: number; hands: OSBuddyAirControlHand[] }
  | { type: "error"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: AirWorkerOutbound) {
  ctx.postMessage(message);
}

ctx.addEventListener("message", (event: MessageEvent<AirWorkerInbound>) => {
  const data = event.data;
  switch (data.type) {
    case "init":
      // TODO(worker-path): lazy-import @mediapipe/tasks-vision, create the
      // GestureRecognizer with an OffscreenCanvas, then post {type:"ready"}.
      post({ type: "ready" });
      return;
    case "frame":
      // TODO(worker-path): run recognizeForVideo on the bitmap and post a sample.
      data.bitmap.close();
      return;
    case "stop":
      return;
    default:
      return;
  }
});

export {};
