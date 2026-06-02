"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  validateOSBuddyFreeRoamSettings,
  type OSBuddyFreeRoamIntensity,
  type OSBuddyFreeRoamSettings,
} from "@/lib/os-buddy/os-buddy-free-roam";
import type { AppLocale } from "@/lib/i18n/app-locale";

type OSBuddyBehaviorSettingsProps = {
  locale: AppLocale;
  value: OSBuddyFreeRoamSettings;
  onSave: (value: OSBuddyFreeRoamSettings) => Promise<void> | void;
};

const INTENSITY_OPTIONS: OSBuddyFreeRoamIntensity[] = ["subtle", "balanced", "lively"];

function copy(locale: AppLocale) {
  const zh = locale === "zh-TW";
  return {
    sectionTitle: zh ? "OS Buddy 行為" : "OS Buddy Behaviour",
    freeRoam: zh ? "自由活動" : "Free Roam",
    freeRoamDescription: zh
      ? "讓 OS Buddy 在你空閒時偶爾移動。"
      : "Let OS Buddy move around occasionally while you are idle.",
    movementLevel: zh ? "活動頻率" : "Movement level",
    intensity: {
      subtle: zh ? "低調" : "Subtle",
      balanced: zh ? "適中" : "Balanced",
      lively: zh ? "活潑" : "Lively",
    } satisfies Record<OSBuddyFreeRoamIntensity, string>,
    returnHome: zh ? "自由活動後回到原位" : "Return to home position after roaming",
    returnHomeDescription: zh
      ? "OS Buddy 會回到你放置的位置。"
      : "OS Buddy will return to the spot you placed it.",
    stayNearHome: zh ? "只在原位附近活動" : "Stay near home position",
    stayNearHomeDescription: zh
      ? "讓移動範圍保持在 OS Buddy 的儲存位置附近。"
      : "Keeps movement close to the Buddy's saved position.",
    save: zh ? "儲存行為設定" : "Save behavior settings",
    saving: zh ? "儲存中…" : "Saving…",
  };
}

export function OSBuddyBehaviorSettings({
  locale,
  value,
  onSave,
}: OSBuddyBehaviorSettingsProps) {
  const ui = useMemo(() => copy(locale), [locale]);
  const [draft, setDraft] = useState(() => validateOSBuddyFreeRoamSettings(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(validateOSBuddyFreeRoamSettings(value));
  }, [value]);

  const normalizedValue = validateOSBuddyFreeRoamSettings(value);
  const dirty = JSON.stringify(draft) !== JSON.stringify(normalizedValue);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(validateOSBuddyFreeRoamSettings(draft));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="os-buddy-behaviour-title">
      <div className="space-y-1">
        <h3 id="os-buddy-behaviour-title" className="text-sm font-semibold">
          {ui.sectionTitle}
        </h3>
        <p className="text-sm text-muted-foreground">{ui.freeRoamDescription}</p>
      </div>

      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{ui.freeRoam}</p>
          <p className="text-sm text-muted-foreground">{ui.freeRoamDescription}</p>
        </div>
        <Checkbox
          checked={draft.enabled}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") {
              setDraft((current) => ({ ...current, enabled: checked }));
            }
          }}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{ui.movementLevel}</Label>
          <Select
            value={draft.intensity}
            onValueChange={(nextValue) => {
              if (
                nextValue === "subtle" ||
                nextValue === "balanced" ||
                nextValue === "lively"
              ) {
                setDraft((current) => ({ ...current, intensity: nextValue }));
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTENSITY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {ui.intensity[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{ui.returnHome}</p>
            <p className="text-sm text-muted-foreground">{ui.returnHomeDescription}</p>
          </div>
          <Checkbox
            checked={draft.returnHomeAfterRoam}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                setDraft((current) => ({ ...current, returnHomeAfterRoam: checked }));
              }
            }}
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{ui.stayNearHome}</p>
            <p className="text-sm text-muted-foreground">{ui.stayNearHomeDescription}</p>
          </div>
          <Checkbox
            checked={draft.roamNearHomeOnly}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                setDraft((current) => ({ ...current, roamNearHomeOnly: checked }));
              }
            }}
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? ui.saving : ui.save}
        </Button>
      </div>
    </section>
  );
}
