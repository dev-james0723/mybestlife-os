"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import type { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import type { BlockMinutesOption } from "@/types/database";

const BLOCK_OPTIONS: BlockMinutesOption[] = [5, 10, 15, 20, 30];

type Step5Props = {
  selected: BlockMinutesOption;
  onSelect: (v: BlockMinutesOption) => void;
  onNext: () => void;
  onBack: () => void;
  ui: ReturnType<typeof getThemeUiCopy>;
};

export function Step5BlockMinutes({
  selected,
  onSelect,
  onNext,
  onBack,
  ui,
}: Step5Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {ui.onboardingBlockMinutesTitle}
        </h2>
        <p className="text-sm text-neutral-400">
          {ui.onboardingBlockMinutesSubtitle}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto">
        {BLOCK_OPTIONS.map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => onSelect(mins)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all",
              selected === mins
                ? "border-primary bg-primary/10 text-white"
                : "border-white/10 text-neutral-400 hover:border-white/20",
            )}
          >
            <span className="text-xl font-bold">{mins}</span>
            <span className="text-[10px] font-medium">
              {ui.onboardingBlockMinutesUnit}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-neutral-400"
        >
          {ui.back}
        </Button>
        <Button onClick={onNext}>{ui.continue}</Button>
      </div>
    </div>
  );
}
