/**
 * RGB webcam SensorProvider (Layer 1).
 *
 * Canonical provider that owns getUserMedia + the MediaPipe GestureRecognizer and
 * emits {@link AirControlSample}s. This is the extensible seam used by sensor
 * fusion; the live overlay hook currently runs an equivalent inline loop, and can
 * adopt this provider without changing layers 2-4.
 *
 * Lazy-loads MediaPipe on the client only. SSR-safe (no module-scope browser use).
 */

import { selectPrimaryAirControlHand } from "../gestures";
import type { AirControlSample, SensorProvider, SourceHealth } from "../types";
import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
} from "../../os-buddy-air-control-types";

const MEDIAPIPE_VERSION = "0.10.35";
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const GESTURE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task";
const DETECTION_INTERVAL_MS = 50;

export type RgbWebcamProviderOptions = {
  sourceId?: string;
  video: HTMLVideoElement;
  detectionIntervalMs?: number;
};

function normalizeHandedness(value: string | undefined): "Left" | "Right" | "Unknown" {
  return value === "Left" || value === "Right" ? value : "Unknown";
}

function toHands(
  landmarksList: OSBuddyAirControlLandmark[][],
  handednessList: Array<Array<{ categoryName?: string; score?: number }>>,
  gesturesList: Array<Array<{ categoryName?: string; score?: number }>>,
): OSBuddyAirControlHand[] {
  return landmarksList.map((landmarks, index) => {
    const handedness = handednessList[index]?.[0];
    const gesture = gesturesList[index]?.[0];
    return {
      landmarks,
      handedness: normalizeHandedness(handedness?.categoryName),
      confidence: Math.max(handedness?.score ?? 0, gesture?.score ?? 0, 0.5),
      gestureName: gesture?.categoryName ?? null,
      gestureScore: gesture?.score ?? 0,
    };
  });
}

export function createRgbWebcamProvider(options: RgbWebcamProviderOptions): SensorProvider {
  const sourceId = options.sourceId ?? "rgb-webcam";
  const interval = options.detectionIntervalMs ?? DETECTION_INTERVAL_MS;
  const listeners = new Set<(sample: AirControlSample) => void>();

  let stream: MediaStream | null = null;
  // Use a loose type to avoid importing MediaPipe types at module scope.
  let recognizer: { recognizeForVideo: (v: HTMLVideoElement, t: number) => unknown; close: () => void } | null = null;
  let frame: number | null = null;
  let lastInferenceAt = 0;
  let lastVideoTime = -1;
  let lastSampleAt = 0;
  let lastConfidence = 0;

  const loop = (now: number) => {
    const video = options.video;
    if (
      recognizer &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      now - lastInferenceAt >= interval &&
      video.currentTime !== lastVideoTime
    ) {
      lastInferenceAt = now;
      lastVideoTime = video.currentTime;
      const result = recognizer.recognizeForVideo(video, now) as {
        landmarks: OSBuddyAirControlLandmark[][];
        handedness: Array<Array<{ categoryName?: string; score?: number }>>;
        gestures: Array<Array<{ categoryName?: string; score?: number }>>;
      };
      const hands = toHands(result.landmarks ?? [], result.handedness ?? [], result.gestures ?? []);
      const primaryHand = selectPrimaryAirControlHand(hands);
      lastSampleAt = now;
      lastConfidence = primaryHand?.confidence ?? 0;
      const sample: AirControlSample = {
        timestamp: now,
        sourceId,
        sensorMode: "rgb-webcam",
        handCount: hands.length,
        primaryHand,
        confidence: lastConfidence,
      };
      listeners.forEach((l) => l(sample));
    }
    frame = window.requestAnimationFrame(loop);
  };

  return {
    sourceId,
    sensorMode: "rgb-webcam",
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      options.video.srcObject = stream;
      options.video.muted = true;
      options.video.playsInline = true;
      await options.video.play();

      const { FilesetResolver, GestureRecognizer } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: GESTURE_MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      frame = window.requestAnimationFrame(loop);
    },
    stop() {
      if (frame != null) window.cancelAnimationFrame(frame);
      frame = null;
      recognizer?.close();
      recognizer = null;
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (options.video) {
        options.video.pause();
        options.video.srcObject = null;
      }
    },
    onSample(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getHealth(): SourceHealth {
      return {
        sourceId,
        sensorMode: "rgb-webcam",
        lastSampleAt,
        confidence: lastConfidence,
        quality: "uncalibrated",
      };
    },
  };
}
