"use client";

import { useEffect, useRef, useState } from "react";
import { getIndexTipPoint, resolveAirControlGesture } from "@/lib/os-buddy/air-control/gestures";
import {
  AIR_REMOTE_PACKET_VERSION,
  encodeAirRemotePacket,
  type AirRemotePacket,
} from "@/lib/os-buddy/air-control/transport/air-remote-packet";
import { createSupabaseRealtimeSignaling } from "@/lib/os-buddy/air-control/transport/signaling-adapter";
import {
  createAirRtcConnection,
  isWebRtcSupported,
  type AirRtcConnection,
} from "@/lib/os-buddy/air-control/transport/webrtc-data-channel";
import type { OSBuddyAirControlHand } from "@/lib/os-buddy/os-buddy-air-control-types";

const MEDIAPIPE_VERSION = "0.10.35";
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const GESTURE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task";

type Status = "idle" | "connecting" | "camera" | "streaming" | "error";

/**
 * Phone-side Air Touch remote. Runs MediaPipe locally and sends ONLY small
 * landmark/gesture packets to the paired desktop over an unreliable WebRTC data
 * channel. Raw video never leaves the phone. SSR-safe (all browser APIs in
 * effects, MediaPipe lazy-imported).
 */
export function OSBuddyAirRemoteClient({ locale = "en" }: { locale?: string }) {
  const zh = locale === "zh-TW";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const connectionRef = useRef<AirRtcConnection | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session"));
  }, []);

  const stop = () => {
    connectionRef.current?.close();
    connectionRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  };

  const start = async () => {
    if (!sessionId) {
      setError(zh ? "缺少配對工作階段。" : "Missing pairing session.");
      return;
    }
    if (!isWebRtcSupported() || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError(zh ? "此瀏覽器不支援所需功能。" : "This browser is missing required features.");
      return;
    }

    try {
      setStatus("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      setStatus("connecting");
      const signaling = createSupabaseRealtimeSignaling({ sessionId, role: "phone" });
      const connection = await createAirRtcConnection({ role: "phone", signaling });
      connectionRef.current = connection;

      const { FilesetResolver, GestureRecognizer } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: GESTURE_MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      setStatus("streaming");
      let sequence = 0;
      let lastVideoTime = -1;

      const loop = () => {
        if (!connectionRef.current) {
          recognizer.close();
          return;
        }
        const now = performance.now();
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const result = recognizer.recognizeForVideo(video, now) as {
            landmarks: Array<Array<{ x: number; y: number; z?: number }>>;
            gestures: Array<Array<{ categoryName?: string; score?: number }>>;
          };
          const landmarks = result.landmarks?.[0];
          if (landmarks) {
            const gestureCat = result.gestures?.[0]?.[0];
            const hand: OSBuddyAirControlHand = {
              landmarks,
              handedness: "Unknown",
              confidence: gestureCat?.score ?? 0.6,
              gestureName: gestureCat?.categoryName ?? null,
              gestureScore: gestureCat?.score ?? 0,
            };
            const tip = getIndexTipPoint(hand);
            const packet: AirRemotePacket = {
              version: AIR_REMOTE_PACKET_VERSION,
              sessionId,
              sourceId: "phone",
              timestampMs: now,
              sequence: sequence++,
              sensorMode: "phone-rgb",
              gesture: { name: resolveAirControlGesture(hand), score: hand.gestureScore },
              imageLandmarks: tip ? landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z })) : undefined,
            };
            connectionRef.current.send(encodeAirRemotePacket(packet));
          }
        }
        window.requestAnimationFrame(loop);
      };
      window.requestAnimationFrame(loop);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
      stop();
    }
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-4 p-4">
      <h1 className="text-lg font-semibold">{zh ? "OS Buddy 隔空遙控" : "OS Buddy Air Remote"}</h1>
      <video ref={videoRef} className="aspect-video w-full rounded-lg bg-black object-cover" playsInline muted />
      <p className="text-sm text-muted-foreground">
        {status === "streaming"
          ? zh
            ? "已連線：手勢正在傳送（影像留在手機）。"
            : "Connected: sending gestures (video stays on this phone)."
          : zh
            ? "把手機相機對準你的手，然後開始。"
            : "Aim the phone camera at your hand, then start."}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-3">
        {status === "streaming" || status === "connecting" ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-full bg-muted px-5 py-2 text-sm font-medium"
          >
            {zh ? "停止" : "Stop"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={!sessionId}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {zh ? "開始" : "Start"}
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {zh ? `工作階段：${sessionId ?? "—"}` : `Session: ${sessionId ?? "—"}`}
      </p>
    </div>
  );
}
