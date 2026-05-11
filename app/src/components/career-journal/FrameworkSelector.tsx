"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import type { DecisionFramework } from "@/types/database";

const FRAMEWORKS: DecisionFramework[] = [
  "pros_cons",
  "10_10_10",
  "regret_minimization",
  "expected_value",
  "custom",
];

type Props = {
  value: DecisionFramework | null;
  onChange: (v: DecisionFramework) => void;
};

export function FrameworkSelector({ value, onChange }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).journal;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {FRAMEWORKS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={cn(
            "rounded-lg border bg-background p-3 text-left transition-colors",
            "hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring",
            value === f && "border-primary ring-2 ring-primary/30",
          )}
        >
          <div className="text-sm font-medium">{copy.frameworks[f]}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {copy.frameworkDescriptions[f]}
          </div>
        </button>
      ))}
    </div>
  );
}
