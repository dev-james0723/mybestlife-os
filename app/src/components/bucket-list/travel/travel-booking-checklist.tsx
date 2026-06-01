"use client";

import { useState } from "react";
import { ListChecks, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useUpdateBucketItem,
  useUpsertBucketIntegration,
} from "@/hooks/use-bucket-list";
import { useCreateTask } from "@/hooks/use-tasks";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

const ITEMS: { key: string; labelKey: keyof BucketListUiCopy }[] = [
  { key: "passport_visa", labelKey: "bookPassportVisa" },
  { key: "flight", labelKey: "bookFlight" },
  { key: "hotel", labelKey: "bookHotel" },
  { key: "local_transport", labelKey: "bookLocalTransport" },
  { key: "weather_gear", labelKey: "bookWeatherGear" },
  { key: "tickets", labelKey: "bookTickets" },
  { key: "insurance", labelKey: "bookInsurance" },
  { key: "cash_card", labelKey: "bookCashCard" },
  { key: "emergency_info", labelKey: "bookEmergencyInfo" },
  { key: "language_prep", labelKey: "bookLanguagePrep" },
  { key: "packing", labelKey: "bookPacking" },
  { key: "sim_esim", labelKey: "bookSimEsim" },
];

function mapPriority(p: BucketItem["priority"]): "low" | "medium" | "high" {
  if (p === "high") return "high";
  if (p === "low" || p === "someday") return "low";
  return "medium";
}

/**
 * Standard travel booking checklist. Selected items can be turned into real
 * tasks — that write only happens when the user clicks "Create tasks", and the
 * tasks link back to the dream. Nothing is created automatically.
 */
export function TravelBookingChecklist({
  item,
  copy,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const createTask = useCreateTask();
  const upsertIntegration = useUpsertBucketIntegration();
  const updateBucket = useUpdateBucketItem();

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function createTasks() {
    if (selected.size === 0) return;
    setCreating(true);
    try {
      const chosen = ITEMS.filter((i) => selected.has(i.key));
      const newIds: string[] = [];
      for (const entry of chosen) {
        const label = copy[entry.labelKey] as string;
        const task = await createTask.mutateAsync({
          title: `${item.title}: ${label}`,
          status: "todo",
          priority: mapPriority(item.priority),
          tags: [...item.category_tags, "travel"],
          project_id: item.linked_project_id ?? undefined,
        });
        newIds.push(task.id);
        await upsertIntegration.mutateAsync({
          bucket_item_id: item.id,
          kind: "task",
          external_id: task.id,
          external_label: task.title,
        });
      }
      if (newIds.length > 0) {
        await updateBucket.mutateAsync({
          id: item.id,
          data: { linked_task_ids: [...item.linked_task_ids, ...newIds] },
        });
      }
      toast.success(copy.bookCreatedTasks(newIds.length));
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Some tasks could not be created");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <ListChecks className="h-4 w-4 text-sky-500" />
        {copy.bookingChecklistHeading}
      </h3>
      <p className="mb-3 text-[12px] text-muted-foreground">{copy.bookingChecklistHint}</p>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {ITEMS.map((entry) => (
          <label
            key={entry.key}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-[13px]"
          >
            <Checkbox
              checked={selected.has(entry.key)}
              onCheckedChange={() => toggle(entry.key)}
            />
            {copy[entry.labelKey] as string}
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          className="bg-lime-400 text-black hover:bg-lime-300"
          disabled={selected.size === 0 || creating}
          onClick={createTasks}
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {copy.bookCreateTasks(selected.size)}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {copy.activateNoSilentNote}
        </span>
      </div>
    </section>
  );
}
