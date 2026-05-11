"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HealthCard } from "./primitives/HealthCard";
import { DeltaPill } from "./primitives/DeltaPill";
import { Sparkline } from "./primitives/Sparkline";
import { bandClass, pillarBand, type PillarKey } from "@/lib/health/pillarUtils";

interface PillarCardProps {
  pillar: PillarKey;
  label: string;
  value: number | null;
  delta: number | null;
  trend: number[];
  supportingLabel?: string;
  supportingValue?: ReactNode;
  tapToLog: string;
  deltaLabel: string;
  logNow: string;
  onClick: () => void;
  className?: string;
}

/**
 * Above-the-fold subjective pillar tile. Shows:
 * - Current value (1-10) with color band
 * - Delta vs 7d average
 * - 7d sparkline
 * - Optional supporting objective value (e.g. sleep duration, HRV)
 *
 * Entire card is tappable (opens the log modal). Uses aria-label for SR.
 */
export function PillarCard({
  pillar,
  label,
  value,
  delta,
  trend,
  supportingLabel,
  supportingValue,
  tapToLog,
  deltaLabel,
  logNow,
  onClick,
  className,
}: PillarCardProps) {
  const band = pillarBand(value, pillar);
  const goodIsUp = pillar !== "stress";

  return (
    <HealthCard
      as="button"
      interactive
      onClick={onClick}
      className={cn("flex h-full flex-col gap-3", className)}
      aria-label={`${label}: ${value ?? tapToLog}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-1 text-3xl font-bold tabular-nums", bandClass(band))}>
            {value !== null ? value : <span className="text-base font-normal text-muted-foreground">{tapToLog}</span>}
          </p>
        </div>
        <DeltaPill delta={delta} goodIsUp={goodIsUp} ariaLabel={deltaLabel} />
      </div>
      <Sparkline
        data={trend}
        width={160}
        height={28}
        ariaLabel={`${label} — last ${trend.length} days`}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {supportingLabel ? (
          <span>
            {supportingLabel}: <span className="font-medium text-foreground">{supportingValue ?? "—"}</span>
          </span>
        ) : (
          <span className="text-transparent select-none">.</span>
        )}
        {value === null && <span className="font-medium text-primary">{logNow}</span>}
      </div>
    </HealthCard>
  );
}
