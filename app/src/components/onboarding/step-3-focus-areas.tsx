"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Target,
  Heart,
  BookOpen,
  Briefcase,
  Activity,
  Lightbulb,
} from "lucide-react";
import type { getThemeUiCopy } from "@/lib/i18n/theme-ui";

type Step3Props = {
  selected: string[];
  onChange: (areas: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  ui: ReturnType<typeof getThemeUiCopy>;
};

export function Step3FocusAreas({ selected, onChange, onNext, onBack, ui }: Step3Props) {
  const FOCUS_OPTIONS = [
    { id: "goals", label: ui.focusGoals, icon: Target },
    { id: "self", label: ui.focusSelf, icon: Heart },
    { id: "learning", label: ui.focusLearning, icon: BookOpen },
    { id: "career", label: ui.focusCareer, icon: Briefcase },
    { id: "health", label: ui.focusHealth, icon: Activity },
    { id: "knowledge", label: ui.focusKnowledge, icon: Lightbulb },
  ] as const;

  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{ui.onboardingFocusTitle}</h2>
        <p className="text-sm text-neutral-400">
          {ui.onboardingFocusSubtitle}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FOCUS_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
              selected.includes(id)
                ? "border-primary bg-primary/10 text-white"
                : "border-white/10 text-neutral-400 hover:border-white/20"
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-neutral-400">
          {ui.back}
        </Button>
        <Button onClick={onNext}>{ui.continue}</Button>
      </div>
    </div>
  );
}
