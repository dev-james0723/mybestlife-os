"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { useOSBuddyFreeRoamSettings } from "@/hooks/use-os-buddy-free-roam-settings";
import type { OSBuddyPetId } from "@/types/os-buddy";
import { OSBuddyBehaviorSettings } from "@/components/os-buddy/OSBuddyBehaviorSettings";
import { OSBuddySprite } from "@/components/os-buddy/OSBuddySprite";
import { getOSBuddyAssetSrc } from "@/lib/os-buddy/os-buddy-assets";

const PET_OPTIONS: Array<{ id: OSBuddyPetId; label: string }> = [
  { id: "xiaoba", label: "Xiaoba" },
  { id: "doge", label: "Doge" },
];

export function OSBuddySettingsSection() {
  const locale = useAppStore((s) => s.language);
  const zh = locale === "zh-TW";

  const {
    enabled,
    petId,
    name,
    renameBuddy,
    changePet,
    resetPosition,
    setEnabled,
  } = useOSBuddy();
  const {
    settings: freeRoamSettings,
    saveSettings: saveFreeRoamSettings,
  } = useOSBuddyFreeRoamSettings();

  const [draftEnabled, setDraftEnabled] = useState(enabled);
  const [draftPetId, setDraftPetId] = useState<OSBuddyPetId>(petId);
  const [draftName, setDraftName] = useState(name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    setDraftPetId(petId);
  }, [petId]);

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  const previewSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId: draftPetId, mood: "idle" }),
    [draftPetId],
  );

  const dirty =
    draftEnabled !== enabled || draftPetId !== petId || draftName.trim() !== name.trim();

  const save = async () => {
    setSaving(true);
    try {
      if (draftEnabled !== enabled) await setEnabled(draftEnabled);
      if (draftPetId !== petId) await changePet(draftPetId);
      if (draftName.trim() && draftName.trim() !== name.trim()) {
        await renameBuddy(draftName);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OS Buddy</CardTitle>
        <CardDescription>
          {zh
            ? "選一隻會陪你使用 My Best Life OS 的動畫小夥伴。"
            : "Choose an animated pet that stays with you across My Best Life OS."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="font-medium">{zh ? "啟用 OS Buddy" : "Enable OS Buddy"}</p>
          </div>
          <Checkbox
            checked={draftEnabled}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") setDraftEnabled(checked);
            }}
          />
        </label>

        <div className="space-y-2">
          <Label>{zh ? "選擇小夥伴" : "Choose pet"}</Label>
          <Select
            value={draftPetId}
            onValueChange={(value) => {
              if (value === "xiaoba" || value === "doge") setDraftPetId(value);
            }}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PET_OPTIONS.map((pet) => (
                <SelectItem key={pet.id} value={pet.id}>
                  {pet.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{zh ? "重新命名" : "Rename buddy"}</Label>
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            maxLength={24}
            className="max-w-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>{zh ? "預覽" : "Preview"}</Label>
          <div className="inline-flex rounded-xl border bg-muted/20 px-3 py-2">
            <OSBuddySprite
              petId={draftPetId}
              name={draftName || "OS Buddy"}
              mood="idle"
              animationSrc={previewSrc}
            />
          </div>
        </div>

        <OSBuddyBehaviorSettings
          locale={locale}
          value={freeRoamSettings}
          onSave={saveFreeRoamSettings}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void resetPosition();
            }}
          >
            {zh ? "重設位置" : "Reset position"}
          </Button>

          <Button type="button" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? (zh ? "儲存中…" : "Saving…") : zh ? "儲存" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
