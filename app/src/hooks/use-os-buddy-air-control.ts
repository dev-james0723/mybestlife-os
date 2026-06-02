"use client";

import { useEffect, useRef, useState } from "react";
import type {
  GestureRecognizer,
  GestureRecognizerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  detectOpenPalmSwipe,
  getIndexTipPoint,
  mapNormalizedPointToViewport,
  resolveAirControlGesture,
  selectPrimaryAirControlHand,
} from "@/lib/os-buddy/os-buddy-air-gestures";
import { OSBuddyAirPointSmoother, OSBuddyAirStableValue } from "@/lib/os-buddy/os-buddy-air-smoothing";
import type {
  OSBuddyAirControlCommand,
  OSBuddyAirControlDebugState,
  OSBuddyAirControlFrame,
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
  OSBuddyAirControlPoint,
} from "@/lib/os-buddy/os-buddy-air-control-types";
import { useOSBuddyStore } from "@/stores/os-buddy-store";

const MEDIAPIPE_VERSION = "0.10.35";
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const GESTURE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task";
const DETECTION_INTERVAL_MS = 66;
const LOST_HAND_MS = 1_500;
const CLOSED_FIST_EXIT_MS = 800;
const COMMAND_COOLDOWN_MS = 1_200;

type UseOSBuddyAirControlParams = {
  enabled: boolean;
  locale: string;
  viewport: { width: number; height: number };
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

export function useOSBuddyAirControl({
  enabled,
  locale,
  viewport,
  onCommand,
}: UseOSBuddyAirControlParams) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastInferenceAtRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const lastSeenAtRef = useRef(0);
  const previousFrameRef = useRef<OSBuddyAirControlFrame | null>(null);
  const smootherRef = useRef(new OSBuddyAirPointSmoother(0.36));
  const stableGestureRef = useRef(new OSBuddyAirStableValue<OSBuddyAirControlGesture>(110));
  const closedFistSinceRef = useRef<number | null>(null);
  const lostHandNotifiedRef = useRef(false);
  const lastCommandAtRef = useRef<Record<string, number>>({});
  const fpsWindowRef = useRef<number[]>([]);
  const lastGestureRef = useRef<OSBuddyAirControlGesture | null>(null);
  const onCommandRef = useRef(onCommand);
  const [debugState, setDebugState] = useState<OSBuddyAirControlDebugState>({
    handCount: 0,
    gesture: null,
    confidence: 0,
    target: null,
    fps: 0,
  });

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

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
      if (command.type !== "follow") {
        const previousAt = lastCommandAtRef.current[command.type] ?? 0;
        if (now - previousAt < COMMAND_COOLDOWN_MS) return false;
        lastCommandAtRef.current[command.type] = now;
      }

      onCommandRef.current(command);
      return true;
    };

    const updateDebug = (params: {
      frame: OSBuddyAirControlFrame;
      gesture: OSBuddyAirControlGesture | null;
      target: OSBuddyAirControlPoint | null;
      now: number;
    }) => {
      const fpsWindow = fpsWindowRef.current.filter((timestamp) => params.now - timestamp < 1_000);
      fpsWindow.push(params.now);
      fpsWindowRef.current = fpsWindow;
      setDebugState({
        handCount: params.frame.handCount,
        gesture: params.gesture,
        confidence: params.frame.primaryHand?.confidence ?? 0,
        target: params.target,
        fps: fpsWindow.length,
      });
    };

    const setGesture = (gesture: OSBuddyAirControlGesture | null) => {
      if (lastGestureRef.current === gesture) return;
      lastGestureRef.current = gesture;
      useOSBuddyStore.getState().setAirControlGesture(gesture);
    };

    const handleResult = (result: GestureRecognizerResult, now: number) => {
      const hands = getHandsFromResult(result);
      const primaryHand = selectPrimaryAirControlHand(hands);
      const frame: OSBuddyAirControlFrame = {
        handCount: hands.length,
        primaryHand,
        now,
      };

      if (!primaryHand) {
        const lastSeenAt = lastSeenAtRef.current;
        if (lastSeenAt > 0 && now - lastSeenAt >= LOST_HAND_MS && !lostHandNotifiedRef.current) {
          lostHandNotifiedRef.current = true;
          smootherRef.current.reset();
          stableGestureRef.current.reset();
          closedFistSinceRef.current = null;
          setGesture(null);
          useOSBuddyStore.getState().setAirControlTarget(null);
          useOSBuddyStore.getState().setAirControlStatus("paused");
          emitCommand({ type: "lost-hand" }, now);
        }
        updateDebug({ frame, gesture: null, target: null, now });
        previousFrameRef.current = frame;
        return;
      }

      lostHandNotifiedRef.current = false;
      lastSeenAtRef.current = now;
      useOSBuddyStore.getState().markAirControlHandSeen(Date.now());
      useOSBuddyStore.getState().setAirControlStatus("tracking");

      const rawGesture = resolveAirControlGesture(primaryHand);
      const swipeGesture = detectOpenPalmSwipe({
        current: frame,
        previous: previousFrameRef.current,
        gesture: rawGesture,
      });
      const stableGesture = stableGestureRef.current.update(swipeGesture ?? rawGesture, now);
      const gesture = swipeGesture ?? stableGesture ?? rawGesture;
      let target: OSBuddyAirControlPoint | null = null;

      setGesture(gesture);

      if (gesture !== "Closed_Fist") {
        closedFistSinceRef.current = null;
      }

      if (gesture === "Index_Point" || gesture === "Pointing_Up") {
        const indexTip = getIndexTipPoint(primaryHand);
        if (indexTip && viewport.width > 0 && viewport.height > 0) {
          target = smootherRef.current.update(
            mapNormalizedPointToViewport({
              point: indexTip,
              viewport,
              mirrored: true,
            }),
          );
          useOSBuddyStore.getState().setAirControlTarget(target);
          emitCommand({ type: "follow", point: target, gesture }, now);
        }
      } else if (gesture === "Open_Palm") {
        smootherRef.current.reset();
        useOSBuddyStore.getState().setAirControlTarget(null);
        useOSBuddyStore.getState().setAirControlStatus("paused");
        emitCommand({ type: "pause", gesture }, now);
      } else if (gesture === "Closed_Fist") {
        smootherRef.current.reset();
        useOSBuddyStore.getState().setAirControlTarget(null);
        emitCommand({ type: "hold", gesture }, now);
        closedFistSinceRef.current ??= now;
        if (now - closedFistSinceRef.current >= CLOSED_FIST_EXIT_MS) {
          emitCommand({ type: "exit", gesture }, now);
        }
      } else if (gesture === "Pinch") {
        emitCommand({ type: "select", gesture }, now);
      } else if (gesture === "Victory") {
        emitCommand({ type: "play-ball", gesture }, now);
      } else if (gesture === "Thumb_Up") {
        emitCommand({ type: "celebrate", gesture }, now);
      } else if (gesture === "Swipe_Left") {
        emitCommand({ type: "dash-left", gesture }, now);
      } else if (gesture === "Swipe_Right") {
        emitCommand({ type: "dash-right", gesture }, now);
      }

      updateDebug({ frame, gesture, target, now });
      previousFrameRef.current = frame;
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
      previousFrameRef.current = null;
      lastInferenceAtRef.current = 0;
      lastVideoTimeRef.current = -1;
      lastSeenAtRef.current = 0;
      lostHandNotifiedRef.current = false;
      closedFistSinceRef.current = null;
      smootherRef.current.reset();
      stableGestureRef.current.reset();
      useOSBuddyStore.getState().setAirControlTarget(null);
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
          lastInferenceAtRef.current = now;
          lastVideoTimeRef.current = video.currentTime;
          handleResult(recognizer.recognizeForVideo(video, now), now);
        }
      }

      frameRef.current = window.requestAnimationFrame(loop);
    };

    const fail = (
      status: "unsupported" | "permission-denied" | "camera-error" | "model-error",
      message: string,
    ) => {
      useOSBuddyStore.getState().setAirControlStatus("error");
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
            ? "隔空操控啟動。伸出食指，我會跟住你。"
            : "Air Control is on. Point with your index finger and I'll follow.",
          "user-triggered",
          { force: true, durationMs: 3_600 },
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
  }, [enabled, locale, viewport]);

  return {
    videoRef,
    debugState,
  };
}
