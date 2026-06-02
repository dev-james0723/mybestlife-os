"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import type { OSBuddyBirthdayProfile } from "@/lib/os-buddy/os-buddy-birthday";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyMiniGame } from "@/stores/os-buddy-store";
import { OSBuddyBirthdaySettings } from "./OSBuddyBirthdaySettings";

type OSBuddyMenuProps = {
  open: boolean;
  x: number;
  y: number;
  locale: AppLocale;
  currentName: string;
  onClose: () => void;
  onOpenPetPicker: () => void;
  onRename: (name: string) => void;
  onResetPosition: () => void;
  onOpenGame: (game: OSBuddyMiniGame) => void;
  onHide: () => void;
  birthdayProfile: OSBuddyBirthdayProfile;
  onSaveBirthdayProfile: (profile: OSBuddyBirthdayProfile) => Promise<void> | void;
};

export function OSBuddyMenu({
  open,
  x,
  y,
  locale,
  currentName,
  onClose,
  onOpenPetPicker,
  onRename,
  onResetPosition,
  onOpenGame,
  onHide,
  birthdayProfile,
  onSaveBirthdayProfile,
}: OSBuddyMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [birthdayPanelOpen, setBirthdayPanelOpen] = useState(false);
  const [nameInput, setNameInput] = useState(currentName);
  const zh = locale === "zh-TW";

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) onClose();
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label={zh ? "OS Buddy 選單" : "OS Buddy menu"}
      className="fixed z-[46] max-h-[min(560px,calc(100vh-24px))] w-[270px] overflow-y-auto rounded-xl border bg-popover p-2 shadow-xl"
      style={{ left: x, top: y }}
    >
      <div className="space-y-1">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            onOpenPetPicker();
            onClose();
          }}
        >
          {zh ? "更換 OS Buddy" : "Change Buddy"}
        </Button>

        {renaming ? (
          <div className="rounded-lg border p-2 space-y-2">
            <Input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              maxLength={24}
              placeholder={zh ? "輸入名稱" : "Enter a name"}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setRenaming(false)}>
                {zh ? "取消" : "Cancel"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const trimmed = nameInput.trim();
                  if (trimmed) onRename(trimmed);
                  setRenaming(false);
                  onClose();
                }}
              >
                {zh ? "儲存" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setBirthdayPanelOpen(false);
              setRenaming(true);
            }}
          >
            {zh ? "重新命名" : "Rename Buddy"}
          </Button>
        )}

        {birthdayPanelOpen ? (
          <OSBuddyBirthdaySettings
            locale={locale}
            value={birthdayProfile}
            onCancel={() => setBirthdayPanelOpen(false)}
            onSave={async (nextProfile) => {
              await onSaveBirthdayProfile(nextProfile);
              emitOSBuddyEvent({
                type: nextProfile.enabled ? "birthday:set" : "birthday:clear",
              });
              setBirthdayPanelOpen(false);
              onClose();
            }}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setRenaming(false);
              setBirthdayPanelOpen(true);
            }}
          >
            {zh ? "生日模式" : "Birthday Mode"}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            onResetPosition();
            onClose();
          }}
        >
          {zh ? "重設位置" : "Reset position"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            onOpenGame("play-ball");
            onClose();
          }}
        >
          {zh ? "和小夥伴玩球" : "Play Ball"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            onOpenGame("pixel-catch");
            onClose();
          }}
        >
          {zh ? "玩 Pixel Catch" : "Play Pixel Catch"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            onOpenGame("focus-tap");
            onClose();
          }}
        >
          {zh ? "玩 Focus Tap" : "Play Focus Tap"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            onOpenGame("clean-desk");
            onClose();
          }}
        >
          {zh ? "整理桌面" : "Clean the Desk"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start text-destructive"
          onClick={() => {
            onHide();
            onClose();
          }}
        >
          {zh ? "隱藏 OS Buddy" : "Hide OS Buddy"}
        </Button>
      </div>
    </div>
  );
}
