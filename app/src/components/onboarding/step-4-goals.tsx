"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { goalsRepository } from "@/lib/repositories/goals";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import type { getThemeUiCopy } from "@/lib/i18n/theme-ui";

type Step4Props = {
  goalName: string;
  onGoalNameChange: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
  ui: ReturnType<typeof getThemeUiCopy>;
};

export function Step4Goals({ goalName, onGoalNameChange, onNext, onBack, ui }: Step4Props) {
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!goalName.trim()) {
      onNext();
      return;
    }

    setSaving(true);
    try {
      await goalsRepository.create({
        name: goalName.trim(),
        category: "90_day",
        status: "active",
        target_date: format(addDays(new Date(), 90), "yyyy-MM-dd"),
      });
      toast.success(ui.onboardingGoalCreated);
      onNext();
    } catch {
      toast.error(ui.onboardingGoalFailed);
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{ui.onboardingGoalTitle}</h2>
        <p className="text-sm text-neutral-400">
          {ui.onboardingGoalSubtitle}
        </p>
      </div>
      <div className="space-y-3 max-w-md mx-auto">
        <Label htmlFor="goal-input" className="text-neutral-300">
          {ui.onboardingGoalLabel}
        </Label>
        <Input
          id="goal-input"
          value={goalName}
          onChange={(e) => onGoalNameChange(e.target.value)}
          placeholder={ui.onboardingGoalPlaceholder}
          className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
        />
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-neutral-400">
          {ui.back}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onNext} className="text-neutral-400">
            {ui.skip}
          </Button>
          <Button onClick={handleContinue} disabled={saving}>
            {saving ? ui.onboardingSettingUp : ui.continue}
          </Button>
        </div>
      </div>
    </div>
  );
}
