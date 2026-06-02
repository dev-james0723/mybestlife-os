"use client";

import { Camera, Hand } from "lucide-react";
import { useOSBuddyAirControl } from "@/hooks/use-os-buddy-air-control";
import type { OSBuddyAirControlCommand } from "@/lib/os-buddy/os-buddy-air-control-types";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import { cn } from "@/lib/utils";

type OSBuddyAirControlOverlayProps = {
  active: boolean;
  locale: string;
  viewport: { width: number; height: number };
  onCommand: (command: OSBuddyAirControlCommand) => void;
};

function getStatusLabel(locale: string, status: string) {
  const zh = locale === "zh-TW";
  switch (status) {
    case "requesting-permission":
      return zh ? "等待相機權限" : "Camera permission";
    case "loading-model":
      return zh ? "載入手勢模型" : "Loading gestures";
    case "tracking":
      return zh ? "隔空操控模式" : "Air Control Mode";
    case "paused":
      return zh ? "隔空操控暫停" : "Air Control paused";
    case "error":
      return zh ? "隔空操控錯誤" : "Air Control error";
    default:
      return zh ? "隔空操控模式" : "Air Control Mode";
  }
}

export function OSBuddyAirControlOverlay({
  active,
  locale,
  viewport,
  onCommand,
}: OSBuddyAirControlOverlayProps) {
  const status = useOSBuddyStore((s) => s.airControlStatus);
  const gesture = useOSBuddyStore((s) => s.airControlGesture);
  const { videoRef, debugState } = useOSBuddyAirControl({
    enabled: active,
    locale,
    viewport,
    onCommand,
  });
  const showDebug = process.env.NODE_ENV !== "production";

  if (!active) return null;

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

      <div className="pointer-events-none fixed bottom-4 right-4 z-[44] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-lg shadow-black/10 backdrop-blur-md",
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
          {gesture ? (
            <span className="hidden max-w-28 truncate rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground sm:inline">
              {gesture}
            </span>
          ) : null}
        </div>

        {showDebug ? (
          <div className="w-64 rounded-lg border border-border/70 bg-background/92 p-3 text-[11px] text-muted-foreground shadow-lg shadow-black/10 backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
              <Hand className="size-3.5" aria-hidden="true" />
              <span>Air Control Debug</span>
            </div>
            <dl className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1">
              <dt>Status</dt>
              <dd className="truncate text-foreground">{status}</dd>
              <dt>Hands</dt>
              <dd className="text-foreground">{debugState.handCount}</dd>
              <dt>Gesture</dt>
              <dd className="truncate text-foreground">{debugState.gesture ?? "None"}</dd>
              <dt>Confidence</dt>
              <dd className="text-foreground">{debugState.confidence.toFixed(2)}</dd>
              <dt>Target</dt>
              <dd className="text-foreground">
                {debugState.target
                  ? `${Math.round(debugState.target.x)}, ${Math.round(debugState.target.y)}`
                  : "none"}
              </dd>
              <dt>FPS</dt>
              <dd className="text-foreground">{debugState.fps}</dd>
            </dl>
          </div>
        ) : null}
      </div>
    </>
  );
}
