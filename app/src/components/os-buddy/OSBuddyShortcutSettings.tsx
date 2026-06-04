"use client";

import { useEffect, useMemo, useState } from "react";
import { Keyboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT,
  desktopShortcutFromKeyboardEvent,
  formatDesktopShortcut,
  matchesDesktopShortcutEvent,
  validateOSBuddyShortcutSettings,
  type OSBuddyDesktopShortcut,
  type OSBuddyShortcutSettings,
} from "@/lib/os-buddy/os-buddy-shortcuts";

type Props = {
  locale: AppLocale;
  value: OSBuddyShortcutSettings;
  saving?: boolean;
  onSave: (value: OSBuddyShortcutSettings) => Promise<void> | void;
};

function copy(locale: AppLocale) {
  const zh = locale === "zh-TW";
  return {
    title: zh ? "快捷鍵與手勢" : "Shortcuts and gestures",
    description: zh
      ? "不用打開設定，也可以快速顯示或隱藏 OS Buddy。"
      : "Show or hide OS Buddy without opening Settings.",
    desktopShortcut: zh ? "筆電快捷鍵" : "Laptop shortcut",
    current: zh ? "目前：" : "Current:",
    record: zh ? "錄製快捷鍵" : "Record shortcut",
    recording: zh ? "按下想使用的快捷鍵" : "Press the shortcut you want to use",
    pressAgain: (label: string) =>
      zh ? `再按一次 ${label} 以儲存雙擊快捷鍵` : `Press ${label} again to save a double-press shortcut`,
    invalid: zh
      ? "這個快捷鍵容易和瀏覽器或輸入操作衝突，請換一個。"
      : "That shortcut conflicts with browser or text controls. Choose another one.",
    cancelHint: zh ? "按 Esc 取消錄製。" : "Press Esc to cancel recording.",
    resetDefault: zh ? "重設預設" : "Reset default",
    twoFinger: zh ? "啟用兩指雙擊" : "Enable two-finger double tap",
    twoFingerDescription: zh
      ? "手機或平板上，用任意兩隻手指快速雙擊即可顯示或隱藏。"
      : "On phone or tablet, double tap quickly with any two fingers to show or hide.",
    save: zh ? "儲存快捷鍵" : "Save shortcuts",
    saving: zh ? "儲存中…" : "Saving…",
  };
}

export function OSBuddyShortcutSettings({ locale, value, saving = false, onSave }: Props) {
  const ui = useMemo(() => copy(locale), [locale]);
  const [draft, setDraft] = useState(() => validateOSBuddyShortcutSettings(value));
  const [recording, setRecording] = useState(false);
  const [pendingDoublePress, setPendingDoublePress] =
    useState<OSBuddyDesktopShortcut | null>(null);
  const [recorderMessage, setRecorderMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecording(false);
        setPendingDoublePress(null);
        setRecorderMessage(null);
        return;
      }

      const hasModifier = event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
      if (hasModifier) {
        const shortcut = desktopShortcutFromKeyboardEvent(event, 1);
        if (!shortcut) {
          setRecorderMessage(ui.invalid);
          return;
        }

        setDraft((current) => ({ ...current, desktopToggle: shortcut }));
        setRecording(false);
        setPendingDoublePress(null);
        setRecorderMessage(null);
        return;
      }

      const doublePressShortcut = desktopShortcutFromKeyboardEvent(event, 2);
      if (!doublePressShortcut) {
        setRecorderMessage(ui.invalid);
        setPendingDoublePress(null);
        return;
      }

      if (
        pendingDoublePress &&
        matchesDesktopShortcutEvent(event, pendingDoublePress)
      ) {
        setDraft((current) => ({ ...current, desktopToggle: doublePressShortcut }));
        setRecording(false);
        setPendingDoublePress(null);
        setRecorderMessage(null);
        return;
      }

      setPendingDoublePress(doublePressShortcut);
      setRecorderMessage(ui.pressAgain(doublePressShortcut.label));
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [pendingDoublePress, recording, ui]);

  useEffect(() => {
    if (!recording || !pendingDoublePress) return;
    const timer = window.setTimeout(() => {
      setPendingDoublePress(null);
      setRecorderMessage(ui.recording);
    }, 1_200);
    return () => window.clearTimeout(timer);
  }, [pendingDoublePress, recording, ui.recording]);

  const normalizedValue = validateOSBuddyShortcutSettings(value);
  const dirty = JSON.stringify(draft) !== JSON.stringify(normalizedValue);
  const formattedShortcut = formatDesktopShortcut(draft.desktopToggle);

  return (
    <section
      className="space-y-4 rounded-lg border p-3"
      aria-labelledby="os-buddy-shortcut-settings-title"
      data-os-buddy-shortcut-recorder={recording ? "active" : undefined}
    >
      <div className="space-y-1">
        <h3 id="os-buddy-shortcut-settings-title" className="text-sm font-semibold">
          {ui.title}
        </h3>
        <p className="text-sm text-muted-foreground">{ui.description}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">{ui.desktopShortcut}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <kbd className="rounded-md border bg-muted px-2 py-1 text-xs font-medium">
            {formattedShortcut}
          </kbd>
          <span className="text-xs text-muted-foreground">
            {ui.current} {formattedShortcut}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={recording ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setRecording(true);
              setPendingDoublePress(null);
              setRecorderMessage(ui.recording);
            }}
          >
            <Keyboard className="h-4 w-4" />
            {recording ? ui.recording : ui.record}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft((current) => ({
                ...current,
                desktopToggle: DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT,
              }));
              setRecording(false);
              setPendingDoublePress(null);
              setRecorderMessage(null);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            {ui.resetDefault}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {recorderMessage ?? ui.cancelHint}
        </p>
      </div>

      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{ui.twoFinger}</p>
          <p className="text-sm text-muted-foreground">{ui.twoFingerDescription}</p>
        </div>
        <Checkbox
          checked={draft.twoFingerDoubleTapEnabled}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") {
              setDraft((current) => ({
                ...current,
                twoFingerDoubleTapEnabled: checked,
              }));
            }
          }}
        />
      </label>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void onSave(validateOSBuddyShortcutSettings(draft))}
          disabled={!dirty || saving || recording}
        >
          {saving ? ui.saving : ui.save}
        </Button>
      </div>
    </section>
  );
}
