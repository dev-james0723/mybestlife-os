"use client";

import { useState } from "react";
import { Camera, Crosshair, Hand, RotateCcw, Smartphone, X } from "lucide-react";
import { useOSBuddyAirControl } from "@/hooks/use-os-buddy-air-control";
import { saveLocalAirControlCalibration } from "@/lib/os-buddy/air-control/air-control-settings";
import type {
  OSBuddyAirControlCommand,
  OSBuddyAirControlQuality,
  OSBuddyAirControlSensorMode,
  OSBuddyAirTouchState,
} from "@/lib/os-buddy/os-buddy-air-control-types";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import { cn } from "@/lib/utils";
import { OSBuddyCalibrationFlow } from "./air-control/OSBuddyCalibrationFlow";

type OSBuddyAirControlOverlayProps = {
  active: boolean;
  locale: string;
  viewport: { width: number; height: number };
  dockPoint: { x: number; y: number };
  buddyBox: { width: number; height: number };
  onCommand: (command: OSBuddyAirControlCommand) => void;
};

const HITBOX_PADDING_PX = 36;

function getStatusLabel(locale: string, status: string) {
  const zh = locale === "zh-TW";
  switch (status) {
    case "requesting-permission":
      return zh ? "等待相機權限" : "Camera permission";
    case "loading-model":
      return zh ? "載入手勢模型" : "Loading gestures";
    case "tracking":
      return zh ? "隔空觸碰中" : "Air Touch on";
    case "paused":
      return zh ? "隔空觸碰暫停" : "Air Touch paused";
    case "error":
      return zh ? "隔空觸碰錯誤" : "Air Touch error";
    default:
      return zh ? "隔空觸碰" : "Air Touch";
  }
}

/** Honest sensor label — never claims "3D" unless the source is a calibrated 3D one. */
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
          ? "已校準隔空觸碰"
          : "Calibrated Air Touch"
        : zh
          ? "2D 隔空觸碰"
          : "2D Air Touch";
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

function getCursorColor(state: OSBuddyAirTouchState) {
  switch (state) {
    case "grabbed":
    case "dragging":
      return "border-emerald-400 bg-emerald-400/30";
    case "hovering":
      return "border-amber-400 bg-amber-400/30";
    default:
      return "border-sky-400 bg-sky-400/20";
  }
}

export function OSBuddyAirControlOverlay({
  active,
  locale,
  viewport,
  dockPoint,
  buddyBox,
  onCommand,
}: OSBuddyAirControlOverlayProps) {
  const status = useOSBuddyStore((s) => s.airControlStatus);
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
    enabled: active,
    locale,
    viewport,
    dockPoint,
    buddyBox,
    sensorMode,
    calibration,
    onCommand,
  });
  const zh = locale === "zh-TW";
  const showDebug = debugEnabled || process.env.NODE_ENV !== "production";

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

  if (!active) return null;

  const cursor = debugState.fingertip;

  return (
    <>
      <video
        ref={videoRef}
        aria-hidden="true"
        autoPlay
        muted
        playsInline
        className="fixed left-0 top-0 h-px w-px -translate-x-full opacity-0"
      />

      {/* Virtual touch cursor (the index fingertip). */}
      {cursor ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none fixed z-[46] size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm transition-colors",
            getCursorColor(debugState.state),
          )}
          style={{ left: cursor.x, top: cursor.y }}
        />
      ) : null}

      {/* Debug: OSBuddy hitbox (with padding) + hit crosshair. */}
      {showDebug && debugState.hitbox ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[44] rounded-md border border-dashed border-emerald-400/60"
          style={{
            left: debugState.hitbox.x - HITBOX_PADDING_PX,
            top: debugState.hitbox.y - HITBOX_PADDING_PX,
            width: debugState.hitbox.width + HITBOX_PADDING_PX * 2,
            height: debugState.hitbox.height + HITBOX_PADDING_PX * 2,
          }}
        />
      ) : null}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[47] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
        <div
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-lg shadow-black/10 backdrop-blur-md",
            status === "tracking" && "border-emerald-400/50",
            status === "paused" && "border-amber-400/60",
            status === "error" && "border-destructive/60",
          )}
        >
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground",
              status === "tracking" && "bg-emerald-500/12 text-emerald-600",
              status === "paused" && "bg-amber-500/12 text-amber-600",
              status === "error" && "bg-destructive/12 text-destructive",
            )}
          >
            <Camera className="size-3.5" aria-hidden="true" />
          </span>
          <span className="truncate">{getStatusLabel(locale, status)}</span>
          <span className="hidden rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground sm:inline">
            {getSensorLabel(locale, sensorMode, quality)}
          </span>
          <button
            type="button"
            onClick={() => stopAirControl("user-exit")}
            className="ml-1 flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
            aria-label={zh ? "停止隔空觸碰" : "Stop Air Touch"}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2 py-1 text-[11px] shadow-lg shadow-black/10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setCalibrating(true)}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Crosshair className="size-3.5" aria-hidden="true" />
            <span>{zh ? "校準" : "Calibrate"}</span>
          </button>
          <button
            type="button"
            onClick={resetCalibration}
            disabled={!calibration}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>{zh ? "重設校準" : "Reset"}</span>
          </button>
          <button
            type="button"
            onClick={startPhonePairing}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Smartphone className="size-3.5" aria-hidden="true" />
            <span>{zh ? "用手機相機" : "Phone"}</span>
          </button>
        </div>

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
              className="mt-2 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
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
                <span>Air Touch Debug</span>
              </span>
              <button
                type="button"
                onClick={() => setDebugEnabled(!debugEnabled)}
                className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {debugEnabled ? (zh ? "隱藏" : "Hide") : zh ? "顯示" : "Pin"}
              </button>
            </div>
            <dl className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1">
              <dt>State</dt>
              <dd className="truncate text-foreground">{debugState.state}</dd>
              <dt>Hands</dt>
              <dd className="text-foreground">{debugState.handCount}</dd>
              <dt>Gesture</dt>
              <dd className="truncate text-foreground">{debugState.gesture ?? "None"}</dd>
              <dt>Confidence</dt>
              <dd className="text-foreground">{debugState.confidence.toFixed(2)}</dd>
              <dt>Cursor</dt>
              <dd className="text-foreground">
                {cursor ? `${Math.round(cursor.x)}, ${Math.round(cursor.y)}` : "none"}
              </dd>
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
    </>
  );
}
