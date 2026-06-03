"use client";

import { useState } from "react";
import { Camera, Crosshair, Hand, RotateCcw, Smartphone, X } from "lucide-react";
import { useOSBuddyAirControl } from "@/hooks/use-os-buddy-air-control";
import { saveLocalAirControlCalibration } from "@/lib/os-buddy/air-control/air-control-settings";
import type {
  OSBuddyAirControlCommand,
  OSBuddyAirControlQuality,
  OSBuddyAirControlSensorMode,
} from "@/lib/os-buddy/os-buddy-air-control-types";
import {
  AIRPILOT_EMPHASIZED_LANDMARKS,
  OS_BUDDY_HAND_CONNECTIONS,
} from "@/lib/os-buddy/os-buddy-airpilot-pinch";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import { cn } from "@/lib/utils";
import { OSBuddyCalibrationFlow } from "./air-control/OSBuddyCalibrationFlow";

type OSBuddyAirControlOverlayProps = {
  runtimeEnabled: boolean;
  airPilotActive: boolean;
  wakeListening: boolean;
  locale: string;
  viewport: { width: number; height: number };
  dockPoint: { x: number; y: number };
  buddyBox: { width: number; height: number };
  onCommand: (command: OSBuddyAirControlCommand) => void;
};

function getStatusLabel(locale: string, status: string, active: boolean) {
  const zh = locale === "zh-TW";
  switch (status) {
    case "requesting-permission":
      return zh ? "等待相機權限" : "Camera permission";
    case "loading-model":
      return zh ? "載入手勢模型" : "Loading gestures";
    case "wake-listening":
      return zh ? "AirPilot 待命" : "AirPilot listening";
    case "tracking":
      return active
        ? zh
          ? "AirPilot 凌空控制"
          : "AirPilot control"
        : zh
          ? "AirPilot 待命"
          : "AirPilot listening";
    case "paused":
      return zh ? "AirPilot 暫停" : "AirPilot paused";
    case "error":
      return zh ? "AirPilot 錯誤" : "AirPilot error";
    default:
      return active
        ? zh
          ? "AirPilot 凌空控制"
          : "AirPilot control"
        : zh
          ? "AirPilot 待命"
          : "AirPilot listening";
  }
}

function getSensorLabel(
  locale: string,
  mode: OSBuddyAirControlSensorMode,
  quality: OSBuddyAirControlQuality,
) {
  const zh = locale === "zh-TW";
  const calibrated = quality === "ok" || quality === "good";
  switch (mode) {
    case "rgb-webcam":
      return calibrated
        ? zh
          ? "已校準 2D"
          : "Calibrated 2D"
        : zh
          ? "2D 影像平面"
          : "2D image-plane";
    case "phone-rgb":
      return zh ? "手機相機 (2D)" : "Phone camera (2D)";
    case "phone-ar":
      return zh ? "手機 AR (實驗)" : "Phone AR (experimental)";
    case "stereo":
      return zh ? "雙鏡頭 3D (實驗)" : "Stereo 3D (experimental)";
    case "depth":
      return zh ? "深度 3D (實驗)" : "Depth 3D (experimental)";
    default:
      return zh ? "2D 後備" : "2D fallback";
  }
}

function SkeletonOverlay({
  landmarks,
}: {
  landmarks: Array<{ x: number; y: number; z?: number }>;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {OS_BUDDY_HAND_CONNECTIONS.map(([from, to]) => {
        const a = landmarks[from];
        const b = landmarks[to];
        if (!a || !b) return null;
        return (
          <line
            key={`${from}-${to}`}
            x1={(1 - a.x) * 100}
            y1={a.y * 100}
            x2={(1 - b.x) * 100}
            y2={b.y * 100}
            className="stroke-emerald-300/85"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        );
      })}
      {landmarks.map((landmark, index) => {
        const emphasized = AIRPILOT_EMPHASIZED_LANDMARKS.has(index);
        return (
          <circle
            key={index}
            cx={(1 - landmark.x) * 100}
            cy={landmark.y * 100}
            r={emphasized ? 2.35 : 1.45}
            className={emphasized ? "fill-red-400" : "fill-white"}
            stroke="rgba(5, 12, 20, 0.78)"
            strokeWidth="0.7"
          />
        );
      })}
    </svg>
  );
}

