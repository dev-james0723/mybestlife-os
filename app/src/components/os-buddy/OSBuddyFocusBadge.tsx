"use client";

import { useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

type OSBuddyFocusBadgeProps = {
  startedAt: number;
  durationMinutes: number | null;
};

export function OSBuddyFocusBadge({
  startedAt,
  durationMinutes,
}: OSBuddyFocusBadgeProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const label = useMemo(() => {
    if (!durationMinutes) return "Focus";
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60_000));
    const remaining = Math.max(0, durationMinutes - elapsedMinutes);
    return `${remaining}m`;
  }, [durationMinutes, startedAt]);

  return (
    <div
      className={cn(
        "absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center gap-0.5 rounded-full border border-border bg-popover px-1.5 text-[10px] font-semibold text-popover-foreground shadow-sm",
      )}
      aria-label={durationMinutes ? `${label} focus time remaining` : "Focus mode active"}
    >
      <Timer className="size-3" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
