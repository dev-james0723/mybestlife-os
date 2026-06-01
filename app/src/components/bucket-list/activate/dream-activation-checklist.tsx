"use client";

import { Circle, CheckCircle2 } from "lucide-react";

import { buildActivationChecklist } from "@/lib/bucket-list/activation";
import type { ActivationChecklistContext } from "@/lib/bucket-list/activation";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

/**
 * Deterministic activation checklist for a dream. Shows which foundational
 * steps are already covered (first action, research, budget, schedule, people,
 * supplies, booking for travel, reflection) after activation.
 */
export function DreamActivationChecklist({
  item,
  ctx,
  copy,
}: {
  item: BucketItem;
  ctx: ActivationChecklistContext;
  copy: BucketListUiCopy;
}) {
  const items = buildActivationChecklist(
    item,
    {
      firstAction: copy.checkFirstAction,
      research: copy.checkResearch,
      budget: copy.checkBudget,
      schedule: copy.checkSchedule,
      people: copy.checkPeople,
      supplies: copy.checkSupplies,
      booking: copy.checkBooking,
      reflection: copy.checkReflection,
    },
    ctx,
  );

  return (
    <section className="rounded-xl border p-4">
      <h4 className="mb-2 text-sm font-semibold">{copy.checklistHeading}</h4>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-[13px]">
            {it.done ? (
              <CheckCircle2 className="h-4 w-4 text-lime-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/50" />
            )}
            <span className={it.done ? "text-foreground" : "text-muted-foreground"}>
              {it.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
