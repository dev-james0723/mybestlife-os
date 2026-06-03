"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  ChevronUp,
  Crosshair,
  Eye,
  EyeOff,
  Hand,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { useOSBuddyAirControl } from "@/hooks/use-os-buddy-air-control";
import { saveLocalAirControlCalibration } from "@/lib/os-buddy/air-control/air-control-settings";
import type {
  OSBuddyAirControlCommand,
  OSBuddyAirControlQuality,
  OSBuddyAirControlSensorMode,
} from "@/lib/os-buddy/os-buddy-air-control-types";
import {
  getLocalOSBuddyAirPilotSettings,
  saveLocalOSBuddyAirPilotSettings,
} from "@/lib/os-buddy/os-buddy-airpilot-settings";
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
          ? "AirPilot 已關閉"
          : "AirPilot off";
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
  locale,
  viewport,
  dockPoint,
  buddyBox,
  onCommand,
}: OSBuddyAirControlOverlayProps) {
  const status = useOSBuddyStore((s) => s.airControlStatus);
  const cursor = useOSBuddyStore((s) => s.airControlTarget);
  const selectState = useOSBuddyStore((s) => s.airPilotSelectState);
  const sensorMode = useOSBuddyStore((s) => s.airControlSensorMode);
  const quality = useOSBuddyStore((s) => s.airControlQuality);
  const calibration = useOSBuddyStore((s) => s.airControlCalibration);
  const debugEnabled = useOSBuddyStore((s) => s.airControlDebugEnabled);
  const plusMode = useOSBuddyStore((s) => s.airPilotPlusMode);
  const plusCountdown = useOSBuddyStore((s) => s.airPilotPlusCountdown);
  const plusDomain = useOSBuddyStore((s) => s.airPilotPlusDomain);
  const plusActionPreviewLabel = useOSBuddyStore((s) => s.airPilotPlusActionPreviewLabel);
  const setDebugEnabled = useOSBuddyStore((s) => s.setAirControlDebugEnabled);
  const clearAirControlCalibration = useOSBuddyStore((s) => s.clearAirControlCalibration);
  const [calibrating, setCalibrating] = useState(false);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [hudHidden, setHudHidden] = useState(() => getLocalOSBuddyAirPilotSettings().hudHidden);
  const { videoRef, debugState } = useOSBuddyAirControl({
    enabled: runtimeEnabled,
    airPilotActive,
    locale,
    viewport,
    dockPoint,
    buddyBox,
    sensorMode,
    calibration,
    onCommand,
  });
  const zh = locale === "zh-TW";
  const keepControlsExpanded =
    status === "requesting-permission" ||
    status === "loading-model" ||
    status === "error" ||
    calibrating ||
    Boolean(pairingUrl);
  const panelExpanded = airPilotActive && (controlsExpanded || keepControlsExpanded);
  const hudVisible = airPilotActive && !hudHidden;
  const plusCountdownVisible = airPilotActive && plusCountdown.kind !== "inactive";
  const plusActiveVisible = airPilotActive && plusMode === "plusActive";
  const plusStatusVisible = plusCountdownVisible || plusActiveVisible;
  const hudFrameClass =
    "left-[max(env(safe-area-inset-left),1rem)] top-[calc(env(safe-area-inset-top)+1rem)] h-[clamp(99px,25.5vw,144px)] w-[clamp(132px,34vw,192px)] rounded-lg";

  const statusTone = useMemo(
    () =>
      cn(
        "bg-muted text-muted-foreground",
        status === "tracking" && "bg-emerald-500/12 text-emerald-600",
        status === "paused" && "bg-amber-500/12 text-amber-600",
        status === "error" && "bg-destructive/12 text-destructive",
      ),
    [status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (airPilotActive) {
        setControlsExpanded(true);
        return;
      }

      setControlsExpanded(false);
      setPairingUrl(null);
      setCalibrating(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [airPilotActive]);

  useEffect(() => {
    if (!airPilotActive) {
      return;
    }
    if (!controlsExpanded || keepControlsExpanded) return;
    const timer = window.setTimeout(() => setControlsExpanded(false), 5_000);
    return () => window.clearTimeout(timer);
  }, [airPilotActive, controlsExpanded, keepControlsExpanded, status]);

  const setHudHiddenPersisted = (hidden: boolean) => {
    setHudHidden(hidden);
    const current = getLocalOSBuddyAirPilotSettings();
    saveLocalOSBuddyAirPilotSettings({ ...current, hudHidden: hidden });
  };

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
    setControlsExpanded(true);
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
          hudVisible
            ? cn(
                "z-[2147482995] border border-border/70 bg-black opacity-75 shadow-lg shadow-black/20",
                hudFrameClass,
              )
            : "left-0 top-0 h-px w-px -translate-x-full opacity-0",
        )}
      />

      {airPilotActive && cursor ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[2147483001] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_0_0_3px_rgba(239,68,68,0.18),0_0_10px_rgba(239,68,68,0.65)]"
          style={{ left: cursor.x, top: cursor.y }}
        />
      ) : null}

      {plusActiveVisible && debugState.circleTrail.length > 1 ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[2147483001] h-screen w-screen"
        >
          <polyline
            points={debugState.circleTrail
              .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
              .join(" ")}
            fill="none"
            stroke="rgba(52, 211, 153, 0.82)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            className="drop-shadow-[0_0_8px_rgba(52,211,153,0.45)]"
          />
        </svg>
      ) : null}

      {plusStatusVisible ? (
        <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+1rem)] z-[2147483002] w-[min(calc(100vw-2rem),18rem)] -translate-x-1/2 rounded-full border border-emerald-300/45 bg-background/92 px-3 py-2 text-xs text-foreground shadow-lg shadow-black/15 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-medium">
              {plusCountdown.kind === "plusActivation"
                ? zh
                  ? "AI Pilot Plus 啟動中"
                  : "AI Pilot Plus activating"
                : plusCountdown.kind === "plusExit"
                  ? zh
                    ? "AI Pilot Plus 退出中"
                    : "AI Pilot Plus exiting"
                  : zh
                    ? "AI Pilot Plus 已啟動"
                    : "AI Pilot Plus Active"}
            </span>
            <span className="shrink-0 text-[11px] text-emerald-500">
              {plusCountdownVisible
                ? `${Math.round(plusCountdown.progress * 100)}%`
                : "ON"}
            </span>
          </div>
          {plusCountdownVisible ? (
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-100"
                style={{ width: `${Math.round(plusCountdown.progress * 100)}%` }}
              />
            </div>
          ) : null}
          {plusActiveVisible && (plusActionPreviewLabel || plusDomain) ? (
            <div className="mt-1 truncate text-[11px] text-muted-foreground">
              {plusActionPreviewLabel ?? plusDomain}
            </div>
          ) : null}
        </div>
      ) : null}

      {hudVisible ? (
        <div className={cn("pointer-events-none fixed z-[2147482996] overflow-hidden", hudFrameClass)}>
          <SkeletonOverlay landmarks={debugState.landmarks} />
          <div className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
            {debugState.landmarks.length}
          </div>
          <button
            type="button"
            onClick={() => setHudHiddenPersisted(true)}
            className="pointer-events-auto absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={zh ? "隱藏 HUD" : "Hide HUD"}
            title={zh ? "隱藏 HUD" : "Hide HUD"}
          >
            <EyeOff className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {airPilotActive ? (
        <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-[2147482997] w-[min(calc(100vw-1.5rem),25rem)] -translate-x-1/2">
          {panelExpanded ? (
            <div
              className={cn(
                "pointer-events-auto rounded-2xl border border-border/70 bg-background/92 p-2.5 text-xs text-muted-foreground shadow-xl shadow-black/15 backdrop-blur-md",
                status === "tracking" && "border-emerald-400/45",
                status === "paused" && "border-amber-400/55",
                status === "error" && "border-destructive/60",
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", statusTone)}>
                  <Camera className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {getStatusLabel(locale, status, airPilotActive)}
                  </div>
                  <div className="truncate text-[11px]">
                    {getSensorLabel(locale, sensorMode, quality)} · {selectState}
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCalibrating(true)}
                  className="flex min-h-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  aria-label={zh ? "校準" : "Calibrate"}
                  title={zh ? "校準" : "Calibrate"}
                >
                  <Crosshair className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={resetCalibration}
                  disabled={!calibration}
                  className="flex min-h-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-40"
                  aria-label={zh ? "重設校準" : "Reset calibration"}
                  title={zh ? "重設校準" : "Reset calibration"}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={startPhonePairing}
                  className="flex min-h-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  aria-label={zh ? "用手機相機" : "Use phone camera"}
                  title={zh ? "用手機相機" : "Use phone camera"}
                >
                  <Smartphone className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setHudHiddenPersisted(!hudHidden)}
                  className="flex min-h-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  aria-label={hudHidden ? (zh ? "顯示 HUD" : "Show HUD") : zh ? "隱藏 HUD" : "Hide HUD"}
                  title={hudHidden ? (zh ? "顯示 HUD" : "Show HUD") : zh ? "隱藏 HUD" : "Hide HUD"}
                >
                  {hudHidden ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                </button>
              </div>

              {pairingUrl ? (
                <div className="mt-2 rounded-lg border border-border/70 bg-muted/55 p-2 text-[11px]">
                  <p className="mb-1 font-medium text-foreground">
                    {zh ? "在手機開啟此連結" : "Open this link on your phone"}
                  </p>
                  <p className="break-all rounded bg-background/80 px-2 py-1 text-[10px] text-foreground">
                    {pairingUrl}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPairingUrl(null)}
                    className="mt-2 min-h-11 rounded-full bg-background px-3 py-2 text-[10px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    {zh ? "關閉" : "Dismiss"}
                  </button>
                </div>
              ) : null}

              {debugEnabled ? (
                <div className="mt-2 rounded-lg border border-border/70 bg-muted/55 p-2 text-[11px]">
                  <div className="mb-2 flex items-center justify-between font-medium text-foreground">
                    <span className="flex items-center gap-2">
                      <Hand className="size-3.5" aria-hidden="true" />
                      <span>AirPilot Debug</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDebugEnabled(!debugEnabled)}
                      className="min-h-11 rounded-full bg-background px-3 py-2 text-[10px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {zh ? "隱藏" : "Hide"}
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
                    <dt>Select</dt>
                    <dd className="truncate text-foreground">{debugState.selectState}</dd>
                    <dt>Tap</dt>
                    <dd className="truncate text-foreground">
                      {debugState.indexTapScore == null ? "none" : debugState.indexTapScore.toFixed(3)}
                    </dd>
                    <dt>Magnet</dt>
                    <dd className="truncate text-foreground">{debugState.magnetPhase}</dd>
                    <dt>Target</dt>
                    <dd className="truncate text-foreground">{debugState.magnetTargetLabel ?? "None"}</dd>
                    <dt>Raw</dt>
                    <dd className="text-foreground">
                      {debugState.rawCursor
                        ? `${Math.round(debugState.rawCursor.x)}, ${Math.round(debugState.rawCursor.y)}`
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
          ) : (
            <button
              type="button"
              onClick={() => setControlsExpanded(true)}
              className="pointer-events-auto mx-auto flex h-11 w-24 items-start justify-center rounded-t-full border border-border/70 bg-background/92 pt-2 text-muted-foreground shadow-xl shadow-black/15 backdrop-blur-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={zh ? "展開 AirPilot 控制" : "Expand AirPilot controls"}
              title={zh ? "展開 AirPilot 控制" : "Expand AirPilot controls"}
            >
              <ChevronUp className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : null}

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