export function OSBuddyAirControlOverlay({
  runtimeEnabled,
  airPilotActive,
  wakeListening,
  locale,
  viewport,
  dockPoint,
  buddyBox,
  onCommand,
}: OSBuddyAirControlOverlayProps) {
  const status = useOSBuddyStore((s) => s.airControlStatus);
  const gesture = useOSBuddyStore((s) => s.airControlGesture);
  const cursor = useOSBuddyStore((s) => s.airControlTarget);
  const pinchState = useOSBuddyStore((s) => s.airPilotPinchState);
  const sensorMode = useOSBuddyStore((s) => s.airControlSensorMode);
  const quality = useOSBuddyStore((s) => s.airControlQuality);
  const calibration = useOSBuddyStore((s) => s.airControlCalibration);
  const debugEnabled = useOSBuddyStore((s) => s.airControlDebugEnabled);
  const setDebugEnabled = useOSBuddyStore((s) => s.setAirControlDebugEnabled);
  const clearAirControlCalibration = useOSBuddyStore((s) => s.clearAirControlCalibration);
  const stopAirControl = useOSBuddyStore((s) => s.stopAirControl);
  const [calibrating, setCalibrating] = useState(false);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const { videoRef, debugState } = useOSBuddyAirControl({
    enabled: runtimeEnabled,
    airPilotActive,
    wakeListening,
    locale,
    viewport,
    dockPoint,
    buddyBox,
    sensorMode,
    calibration,
    onCommand,
  });
  const zh = locale === "zh-TW";
  const showDebug = debugEnabled;
  const showStatusPill =
    airPilotActive ||
    debugEnabled ||
    status === "requesting-permission" ||
    status === "loading-model" ||
    status === "error";

  const resetCalibration = () => {
    clearAirControlCalibration();
    saveLocalAirControlCalibration(null);
  };

  const startPhonePairing = () => {
    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localePrefix = locale === "zh-TW" ? "zh-TW" : locale || "en";
    const url = `${window.location.origin}/${localePrefix}/os-buddy/air-remote?session=${sessionId}`;
    setPairingUrl(url);
  };

  if (!runtimeEnabled) return null;

  return (
    <div data-airpilot-ignore="true">
      <video
        ref={videoRef}
        aria-hidden="true"
        autoPlay
        muted
        playsInline
        className={cn(
          "pointer-events-none fixed scale-x-[-1] object-cover",
          airPilotActive
            ? "bottom-24 right-4 z-[43] h-36 w-48 rounded-lg border border-border/70 bg-black opacity-75 shadow-lg shadow-black/20"
            : "left-0 top-0 h-px w-px -translate-x-full opacity-0",
        )}
      />

      {airPilotActive && cursor ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[48] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_0_0_3px_rgba(239,68,68,0.18),0_0_10px_rgba(239,68,68,0.65)]"
          style={{ left: cursor.x, top: cursor.y }}
        />
      ) : null}

      {airPilotActive ? (
        <div className="pointer-events-none fixed bottom-24 right-4 z-[44] h-36 w-48 overflow-hidden rounded-lg">
          <SkeletonOverlay landmarks={debugState.landmarks} />
          <div className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
            {zh ? "追蹤 21 個手部關鍵點" : "Tracking 21 hand landmarks"}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-4 z-[47] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
        {showStatusPill ? (
          <div
            className={cn(
              "pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-lg shadow-black/10 backdrop-blur-md",
              status === "tracking" && "border-emerald-400/50",
              status === "wake-listening" && "border-sky-400/55",
              status === "paused" && "border-amber-400/60",
              status === "error" && "border-destructive/60",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground",
                status === "tracking" && "bg-emerald-500/12 text-emerald-600",
                status === "wake-listening" && "bg-sky-500/12 text-sky-600",
                status === "paused" && "bg-amber-500/12 text-amber-600",
                status === "error" && "bg-destructive/12 text-destructive",
              )}
            >
              <Camera className="size-3.5" aria-hidden="true" />
            </span>
            <span className="truncate">{getStatusLabel(locale, status, airPilotActive)}</span>
            <span className="hidden rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground sm:inline">
              {getSensorLabel(locale, sensorMode, quality)}
            </span>
            {airPilotActive ? (
              <span className="hidden max-w-24 truncate rounded-full bg-red-500/12 px-2 py-1 text-[11px] text-red-600 sm:inline">
                {pinchState}
              </span>
            ) : gesture ? (
              <span className="hidden max-w-28 truncate rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground sm:inline">
                {gesture}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => stopAirControl("user-exit")}
              className="ml-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={zh ? "停止 AirPilot" : "Stop AirPilot"}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {airPilotActive ? (
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2 py-1 text-[11px] shadow-lg shadow-black/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setCalibrating(true)}
              className="flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Crosshair className="size-3.5" aria-hidden="true" />
              <span>{zh ? "校準" : "Calibrate"}</span>
            </button>
            <button
              type="button"
              onClick={resetCalibration}
              disabled={!calibration}
              className="flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>{zh ? "重設校準" : "Reset"}</span>
            </button>
            <button
              type="button"
              onClick={startPhonePairing}
              className="flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Smartphone className="size-3.5" aria-hidden="true" />
              <span>{zh ? "用手機相機" : "Phone"}</span>
            </button>
          </div>
        ) : null}

        {pairingUrl ? (
          <div className="pointer-events-auto w-64 rounded-lg border border-border/70 bg-background/92 p-3 text-[11px] text-muted-foreground shadow-lg shadow-black/10 backdrop-blur-md">
            <p className="mb-1 font-medium text-foreground">
              {zh ? "在手機開啟此連結" : "Open this link on your phone"}
            </p>
            <p className="break-all rounded bg-muted px-2 py-1 text-[10px] text-foreground">
              {pairingUrl}
            </p>
            <p className="mt-1 text-[10px]">
              {zh
                ? "實驗功能：手機在本機處理手勢，只傳送座標。"
                : "Experimental: the phone processes gestures locally and sends only coordinates."}
            </p>
            <button
              type="button"
              onClick={() => setPairingUrl(null)}
              className="mt-2 min-h-11 rounded bg-muted px-3 py-2 text-[10px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {zh ? "關閉" : "Dismiss"}
            </button>
          </div>
        ) : null}

        {showDebug ? (
          <div className="pointer-events-auto w-64 rounded-lg border border-border/70 bg-background/92 p-3 text-[11px] text-muted-foreground shadow-lg shadow-black/10 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between font-medium text-foreground">
              <span className="flex items-center gap-2">
                <Hand className="size-3.5" aria-hidden="true" />
                <span>AirPilot Debug</span>
              </span>
	              <button
	                type="button"
	                onClick={() => setDebugEnabled(!debugEnabled)}
	                className="min-h-11 rounded bg-muted px-3 py-2 text-[10px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
	              >
                {debugEnabled ? (zh ? "隱藏" : "Hide") : zh ? "顯示" : "Pin"}
              </button>
            </div>
            <dl className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1">
              <dt>Status</dt>
              <dd className="truncate text-foreground">{status}</dd>
              <dt>State</dt>
              <dd className="truncate text-foreground">{debugState.state}</dd>
              <dt>Hands</dt>
              <dd className="text-foreground">{debugState.handCount}</dd>
              <dt>Gesture</dt>
              <dd className="truncate text-foreground">{debugState.gesture ?? "None"}</dd>
              <dt>Pinch</dt>
              <dd className="truncate text-foreground">{debugState.pinchState}</dd>
              <dt>Confidence</dt>
              <dd className="text-foreground">{debugState.confidence.toFixed(2)}</dd>
              <dt>Cursor</dt>
              <dd className="text-foreground">
                {debugState.fingertip
                  ? `${Math.round(debugState.fingertip.x)}, ${Math.round(debugState.fingertip.y)}`
                  : "none"}
              </dd>
              <dt>Landmarks</dt>
              <dd className="text-foreground">{debugState.landmarks.length}</dd>
              <dt>Latency</dt>
              <dd className="text-foreground">{debugState.latencyMs.toFixed(1)} ms</dd>
              <dt>FPS</dt>
              <dd className="text-foreground">{debugState.fps}</dd>
            </dl>
          </div>
        ) : null}
      </div>

      <OSBuddyCalibrationFlow
        key={calibrating ? "calibrating" : "idle"}
        open={calibrating}
        locale={locale}
        viewport={viewport}
        onClose={() => setCalibrating(false)}
      />
    </div>
  );
}
