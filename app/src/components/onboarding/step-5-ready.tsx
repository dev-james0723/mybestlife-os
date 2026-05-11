"use client";

import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import type { getThemeUiCopy } from "@/lib/i18n/theme-ui";

type Step5Props = {
  onComplete: () => void;
  onBack: () => void;
  isCompleting: boolean;
  ui: ReturnType<typeof getThemeUiCopy>;
};

export function Step5Ready({ onComplete, onBack, isCompleting, ui }: Step5Props) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-pulse">
        <PartyPopper className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">{ui.onboardingReadyTitle}</h2>
        <p className="text-sm text-neutral-400 max-w-md">
          {ui.onboardingReadySubtitle}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="text-neutral-400">
          {ui.back}
        </Button>
        <Button size="lg" onClick={onComplete} disabled={isCompleting} className="min-w-40">
          {isCompleting ? ui.onboardingSettingUp : ui.onboardingReadyCta}
        </Button>
      </div>
    </div>
  );
}
