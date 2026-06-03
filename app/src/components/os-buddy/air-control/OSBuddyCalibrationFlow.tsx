"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { solveScreenPlaneFrom9Points } from "@/lib/os-buddy/air-control/calibration";
import { saveLocalAirControlCalibration } from "@/lib/os-buddy/air-control/air-control-settings";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import { useOSBuddyStore } from "@/stores/os-buddy-store";

type OSBuddyCalibrationFlowProps = {
  open: boolean;
  locale: string;
  viewport: { width: number; height: number };
  onClose: () => void;
};

const GRID = [0.12, 0.5, 0.88];

type Sample = { imagePoint: { x: number; y: number }; screenPoint: { x: number; y: number } };

/**
 * 9-point desktop touch calibration. With Air Touch active (camera running), the
 * user points their index finger at each target and captures. We pair the raw
 * normalized fingertip (from the store) with the on-screen target, then solve a
 * least-squares affine mapping and persist only the resulting numbers.
 *
 * Honest: this single-camera calibration improves 2D accuracy ("Calibrated Air
 * Touch") but does NOT add depth, so it is never labelled "3D".
 */
export function OSBuddyCalibrationFlow({
  open,
  locale,
  viewport,
  onClose,
}: OSBuddyCalibrationFlowProps) {
  const zh = locale === "zh-TW";
  const setAirControlCalibration = useOSBuddyStore((s) => s.setAirControlCalibration);
  const [index, setIndex] = useState(0);
  const [samples, setSamples] = useState<Sample[]>([]);

  const targets = useMemo(
    () =>
      GRID.flatMap((fy) =>
        GRID.map((fx) => ({ x: fx * viewport.width, y: fy * viewport.height })),
      ),
    [viewport.width, viewport.height],
  );

  const finish = useCallback(
    (collected: Sample[]) => {
      const calibration = solveScreenPlaneFrom9Points({
        samples: collected,
        screenCssSize: { width: viewport.width, height: viewport.height },
        device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : null,
      });
      setAirControlCalibration(calibration);
      saveLocalAirControlCalibration(calibration);
      emitOSBuddyEvent({
        type: "buddy:air-control:calibrated",
        quality: calibration.quality,
        rmsErrorPx: calibration.rmsErrorPx,
      });
      onClose();
    },
    [onClose, setAirControlCalibration, viewport.height, viewport.width],
  );

  const capture = useCallback(() => {
    const raw = useOSBuddyStore.getState().airControlRawPoint;
    if (!raw) return; // need a visible fingertip
    const next = [...samples, { imagePoint: { x: raw.x, y: raw.y }, screenPoint: targets[index] }];
    if (next.length >= targets.length) {
      finish(next);
      return;
    }
    setSamples(next);
    setIndex((i) => i + 1);
  }, [finish, index, samples, targets]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        capture();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, capture, onClose]);

  if (!open) return null;

  const target = targets[index];

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm">
      {/* Target */}
      <div
        className="absolute size-10 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-4 border-emerald-500 bg-emerald-400/30"
        style={{ left: target.x, top: target.y }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-10 flex flex-col items-center gap-2 text-center">
        <p className="rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow">
          {zh
            ? `用食指指向綠色圓點，然後按空白鍵擷取（${index + 1}/${targets.length}）`
            : `Point your index finger at the green dot, then press Space to capture (${index + 1}/${targets.length})`}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-10 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={capture}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          {zh ? "擷取" : "Capture"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-muted px-5 py-2 text-sm font-medium text-foreground shadow hover:bg-muted/80"
        >
          {zh ? "取消" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
