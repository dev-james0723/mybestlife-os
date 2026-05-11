import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaPillProps {
  delta: number | null;
  unit?: string;
  /** True when "up" is good (e.g. HRV). False when "up" is bad (e.g. RHR, stress). */
  goodIsUp?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Renders a compact delta pill: arrow + value + unit. The color tone keys
 * off whether the direction is good or bad for this metric.
 */
export function DeltaPill({
  delta,
  unit,
  goodIsUp = true,
  className,
  ariaLabel,
}: DeltaPillProps) {
  if (delta === null || !Number.isFinite(delta)) return null;
  const abs = Math.abs(delta);
  const rounded = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  const isZero = abs < 0.05;
  const Icon = isZero ? ArrowRight : delta > 0 ? ArrowUp : ArrowDown;
  let tone: string;
  if (isZero) tone = "bg-foreground/5 text-foreground/60";
  else {
    const upIsGood = goodIsUp ? delta > 0 : delta < 0;
    tone = upIsGood
      ? "bg-green-500/10 text-green-600 dark:text-green-400"
      : "bg-red-500/10 text-red-600 dark:text-red-400";
  }
  const sign = isZero ? "" : delta > 0 ? "+" : "-";
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {sign}
      {rounded}
      {unit && <span className="ml-0.5 opacity-70">{unit}</span>}
    </span>
  );
}
