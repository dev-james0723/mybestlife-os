"use client";

import { useEffect, useRef, useState } from "react";
import type {
  GestureRecognizer,
  GestureRecognizerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  createAirGrabState,
  stepAirGrab,
  type AirGrabState,
} from "@/lib/os-buddy/air-control/air-grab-machine";
import { resolveAirTouch } from "@/lib/os-buddy/air-control/air-touch-resolver";
import { getIndexTipPoint, selectPrimaryAirControlHand } from "@/lib/os-buddy/air-control/gestures";
import type { Hitbox } from "@/lib/os-buddy/air-control/geometry";
import type { CalibrationData } from "@/lib/os-buddy/air-control/types";
import type {
  OSBuddyAirControlCommand,
  OSBuddyAirControlDebugState,
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
  OSBuddyAirControlSensorMode,
} from "@/lib/os-buddy/os-buddy-air-control-types";
import { useOSBuddyStore } from "@/stores/os-buddy-store";

const MEDIAPIPE_VERSION = "0.10.35";
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const GESTURE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task";
const DETECTION_INTERVAL_MS = 50;
const LOST_HAND_MS = 1_500;
const CLOSED_FIST_EXIT_MS = 800;
const COMMAND_COOLDOWN_MS = 1_200;

type UseOSBuddyAirControlParams = {
  enabled: boolean;
  locale: string;
  viewport: { width: number; height: number };
  dockPoint: { x: number; y: number };
  buddyBox: { width: number; height: number };
  sensorMode?: OSBuddyAirControlSensorMode;
  calibration?: CalibrationData | null;
  onCommand: (command: OSBuddyAirControlCommand) => void;
};

function isLocalhost() {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  );
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function waitForVideoReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Camera video could not start."));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function normalizeHandedness(value: string | undefined): "Left" | "Right" | "Unknown" {
  return value === "Left" || value === "Right" ? value : "Unknown";
}

function normalizeLandmarks(landmarks: NormalizedLandmark[]) {
  return landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  }));
}

function getHandsFromResult(result: GestureRecognizerResult): OSBuddyAirControlHand[] {
  return result.landmarks.map((landmarks, index) => {
    const handedness = result.handedness[index]?.[0];
    const gesture = result.gestures[index]?.[0];
    return {
      landmarks: normalizeLandmarks(landmarks),
      handedness: normalizeHandedness(handedness?.categoryName),
      confidence: Math.max(handedness?.score ?? 0, gesture?.score ?? 0, 0.5),
      gestureName: gesture?.categoryName ?? null,
      gestureScore: gesture?.score ?? 0,
    };
  });
}

/** One-shot gestures (outside the grab lifecycle) and the command they fire. */
function oneShotCommandFor(
  gesture: OSBuddyAirControlGesture,
): Extract<OSBuddyAirControlCommand, { type: "select" | "play-ball" | "celebrate" }> | null {
  switch (gesture) {
    case "Pinch":
      return { type: "select", gesture };
    case "Victory":
      return { type: "play-ball", gesture };
    case "Thumb_Up":
      return { type: "celebrate", gesture };
    default:
      return null;
  }
}

