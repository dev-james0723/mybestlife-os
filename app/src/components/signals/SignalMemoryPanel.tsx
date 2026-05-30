"use client";

import { Activity, Eraser, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  SignalMemorySummary,
  SignalWeeklyReflection,
} from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

type Props = {
  memory: SignalMemorySummary;
  reflection: SignalWeeklyReflection;
  copy: SignalsUiCopy;
  onClearHistory: () => void;
};

/** 0 → off, then low / medium / high — an honest, coarse label (no fake precision). */
function sensitivityLevel(value: number, copy: SignalsUiCopy): string {
  if (value <= 0.001) return copy.memory.level.off;
  if (value < 0.34) return copy.memory.level.low;
  if (value < 0.67) return copy.memory.level.medium;
  return copy.memory.level.high;
}

/**
 * Signal Memory control surface (§7/§17/§18) — an inspectable, resettable mirror
 * of what the system learned from the user's feedback. Never a hidden profile:
 * everything shown is derived locally from the action log and can be wiped.
 */
export function SignalMemoryPanel({ memory, reflection, copy, onClearHistory }: Props) {
  const empty = memory.totalActions === 0;

  return (
    <div className="space-y-4">
      {/* Weekly reflection */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-3">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {copy.memory.weeklyTitle}
        </h4>
        {reflection.hasActivity ? (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label={copy.memory.saved} value={reflection.saved} />
              <Stat label={copy.memory.tracked} value={reflection.tracked} />
              <Stat label={copy.memory.toBrain} value={reflection.toBrain} />
              <Stat label={copy.memory.dismissed} value={reflection.dismissed} />
            </div>
            {reflection.topTopics.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {copy.memory.weeklyTopTopics}{" "}
                <span className="font-medium text-foreground/80">
                  {reflection.topTopics.map((t) => t.topic).join(" · ")}
                </span>
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{copy.memory.weeklyEmpty}</p>
        )}
      </div>

      {empty ? (
        <p className="text-xs text-muted-foreground">{copy.memory.empty}</p>
      ) : (
        <>
          {memory.likedTopics.length > 0 && (
            <ChipRow
              label={copy.memory.likedTopics}
              items={memory.likedTopics.map((t) => t.topic)}
              tone="positive"
            />
          )}
          {memory.cooledTopics.length > 0 && (
            <ChipRow
              label={copy.memory.cooledTopics}
              items={memory.cooledTopics.map((t) => t.topic)}
              tone="muted"
            />
          )}

          {/* Content sensitivities */}
          <div className="space-y-1.5">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              {copy.memory.sensitivities}
            </h4>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <Meter label={copy.memory.negativity} value={sensitivityLevel(memory.negativitySensitivity, copy)} />
              <Meter label={copy.memory.political} value={sensitivityLevel(memory.politicalSensitivity, copy)} />
              <Meter label={copy.memory.shallow} value={sensitivityLevel(memory.shallowSensitivity, copy)} />
            </div>
          </div>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-destructive hover:text-destructive"
        onClick={onClearHistory}
        disabled={empty}
      >
        <Eraser className="h-3.5 w-3.5" />
        {copy.memory.clearHistory}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 text-center">
      <div className="text-base font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ChipRow({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "positive" | "muted";
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium",
              tone === "positive"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border/60 bg-muted/40 text-muted-foreground",
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground/80">{value}</div>
    </div>
  );
}
