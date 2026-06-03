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
import {
  OSBuddyAirPointSmoother,
  OSBuddyAirStableValue,
} from "@/lib/os-buddy/os-buddy-air-smoothing";
import {
  AIRPILOT_WAKE_GUARD_MS,
  getAirPilotPalmCenter,
  getAirPilotThumbIndexRatio,
} from "@/lib/os-buddy/os-buddy-airpilot-pinch";
import {
  AIRPILOT_MAGNET_RADIUS_PX,
  createAirPilotMagnetMachine,
  updateAirPilotMagnetMachine,
  type AirPilotMagnetMachine,
} from "@/lib/os-buddy/os-buddy-airpilot-magnet";
import { resolveNearestAirPilotMagnetTarget } from "@/lib/os-buddy/os-buddy-airpilot-page-control";
import type { CalibrationData } from "@/lib/os-buddy/air-control/types";
import type {
  OSBuddyAirControlCommand,
  OSBuddyAirControlDebugState,
  OSBuddyAirControlFrame,
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
  OSBuddyAirControlPoint,
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
const AIRPILOT_SCROLL_MIN_DELTA_PX = 8;
const AIRPILOT_SCROLL_MULTIPLIER = 1.8;

type UseOSBuddyAirControlParams = {
  enabled: boolean;
  airPilotActive: boolean;
  wakeListening: boolean;
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

function normalizeLandmarks(
  landmarks: NormalizedLandmark[] | OSBuddyAirControlLandmark[] | undefined,
) {
  return (landmarks ?? []).map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  }));
}

function getWorldLandmarks(result: GestureRecognizerResult, index: number) {
  const withWorld = result as GestureRecognizerResult & {
    worldLandmarks?: NormalizedLandmark[][];
  };
  return normalizeLandmarks(withWorld.worldLandmarks?.[index]);
}

function getHandsFromResult(result: GestureRecognizerResult): OSBuddyAirControlHand[] {
  return result.landmarks.map((landmarks, index) => {
    const handedness = result.handedness[index]?.[0];
    const gesture = result.gestures[index]?.[0];
    const worldLandmarks = getWorldLandmarks(result, index);
    return {
      landmarks: normalizeLandmarks(landmarks),
      worldLandmarks: worldLandmarks.length > 0 ? worldLandmarks : undefined,
      handedness: normalizeHandedness(handedness?.categoryName),
      confidence: Math.max(handedness?.score ?? 0, gesture?.score ?? 0, 0.5),
      gestureName: gesture?.categoryName ?? null,
      gestureScore: gesture?.score ?? 0,
    };
  });
}

function mapHandPointToViewport(params: {
  point: OSBuddyAirControlPoint | null;
  viewport: { width: number; height: number };
}) {
  if (!params.point || params.viewport.width <= 0 || params.viewport.height <= 0) {
    return null;
  }

  return mapNormalizedPointToViewport({
    point: params.point,
    viewport: params.viewport,
    mirrored: true,
  });
}

function shouldBypassCommandCooldown(command: OSBuddyAirControlCommand) {
  return (
    command.type === "follow" ||
    command.type === "cursor" ||
    command.type === "hover" ||
    command.type === "grab" ||
    command.type === "drag" ||
    command.type === "release" ||
    command.type === "resume" ||
    command.type === "page-cursor" ||
    command.type === "page-select" ||
    command.type === "page-scroll"
  );
}