export function useOSBuddyAirControl({
  enabled,
  locale,
  viewport,
  dockPoint,
  buddyBox,
  sensorMode = "rgb-webcam",
  calibration = null,
  onCommand,
}: UseOSBuddyAirControlParams) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastInferenceAtRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const lastSeenAtRef = useRef(0);
  const lostHandNotifiedRef = useRef(false);
  const machineRef = useRef<AirGrabState>(createAirGrabState());
  const closedFistSinceRef = useRef<number | null>(null);
  const lastCommandAtRef = useRef<Record<string, number>>({});
  const fpsWindowRef = useRef<number[]>([]);
  const lastGestureRef = useRef<OSBuddyAirControlGesture | null>(null);
  const onCommandRef = useRef(onCommand);
  // Kept fresh without restarting the camera effect.
  const dockBoxRef = useRef({ dockPoint, buddyBox });
  const calibrationRef = useRef<CalibrationData | null>(calibration);
  const [debugState, setDebugState] = useState<OSBuddyAirControlDebugState>({
    handCount: 0,
    gesture: null,
    confidence: 0,
    target: null,
    fingertip: null,
    state: "inactive",
    hitbox: null,
    sensorMode,
    quality: "uncalibrated",
    latencyMs: 0,
    fps: 0,
  });

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    dockBoxRef.current = { dockPoint, buddyBox };
  }, [dockPoint, buddyBox]);

  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      useOSBuddyStore.getState().stopAirControl("user-exit");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") return;
      useOSBuddyStore.getState().stopAirControl("visibility-hidden");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const store = useOSBuddyStore.getState();

    const emitCommand = (command: OSBuddyAirControlCommand, now: number) => {
      // Grab-lifecycle / cursor commands always flow; one-shots are rate limited.
      const rateLimited =
        command.type === "select" ||
        command.type === "play-ball" ||
        command.type === "celebrate" ||
        command.type === "exit" ||
        command.type === "lost-hand";
      if (rateLimited) {
        const previousAt = lastCommandAtRef.current[command.type] ?? 0;
        if (now - previousAt < COMMAND_COOLDOWN_MS) return false;
        lastCommandAtRef.current[command.type] = now;
      }
      onCommandRef.current(command);
      return true;
    };

    const setGesture = (gesture: OSBuddyAirControlGesture | null) => {
      if (lastGestureRef.current === gesture) return;
      lastGestureRef.current = gesture;
      useOSBuddyStore.getState().setAirControlGesture(gesture);
    };

    const handleResult = (result: GestureRecognizerResult, now: number, latencyMs: number) => {
      const hands = getHandsFromResult(result);
      const primaryHand = selectPrimaryAirControlHand(hands);
      const { dockPoint: dock, buddyBox: box } = dockBoxRef.current;
      const hitbox: Hitbox = {
        x: dock.x,
        y: dock.y,
        width: box.width,
        height: box.height,
      };

      // Surface the raw normalized index tip for the calibration flow.
      const rawTip = primaryHand ? getIndexTipPoint(primaryHand) : null;
      useOSBuddyStore.getState().setAirControlRawPoint(rawTip);

      const reading = resolveAirTouch({
        hand: primaryHand,
        viewport,
        now,
        sensorMode,
        calibration: calibrationRef.current,
        mirrored: true,
      });

      const { next, commands } = stepAirGrab(machineRef.current, {
        reading,
        hitbox,
        dockPoint: dock,
        now,
      });
      machineRef.current = next;

      const isGrabbing = next.state === "grabbed" || next.state === "dragging";

      // Lost-hand bookkeeping (hint + status), independent of the grab freeze.
      if (!primaryHand) {
        const lastSeenAt = lastSeenAtRef.current;
        if (lastSeenAt > 0 && now - lastSeenAt >= LOST_HAND_MS && !lostHandNotifiedRef.current) {
          lostHandNotifiedRef.current = true;
          closedFistSinceRef.current = null;
          useOSBuddyStore.getState().setAirControlStatus("paused");
          emitCommand({ type: "lost-hand" }, now);
        }
      } else {
        lostHandNotifiedRef.current = false;
        lastSeenAtRef.current = now;
        useOSBuddyStore.getState().markAirControlHandSeen(Date.now());
        useOSBuddyStore.getState().setAirControlStatus("tracking");
      }

      setGesture(reading.gesture);
      useOSBuddyStore.getState().setAirTouchState(next.state);

      // Emit grab-lifecycle + cursor commands.
      for (const command of commands) {
        emitCommand(command, now);
      }

      // One-shot gestures only when NOT holding (avoid fighting a drag). Open palm
      // release is handled inside the machine, so it's excluded here.
      if (!isGrabbing) {
        const oneShot = oneShotCommandFor(reading.gesture);
        if (oneShot) emitCommand(oneShot, now);
      }

      // Closed-fist hold fully exits Air Control.
      if (reading.gesture === "Closed_Fist") {
        closedFistSinceRef.current ??= now;
        if (now - closedFistSinceRef.current >= CLOSED_FIST_EXIT_MS) {
          emitCommand({ type: "exit", gesture: "Closed_Fist" }, now);
        }
      } else {
        closedFistSinceRef.current = null;
      }

      const fpsWindow = fpsWindowRef.current.filter((timestamp) => now - timestamp < 1_000);
      fpsWindow.push(now);
      fpsWindowRef.current = fpsWindow;

      const cursor = next.smoothed;
      const storeState = useOSBuddyStore.getState();
      storeState.setAirControlTarget(cursor ?? null);
      setDebugState({
        handCount: hands.length,
        gesture: reading.gesture,
        confidence: reading.confidence,
        target: cursor ?? null,
        fingertip: cursor ?? null,
        state: next.state,
        hitbox,
        sensorMode,
        quality: storeState.airControlQuality,
        latencyMs,
        fps: fpsWindow.length,
      });
    };

    const stopRuntimeResources = () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      recognizerRef.current?.close();
      recognizerRef.current = null;
      stopStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      lastInferenceAtRef.current = 0;
      lastVideoTimeRef.current = -1;
      lastSeenAtRef.current = 0;
      lostHandNotifiedRef.current = false;
      closedFistSinceRef.current = null;
      machineRef.current = createAirGrabState();
      useOSBuddyStore.getState().setAirControlTarget(null);
      useOSBuddyStore.getState().setAirTouchState("inactive");
    };

    const loop = (now: number) => {
      if (cancelled) return;

      const video = videoRef.current;
      const recognizer = recognizerRef.current;
      if (video && recognizer && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const shouldInfer =
          now - lastInferenceAtRef.current >= DETECTION_INTERVAL_MS &&
          video.currentTime !== lastVideoTimeRef.current;
        if (shouldInfer) {
          const startedAt = performance.now();
          lastInferenceAtRef.current = now;
          lastVideoTimeRef.current = video.currentTime;
          const result = recognizer.recognizeForVideo(video, now);
          handleResult(result, now, performance.now() - startedAt);
        }
      }

      frameRef.current = window.requestAnimationFrame(loop);
    };

    const fail = (
      status: "unsupported" | "permission-denied" | "camera-error" | "model-error",
      message: string,
    ) => {
      useOSBuddyStore.getState().setAirControlStatus("error");
      useOSBuddyStore.getState().setAirControlError(message);
      store.showBubble(message, "error", { force: true, durationMs: 4_200 });
      useOSBuddyStore.getState().stopAirControl(status);
    };

    const start = async () => {
      const video = videoRef.current;
      if (!video) return;

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        fail(
          "unsupported",
          locale === "zh-TW"
            ? "這個瀏覽器暫時不支援相機手勢。"
            : "This browser does not support camera gestures yet.",
        );
        return;
      }

      if (!window.isSecureContext && !isLocalhost()) {
        fail(
          "unsupported",
          locale === "zh-TW"
            ? "隔空操控需要 HTTPS 或 localhost。"
            : "Air Control needs HTTPS or localhost.",
        );
        return;
      }

      store.showBubble(
        locale === "zh-TW"
          ? "我要用相機追蹤你的手勢，畫面只會在你的裝置上處理。"
          : "I'll use your camera to track your hand gestures. Video stays on this device.",
        "system",
        { force: true, durationMs: 5_200 },
      );

      try {
        useOSBuddyStore.getState().setAirControlStatus("requesting-permission");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await waitForVideoReady(video);
        await video.play();
      } catch {
        if (cancelled) return;
        fail(
          "permission-denied",
          locale === "zh-TW"
            ? "相機權限未開啟，隔空操控先暫停。"
            : "Camera permission was not enabled, so Air Control is paused.",
        );
        return;
      }

      try {
        useOSBuddyStore.getState().setAirControlStatus("loading-model");
        const { FilesetResolver, GestureRecognizer: GestureRecognizerTask } = await import(
          "@mediapipe/tasks-vision"
        );
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        const recognizer = await GestureRecognizerTask.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: GESTURE_MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) {
          recognizer.close();
          return;
        }

        recognizerRef.current = recognizer;
        useOSBuddyStore.getState().setAirControlStatus("tracking");
        store.showBubble(
          locale === "zh-TW"
            ? "隔空觸碰啟動。伸出食指，碰到我就可以抓住我移動。"
            : "Air Touch is on. Point your index finger, then reach onto me to grab and move me.",
          "user-triggered",
          { force: true, durationMs: 3_800 },
        );
        frameRef.current = window.requestAnimationFrame(loop);
      } catch {
        if (cancelled) return;
        fail(
          "model-error",
          locale === "zh-TW"
            ? "手勢模型載入失敗，隔空操控先關閉。"
            : "The hand gesture model failed to load, so Air Control is off.",
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopRuntimeResources();
    };
  }, [enabled, locale, viewport, sensorMode]);

  return {
    videoRef,
    debugState,
  };
}
