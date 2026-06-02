"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE,
  validateOSBuddyBirthdayProfile,
  type OSBuddyBirthdayProfile,
} from "@/lib/os-buddy/os-buddy-birthday";
import type { AppLocale } from "@/lib/i18n/app-locale";

type OSBuddyBirthdaySettingsProps = {
  locale: AppLocale;
  value: OSBuddyBirthdayProfile;
  onSave: (value: OSBuddyBirthdayProfile) => Promise<void> | void;
  onCancel?: () => void;
};

type BirthdayDraft = {
  enabled: boolean;
  month: number | null;
  day: number | null;
  yearInput: string;
  showAge: boolean;
  reminderEnabled: boolean;
};

const EMPTY_VALUE = "none";
const MIN_YEAR = 1900;

function daysInBirthdayMonth(month: number | null, year: number | null) {
  if (month == null) return 31;
  if (month === 2 && year == null) return 29;
  return new Date(year ?? 2000, month, 0).getDate();
}

function parseYear(value: string) {
  if (!value.trim()) return null;
  const year = Number(value);
  return Number.isInteger(year) ? year : Number.NaN;
}

function isValidDraftDate(draft: BirthdayDraft, year: number | null) {
  if (draft.month == null || draft.day == null) return false;
  if (draft.month < 1 || draft.month > 12) return false;
  if (draft.day < 1) return false;
  return draft.day <= daysInBirthdayMonth(draft.month, year);
}

function draftFromProfile(profile: OSBuddyBirthdayProfile): BirthdayDraft {
  const safe = validateOSBuddyBirthdayProfile(profile);
  return {
    enabled: safe.enabled,
    month: safe.month,
    day: safe.day,
    yearInput: safe.year ? String(safe.year) : "",
    showAge: Boolean(safe.showAge),
    reminderEnabled: safe.reminderEnabled !== false,
  };
}

export function OSBuddyBirthdaySettings({
  locale,
  value,
  onSave,
  onCancel,
}: OSBuddyBirthdaySettingsProps) {
  const zh = locale === "zh-TW";
  const descriptionId = useId();
  const [draft, setDraft] = useState<BirthdayDraft>(() => draftFromProfile(value));
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const parsedYear = parseYear(draft.yearInput);
  const yearIsValid =
    parsedYear == null ||
    (Number.isInteger(parsedYear) && parsedYear >= MIN_YEAR && parsedYear <= currentYear);
  const birthdayYear = yearIsValid && parsedYear != null ? parsedYear : null;
  const dateIsValid = isValidDraftDate(draft, birthdayYear);
  const dayOptions = useMemo(() => {
    const count = daysInBirthdayMonth(draft.month, birthdayYear);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [birthdayYear, draft.month]);

  const saveDisabled = saving || !yearIsValid || (draft.enabled && !dateIsValid);
  const canShowAge = birthdayYear != null;

  const labels = {
    title: zh ? "生日模式" : "Birthday Mode",
    month: zh ? "月份" : "Month",
    day: zh ? "日期" : "Day",
    year: zh ? "年份，可留空" : "Year optional",
    showAge: zh ? "顯示年齡" : "Show age",
    reminder: zh ? "生日提醒" : "Reminder",
    save: zh ? "儲存生日" : "Save birthday",
    clear: zh ? "清除生日" : "Clear birthday",
    description: zh
      ? "只用於 OS Buddy 的生日互動。"
      : "Used only for OS Buddy birthday moments.",
    cancel: zh ? "取消" : "Cancel",
    none: zh ? "未設定" : "Not set",
    saving: zh ? "儲存中..." : "Saving...",
  };

  const save = async () => {
    setSaving(true);
    try {
      const next =
        draft.month == null || draft.day == null
          ? { ...DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE }
          : validateOSBuddyBirthdayProfile({
              ...value,
              enabled: draft.enabled,
              month: draft.month,
              day: draft.day,
              year: birthdayYear,
              showAge: canShowAge && draft.showAge,
              reminderEnabled: draft.reminderEnabled,
            });
      await onSave(next);
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    try {
      await onSave({ ...DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-popover/70 p-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{labels.title}</p>
          <Checkbox
            checked={draft.enabled}
            aria-label={labels.title}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                setDraft((current) => ({ ...current, enabled: checked }));
              }
            }}
          />
        </div>
        <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
          {labels.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{labels.month}</Label>
          <Select
            value={draft.month == null ? EMPTY_VALUE : String(draft.month)}
            onValueChange={(nextValue) => {
              const month = nextValue === EMPTY_VALUE ? null : Number(nextValue);
              setDraft((current) => {
                const nextDayLimit = daysInBirthdayMonth(month, birthdayYear);
                const nextDay =
                  current.day != null && current.day > nextDayLimit ? nextDayLimit : current.day;
                return { ...current, month, day: nextDay };
              });
            }}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[160]">
              <SelectItem value={EMPTY_VALUE}>{labels.none}</SelectItem>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <SelectItem key={month} value={String(month)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{labels.day}</Label>
          <Select
            value={draft.day == null ? EMPTY_VALUE : String(draft.day)}
            onValueChange={(nextValue) => {
              const day = nextValue === EMPTY_VALUE ? null : Number(nextValue);
              setDraft((current) => ({ ...current, day }));
            }}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[160]">
              <SelectItem value={EMPTY_VALUE}>{labels.none}</SelectItem>
              {dayOptions.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs" htmlFor={`${descriptionId}-year`}>
          {labels.year}
        </Label>
        <Input
          id={`${descriptionId}-year`}
          inputMode="numeric"
          min={MIN_YEAR}
          max={currentYear}
          value={draft.yearInput}
          aria-describedby={descriptionId}
          onChange={(event) => {
            const nextYear = event.target.value.replace(/[^\d]/g, "").slice(0, 4);
            setDraft((current) => ({
              ...current,
              yearInput: nextYear,
              showAge: nextYear ? current.showAge : false,
            }));
          }}
          placeholder={labels.year}
          className="h-8"
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border px-2 py-2">
        <span className="text-xs font-medium">{labels.reminder}</span>
        <Checkbox
          checked={draft.reminderEnabled}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") {
              setDraft((current) => ({ ...current, reminderEnabled: checked }));
            }
          }}
        />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border px-2 py-2">
        <span className="text-xs font-medium">{labels.showAge}</span>
        <Checkbox
          checked={canShowAge && draft.showAge}
          disabled={!canShowAge}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") {
              setDraft((current) => ({ ...current, showAge: checked }));
            }
          }}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="destructive" onClick={() => void clear()}>
            {labels.clear}
          </Button>
          <Button type="button" size="sm" disabled={saveDisabled} onClick={() => void save()}>
            {saving ? labels.saving : labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