export function useOSBuddyAirControl({
  enabled,
  airPilotActive,
  wakeListening,
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
  const previousFrameRef = useRef<OSBuddyAirControlFrame | null>(null);
  const cursorSmootherRef = useRef(new OSBuddyAirPointSmoother(0.48));
  const stableGestureRef = useRef(new OSBuddyAirStableValue<OSBuddyAirControlGesture>(110));
  const closedFistSinceRef = useRef<number | null>(null);
  const lostHandNotifiedRef = useRef(false);
  const lastCommandAtRef = useRef<Record<string, number>>({});
  const fpsWindowRef = useRef<number[]>([]);
  const lastGestureRef = useRef<OSBuddyAirControlGesture | null>(null);
  const onCommandRef = useRef(onCommand);
  const activeRef = useRef(airPilotActive);
  const wakeListeningRef = useRef(wakeListening);
  const wakeGuardUntilRef = useRef(0);
  const magnetMachineRef = useRef<AirPilotMagnetMachine>(createAirPilotMagnetMachine());
  const previousPalmPointRef = useRef<OSBuddyAirControlPoint | null>(null);
  const dockBoxRef = useRef({ dockPoint, buddyBox });
  const sensorModeRef = useRef<OSBuddyAirControlSensorMode>(sensorMode);
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
    pinchState: "tracking",
    magnetPhase: "tracking",
    magnetTargetLabel: undefined,
    rawCursor: null,
    landmarks: [],
    fps: 0,
  });

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    wakeListeningRef.current = wakeListening;
  }, [wakeListening]);

  useEffect(() => {
    dockBoxRef.current = { dockPoint, buddyBox };
  }, [dockPoint, buddyBox]);

  useEffect(() => {
    sensorModeRef.current = sensorMode;
  }, [sensorMode]);

  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  useEffect(() => {
    const wasActive = activeRef.current;
    activeRef.current = airPilotActive;

    if (airPilotActive && !wasActive) {
      wakeGuardUntilRef.current = performance.now() + AIRPILOT_WAKE_GUARD_MS;
      magnetMachineRef.current = createAirPilotMagnetMachine();
      previousPalmPointRef.current = null;
      useOSBuddyStore.getState().setAirPilotPinchState("tracking");
      useOSBuddyStore.getState().setAirTouchState("tracking");
    }

    if (!airPilotActive) {
      cursorSmootherRef.current.reset();
      magnetMachineRef.current = createAirPilotMagnetMachine();
      previousPalmPointRef.current = null;
      useOSBuddyStore.getState().setAirControlTarget(null);
      useOSBuddyStore.getState().setAirControlLandmarks([]);
      useOSBuddyStore.getState().setAirPilotPinchState("tracking");
      useOSBuddyStore.getState().setAirTouchState("inactive");
    }
  }, [airPilotActive]);

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
      if (!shouldBypassCommandCooldown(command)) {
        const previousAt = lastCommandAtRef.current[command.type] ?? 0;
        if (now - previousAt < COMMAND_COOLDOWN_MS) return false;
        lastCommandAtRef.current[command.type] = now;
      }

      onCommandRef.current(command);
      return true;
    };

    const currentHitbox = () => {
      const { dockPoint: dock, buddyBox: box } = dockBoxRef.current;
      return {
        x: dock.x,
        y: dock.y,
        width: box.width,
        height: box.height,
      };
    };

    const updateDebug = (params: {
      frame: OSBuddyAirControlFrame;
      gesture: OSBuddyAirControlGesture | null;
      target: OSBuddyAirControlPoint | null;
      rawCursor?: OSBuddyAirControlPoint | null;
      now: number;
      latencyMs: number;
      pinchState?: OSBuddyAirControlDebugState["pinchState"];
    }) => {
      const fpsWindow = fpsWindowRef.current.filter((timestamp) => params.now - timestamp < 1_000);
      fpsWindow.push(params.now);
      fpsWindowRef.current = fpsWindow;
      const storeState = useOSBuddyStore.getState();
      const magnet = magnetMachineRef.current;
      const magnetTarget = magnet.lockedTarget ?? magnet.candidateTarget;

      setDebugState({
        handCount: params.frame.handCount,
        gesture: params.gesture,
        confidence: params.frame.primaryHand?.confidence ?? 0,
        target: params.target,
        fingertip: params.target,
        state: activeRef.current ? "tracking" : "inactive",
        hitbox: currentHitbox(),
        sensorMode: sensorModeRef.current,
        quality: storeState.airControlQuality,
        latencyMs: params.latencyMs,
        pinchState: params.pinchState ?? "tracking",
        magnetPhase: magnet.phase,
        magnetTargetLabel: magnetTarget?.label,
        rawCursor: params.rawCursor ?? params.target,
        landmarks: params.frame.primaryHand?.landmarks ?? [],
        fps: fpsWindow.length,
      });
    };

    const setGesture = (gesture: OSBuddyAirControlGesture | null) => {
      if (lastGestureRef.current === gesture) return;
      lastGestureRef.current = gesture;
      useOSBuddyStore.getState().setAirControlGesture(gesture);
    };

    const handleNoHand = (frame: OSBuddyAirControlFrame, now: number, latencyMs: number) => {
      const state = useOSBuddyStore.getState();
      state.setAirControlRawPoint(null);
      state.setAirControlLandmarks([]);
      state.setAirControlTarget(null);
      state.setAirPilotPinchState("tracking");
      magnetMachineRef.current = createAirPilotMagnetMachine();
      previousPalmPointRef.current = null;

      if (!activeRef.current) {
        state.setAirControlStatus("wake-listening");
        state.setAirTouchState("inactive");
        updateDebug({ frame, gesture: null, target: null, now, latencyMs, pinchState: "tracking" });
        previousFrameRef.current = frame;
        return;
      }

      const lastSeenAt = lastSeenAtRef.current;
      if (lastSeenAt > 0 && now - lastSeenAt >= LOST_HAND_MS && !lostHandNotifiedRef.current) {
        lostHandNotifiedRef.current = true;
        cursorSmootherRef.current.reset();
        stableGestureRef.current.reset();
        closedFistSinceRef.current = null;
        setGesture(null);
        state.setAirControlStatus("paused");
        emitCommand({ type: "lost-hand" }, now);
      }

      updateDebug({ frame, gesture: null, target: null, now, latencyMs, pinchState: "tracking" });
      previousFrameRef.current = frame;
    };

    const handleWakeListening = (params: {
      frame: OSBuddyAirControlFrame;
      gesture: OSBuddyAirControlGesture;
      rawGesture: OSBuddyAirControlGesture;
      cursor: OSBuddyAirControlPoint | null;
      now: number;
      latencyMs: number;
    }) => {
      const state = useOSBuddyStore.getState();
      state.setAirControlStatus("wake-listening");
      state.setAirTouchState("inactive");
      state.setAirControlLandmarks(params.frame.primaryHand?.landmarks ?? []);
      state.setAirControlTarget(null);
      state.setAirPilotPinchState("tracking");

      if (params.gesture === "OK_Open" || params.rawGesture === "OK_Open") {
        emitCommand({ type: "wake", gesture: "OK_Open", point: params.cursor }, params.now);
      }

      updateDebug({
        frame: params.frame,
        gesture: params.gesture,
        target: null,
        now: params.now,
        latencyMs: params.latencyMs,
        pinchState: "tracking",
      });
    };

    const handleAirPilotFrame = (params: {
      frame: OSBuddyAirControlFrame;
      gesture: OSBuddyAirControlGesture;
      primaryHand: OSBuddyAirControlHand;
      cursor: OSBuddyAirControlPoint | null;
      rawCursor: OSBuddyAirControlPoint | null;
      now: number;
      latencyMs: number;
    }) => {
      const state = useOSBuddyStore.getState();
      state.setAirControlStatus("tracking");
      state.setAirTouchState("tracking");
      state.setAirControlLandmarks(params.primaryHand.landmarks);

      if (params.gesture !== "Closed_Fist") {
        closedFistSinceRef.current = null;
      }

      let displayCursor: OSBuddyAirControlPoint | null = params.cursor;
      let pinchState: OSBuddyAirControlDebugState["pinchState"] = "tracking";

      if (params.cursor) {
        const thumbIndexRatio = getAirPilotThumbIndexRatio(params.primaryHand);
        const magnetTarget = resolveNearestAirPilotMagnetTarget(
          params.cursor,
          AIRPILOT_MAGNET_RADIUS_PX,
        );
        const magnetUpdate = updateAirPilotMagnetMachine({
          previous: magnetMachineRef.current,
          now: params.now,
          rawCursor: params.rawCursor ?? params.cursor,
          target: magnetTarget,
          thumbIndexRatio,
          wakeGuardUntil: wakeGuardUntilRef.current,
        });
        magnetMachineRef.current = magnetUpdate.state;
        displayCursor = magnetUpdate.cursor;
        pinchState = magnetUpdate.pinchState;

        if (displayCursor) {
          state.setAirControlTarget(displayCursor);
          state.setAirPilotPinchState(pinchState);
          emitCommand(
            {
              type: "page-cursor",
              point: displayCursor,
              gesture: params.gesture,
              pinchState,
            },
            params.now,
          );
        }
        if (magnetUpdate.selectedPoint) {
          emitCommand(
            {
              type: "page-select",
              point: magnetUpdate.selectedPoint,
              gesture: params.gesture,
              pinchState,
            },
            params.now,
          );
        }
      } else {
        magnetMachineRef.current = createAirPilotMagnetMachine();
        state.setAirControlTarget(null);
        state.setAirPilotPinchState("tracking");
      }

      const magnetLocked = magnetMachineRef.current.phase === "locked";

      if (!magnetLocked && params.gesture === "Open_Palm") {
        const palmPoint = mapHandPointToViewport({
          point: getAirPilotPalmCenter(params.primaryHand),
          viewport,
        });
        const previousPalmPoint = previousPalmPointRef.current;
        previousPalmPointRef.current = palmPoint;

        if (palmPoint && previousPalmPoint) {
          const deltaY = (palmPoint.y - previousPalmPoint.y) * AIRPILOT_SCROLL_MULTIPLIER;
          if (Math.abs(deltaY) >= AIRPILOT_SCROLL_MIN_DELTA_PX) {
            emitCommand(
              {
                type: "page-scroll",
                point: displayCursor ?? palmPoint,
                deltaY,
                gesture: params.gesture,
              },
              params.now,
            );
          }
        }
      } else {
        previousPalmPointRef.current = null;
      }

      if (params.gesture === "Closed_Fist") {
        cursorSmootherRef.current.reset();
        state.setAirControlTarget(null);
        emitCommand({ type: "hold", gesture: params.gesture }, params.now);
        closedFistSinceRef.current ??= params.now;
        if (params.now - closedFistSinceRef.current >= CLOSED_FIST_EXIT_MS) {
          emitCommand({ type: "exit", gesture: params.gesture }, params.now);
        }
      }

      updateDebug({
        frame: params.frame,
        gesture: params.gesture,
        target: displayCursor,
        rawCursor: params.rawCursor,
        now: params.now,
        latencyMs: params.latencyMs,
        pinchState,
      });
    };

    const handleResult = (result: GestureRecognizerResult, now: number, latencyMs: number) => {
      const hands = getHandsFromResult(result);
      const primaryHand = selectPrimaryAirControlHand(hands);
      const frame: OSBuddyAirControlFrame = {
        handCount: hands.length,
        primaryHand,
        now,
      };

      if (!primaryHand) {
        handleNoHand(frame, now, latencyMs);
        return;
      }

      lostHandNotifiedRef.current = false;
      lastSeenAtRef.current = now;
      useOSBuddyStore.getState().markAirControlHandSeen(Date.now());

      const rawTip = getIndexTipPoint(primaryHand);
      useOSBuddyStore.getState().setAirControlRawPoint(rawTip);

      const rawGesture = resolveAirControlGesture(primaryHand);
      const swipeGesture = detectOpenPalmSwipe({
        current: frame,
        previous: previousFrameRef.current,
        gesture: rawGesture,
      });
      const stableGesture = stableGestureRef.current.update(swipeGesture ?? rawGesture, now);
      const gesture = swipeGesture ?? stableGesture ?? rawGesture;
      const rawCursor = mapHandPointToViewport({
        point: rawTip,
        viewport,
      });
      const cursor = rawCursor ? cursorSmootherRef.current.update(rawCursor) : null;

      setGesture(gesture);

      if (!activeRef.current) {
        handleWakeListening({ frame, gesture, rawGesture, cursor, now, latencyMs });
        previousFrameRef.current = frame;
        return;
      }

      handleAirPilotFrame({ frame, gesture, primaryHand, cursor, rawCursor, now, latencyMs });
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
      cursorSmootherRef.current.reset();
      stableGestureRef.current.reset();
      magnetMachineRef.current = createAirPilotMagnetMachine();
      previousPalmPointRef.current = null;
      useOSBuddyStore.getState().setAirControlTarget(null);
      useOSBuddyStore.getState().setAirControlRawPoint(null);
      useOSBuddyStore.getState().setAirControlLandmarks([]);
      useOSBuddyStore.getState().setAirPilotPinchState("tracking");
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
            ? "AirPilot 需要 HTTPS 或 localhost。"
            : "AirPilot needs HTTPS or localhost.",
        );
        return;
      }

      store.showBubble(
        locale === "zh-TW"
          ? "AirPilot 會用相機追蹤 21 個手部關鍵點，畫面只會在你的裝置上處理。"
          : "AirPilot will use your camera to track 21 hand landmarks. Video stays on this device.",
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
            ? "相機權限未開啟，AirPilot 先暫停。"
            : "Camera permission was not enabled, so AirPilot is paused.",
        );
        return;
      }

      try {
        useOSBuddyStore.getState().setAirControlStatus("loading-model");
        const { FilesetResolver, GestureRecognizer: GestureRecognizerTask } = await import(
          "@mediapipe/tasks-vision"
        );
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        const recognizerOptions = {
          runningMode: "VIDEO" as const,
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        };
        const createRecognizer = (delegate: "GPU" | "CPU") =>
          GestureRecognizerTask.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: GESTURE_MODEL_URL,
              delegate,
            },
            ...recognizerOptions,
          });
        let recognizer: GestureRecognizer;
        try {
          recognizer = await createRecognizer("GPU");
        } catch {
          recognizer = await createRecognizer("CPU");
        }
        if (cancelled) {
          recognizer.close();
          return;
        }

        recognizerRef.current = recognizer;
        useOSBuddyStore
          .getState()
          .setAirControlStatus(activeRef.current ? "tracking" : "wake-listening");
        if (wakeListeningRef.current && !activeRef.current) {
          store.showBubble(
            locale === "zh-TW"
              ? "AirPilot 待命中。做 OK 手勢即可開始凌空控制。"
              : "AirPilot is listening. Make an OK gesture to start.",
            "system",
            { force: true, durationMs: 3_600 },
          );
        }
        frameRef.current = window.requestAnimationFrame(loop);
      } catch {
        if (cancelled) return;
        fail(
          "model-error",
          locale === "zh-TW"
            ? "手勢模型載入失敗，AirPilot 先關閉。"
            : "The hand gesture model failed to load, so AirPilot is off.",
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
