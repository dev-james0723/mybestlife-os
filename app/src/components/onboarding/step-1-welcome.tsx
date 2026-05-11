"use client";

import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import type { getThemeUiCopy } from "@/lib/i18n/theme-ui";

type Step1Props = {
  onNext: () => void;
  ui: ReturnType<typeof getThemeUiCopy>;
};

export function Step1Welcome({ onNext, ui }: Step1Props) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Rocket className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">{ui.onboardingWelcomeTitle}</h2>
        <p className="text-sm text-neutral-400 max-w-md">
          {ui.onboardingWelcomeSubtitle}
        </p>
      </div>
      <Button size="lg" onClick={onNext} className="min-w-40">
        {ui.onboardingWelcomeCta}
      </Button>
    </div>
  );
}
