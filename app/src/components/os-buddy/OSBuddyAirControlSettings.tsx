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

  useEffect(() => {
    setSettings(getLocalAirControlSettings());
  }, []);

  const update = (patch: Partial<AirControlSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveLocalAirControlSettings(next);
    if (patch.showDebugOverlay !== undefined) setAirControlDebugEnabled(patch.showDebugOverlay);
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
