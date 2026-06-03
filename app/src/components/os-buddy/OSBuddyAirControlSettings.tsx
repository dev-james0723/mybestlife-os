"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLocalAirControlSettings,
  saveLocalAirControlCalibration,
  saveLocalAirControlSettings,
  type OSBuddyAirControlSettings as AirControlSettings,
} from "@/lib/os-buddy/air-control/air-control-settings";
import {
  getLocalOSBuddyAirPilotSettings,
  saveLocalOSBuddyAirPilotSettings,
  type OSBuddyAirPilotSettings,
} from "@/lib/os-buddy/os-buddy-airpilot-settings";
import type { OSBuddyAirControlSensorMode } from "@/lib/os-buddy/os-buddy-air-control-types";
import { useOSBuddyStore } from "@/stores/os-buddy-store";

type Props = { locale: string };

const SENSOR_OPTIONS: Array<{ value: OSBuddyAirControlSensorMode; en: string; zh: string }> = [
  { value: "rgb-webcam", en: "Webcam (2D)", zh: "網路攝影機 (2D)" },
  { value: "phone-rgb", en: "Phone camera (2D)", zh: "手機相機 (2D)" },
  { value: "phone-ar", en: "Phone AR (experimental)", zh: "手機 AR (實驗)" },
  { value: "stereo", en: "Stereo 3D (experimental)", zh: "雙鏡頭 3D (實驗)" },
];

export function OSBuddyAirControlSettings({ locale }: Props) {
  const zh = locale === "zh-TW";
  const setAirControlDebugEnabled = useOSBuddyStore((s) => s.setAirControlDebugEnabled);
  const clearAirControlCalibration = useOSBuddyStore((s) => s.clearAirControlCalibration);
  const calibrationSummary = useOSBuddyStore((s) => s.airControlCalibrationSummary);
  const [settings, setSettings] = useState<AirControlSettings>(getLocalAirControlSettings());
  const [airPilotSettings, setAirPilotSettings] = useState<OSBuddyAirPilotSettings>(
    getLocalOSBuddyAirPilotSettings(),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettings(getLocalAirControlSettings());
      setAirPilotSettings(getLocalOSBuddyAirPilotSettings());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = (patch: Partial<AirControlSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveLocalAirControlSettings(next);
    if (patch.showDebugOverlay !== undefined) setAirControlDebugEnabled(patch.showDebugOverlay);
  };

  const updateAirPilot = (patch: Partial<OSBuddyAirPilotSettings>) => {
    const next = { ...airPilotSettings, ...patch };
    setAirPilotSettings(next);
    saveLocalOSBuddyAirPilotSettings(next);
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-1">
        <p className="font-medium">{zh ? "隔空觸碰 (Air Touch)" : "Air Touch"}</p>
        <p className="text-xs text-muted-foreground">
          {zh
            ? "用食指碰到 OS Buddy 就可以隔空抓住並移動它。四連點 OS Buddy 開啟。"
            : "Reach your index finger onto OS Buddy to grab and move it in the air. Quadruple-tap OS Buddy to start."}
        </p>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-sm">{zh ? "啟用四連點開啟" : "Enable 4-tap activation"}</span>
        <Checkbox
          checked={settings.enableQuadTap}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") update({ enableQuadTap: checked });
          }}
        />
      </label>

      <div className="space-y-1.5">
        <Label className="text-sm">{zh ? "預設感測模式" : "Default sensor mode"}</Label>
        <Select
          value={settings.defaultSensorMode}
          onValueChange={(value) =>
            update({ defaultSensorMode: value as OSBuddyAirControlSensorMode })
          }
        >
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SENSOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {zh ? opt.zh : opt.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-sm">{zh ? "顯示除錯疊層" : "Show debug overlay"}</span>
        <Checkbox
          checked={settings.showDebugOverlay}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") update({ showDebugOverlay: checked });
          }}
        />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-sm">{zh ? "允許手機作為相機" : "Allow phone as a camera"}</span>
        <Checkbox
          checked={settings.allowPhoneRemote}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") update({ allowPhoneRemote: checked });
          }}
        />
      </label>

      <div className="space-y-2 rounded-lg border border-border/70 p-3">
        <p className="text-sm font-medium">AI Pilot Plus</p>
        {[
          {
            key: "plusEnabled" as const,
            label: zh ? "啟用 Plus 手勢" : "Enable Plus gestures",
          },
          {
            key: "twoHandModeEnabled" as const,
            label: zh ? "啟用雙手模式" : "Enable two-hand mode",
          },
          {
            key: "tenFingerModeEnabled" as const,
            label: zh ? "啟用 10 指模式（預覽）" : "Enable 10-finger mode (preview)",
          },
          {
            key: "playBallGestureModeEnabled" as const,
            label: zh ? "啟用 Play Ball 手勢" : "Enable Play Ball gestures",
          },
          {
            key: "reducedMotion" as const,
            label: zh ? "減少慣性/動態效果" : "Reduce motion and inertia",
          },
        ].map((item) => (
          <label key={item.key} className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-sm">{item.label}</span>
            <Checkbox
              checked={Boolean(airPilotSettings[item.key])}
              onCheckedChange={(checked) => {
                if (typeof checked === "boolean") {
                  updateAirPilot({
                    [item.key]: checked,
                  } as Partial<OSBuddyAirPilotSettings>);
                }
              }}
            />
          </label>
        ))}

        <label className="block space-y-1.5">
          <span className="text-sm">{zh ? "滾動靈敏度" : "Scroll sensitivity"}</span>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={airPilotSettings.scrollSensitivity}
            onChange={(event) => updateAirPilot({ scrollSensitivity: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm">{zh ? "平滑強度" : "Smoothing strength"}</span>
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={airPilotSettings.smoothingStrength}
            onChange={(event) => updateAirPilot({ smoothingStrength: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm">{zh ? "手勢靈敏度" : "Gesture sensitivity"}</span>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={airPilotSettings.gestureSensitivity}
            onChange={(event) => updateAirPilot({ gestureSensitivity: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {calibrationSummary
            ? zh
              ? `校準品質：${calibrationSummary.quality}`
              : `Calibration: ${calibrationSummary.quality}`
            : zh
              ? "尚未校準（使用 2D 後備）"
              : "Not calibrated (2D fallback)"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!calibrationSummary}
          onClick={() => {
            clearAirControlCalibration();
            saveLocalAirControlCalibration(null);
          }}
        >
          {zh ? "清除校準" : "Clear calibration"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {zh
          ? "私隱：影像只在你的裝置上處理，預設不會離開裝置。"
          : "Privacy: video is processed on your device and never leaves it by default."}
      </p>
    </div>
  );
}
