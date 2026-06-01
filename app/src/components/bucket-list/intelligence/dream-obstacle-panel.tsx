"use client";

import {
  Banknote,
  Clock,
  Compass,
  HeartHandshake,
  HelpCircle,
  Map as MapIcon,
  ShieldQuestion,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketDreamBlocker,
  BucketDreamBlockerType,
} from "@/types/bucket-list";

const BLOCKER_ICON: Record<BucketDreamBlockerType, LucideIcon> = {
  money: Banknote,
  time: Clock,
  clarity: Compass,
  courage: ShieldQuestion,
  logistics: MapIcon,
  relationship: HeartHandshake,
  health: Zap,
  other: HelpCircle,
};

function blockerTypeLabel(t: BucketDreamBlockerType, copy: BucketListUiCopy): string {
  switch (t) {
    case "money":
      return copy.blockerMoney;
    case "time":
      return copy.blockerTime;
    case "clarity":
      return copy.blockerClarity;
    case "courage":
      return copy.blockerCourage;
    case "logistics":
      return copy.blockerLogistics;
    case "relationship":
      return copy.blockerRelationship;
    case "health":
      return copy.blockerHealth;
    case "other":
      return copy.blockerOther;
  }
}

export function DreamObstaclePanel({
  blockers,
  copy,
}: {
  blockers: BucketDreamBlocker[];
  copy: BucketListUiCopy;
}) {
  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-semibold">{copy.blockersHeading}</h3>
      {blockers.length === 0 ? (
        <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-lime-500" />
          {copy.blockersNone}
        </p>
      ) : (
        <ul className="space-y-2">
          {blockers.map((b, i) => {
            const Icon = BLOCKER_ICON[b.type];
            return (
              <li key={`${b.title}-${i}`} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">{b.title}</span>
                  <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {blockerTypeLabel(b.type, copy)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">{b.explanation}</p>
                <p className="mt-1 text-[13px]">
                  <span className="font-medium text-foreground">
                    {copy.blockerSuggested}:
                  </span>{" "}
                  {b.suggestedAction}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
