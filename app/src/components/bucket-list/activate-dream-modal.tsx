"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  FolderKanban,
  ListChecks,
  Wallet,
  PiggyBank,
  Calendar,
  MapPin,
  Plane,
  BookOpen,
  BookHeart,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { useBucketListStore } from "@/stores/bucket-list-store";
import {
  useBucketItem,
  useUpdateBucketItem,
  useUpsertBucketIntegration,
} from "@/hooks/use-bucket-list";
import { useCreateProject } from "@/hooks/use-projects";
import { useCreateTask } from "@/hooks/use-tasks";
import { useCreateSavingsGoal } from "@/hooks/use-finance";
import { useCreateGoal } from "@/hooks/use-goals";
import { toast } from "sonner";
import type { BucketItem } from "@/types/bucket-list";
import {
  getSuggestedActivations,
  type ActivateSuggestion,
} from "@/lib/bucket-list/presentation";

type ActionMeta = {
  key: ActivateSuggestion;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function ActivateDreamModal() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const bucketId = useBucketListStore((s) => s.activateModalBucketId);
  const close = useBucketListStore((s) => s.closeActivateModal);

  const bucket = useBucketItem(bucketId);

  const actions: ActionMeta[] = useMemo(() => {
    const suggestions = bucket.data
      ? getSuggestedActivations(bucket.data.type)
      : [];
    const all: Record<ActivateSuggestion, ActionMeta> = {
      project: {
        key: "project",
        label: copy.activateProjectOption,
        description: "Create a new Project scoped to this dream.",
        icon: FolderKanban,
      },
      tasks: {
        key: "tasks",
        label: copy.activateTaskOption,
        description: "Seed a first set of tasks (next step, milestones).",
        icon: ListChecks,
      },
      budget: {
        key: "budget",
        label: copy.activateBudgetOption,
        description: "Open budget tracking for this dream's categories.",
        icon: Wallet,
      },
      savings: {
        key: "savings",
        label: copy.activateSavingsOption,
        description: "Start a savings goal sized to the estimated cost.",
        icon: PiggyBank,
      },
      calendar: {
        key: "calendar",
        label: copy.activateCalendarOption,
        description: "Add target month as a milestone event.",
        icon: Calendar,
      },
      map: {
        key: "map",
        label: copy.activateMapOption,
        description: "Drop a pin on the travel map.",
        icon: MapPin,
      },
      flight: {
        key: "flight",
        label: copy.activateFlightOption,
        description: "Track flight price between origin and destination.",
        icon: Plane,
      },
      research: {
        key: "research",
        label: copy.activateResearchOption,
        description: "Set up a Research folder for articles & notes.",
        icon: BookOpen,
      },
      memory: {
        key: "memory",
        label: copy.activateMemoryOption,
        description: "Prepare a reflection prompt for the completion flow.",
        icon: BookHeart,
      },
    };
    return suggestions.map((s) => all[s]);
  }, [bucket.data, copy]);

  const [selected, setSelected] = useState<Set<ActivateSuggestion>>(new Set());

  useEffect(() => {
    if (bucket.data) {
      const defaults = new Set<ActivateSuggestion>();
      const suggested = getSuggestedActivations(bucket.data.type);
      if (!bucket.data.linked_project_id && suggested.includes("project")) {
        defaults.add("project");
      }
      if (!bucket.data.linked_savings_goal_id && suggested.includes("savings")) {
        defaults.add("savings");
      }
      if (
        bucket.data.type === "travel" &&
        !bucket.data.flight_watch_enabled &&
        suggested.includes("flight")
      ) {
        defaults.add("flight");
      }
      setSelected(defaults);
    }
  }, [bucket.data]);

  const updateBucket = useUpdateBucketItem();
  const upsertIntegration = useUpsertBucketIntegration();
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const createSavingsGoal = useCreateSavingsGoal();
  const createGoal = useCreateGoal();

  const toggle = useCallback((key: ActivateSuggestion) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const applyDisabled = selected.size === 0;
  const [running, setRunning] = useState(false);

  async function handleApply(bucketItem: BucketItem) {
    setRunning(true);
    try {
      const integrationWrites: Promise<unknown>[] = [];
      const updates: Partial<BucketItem> = {};

      if (selected.has("project")) {
        const project = await createProject.mutateAsync({
          name: bucketItem.title,
          description:
            bucketItem.description ??
            `Execution project for bucket dream: ${bucketItem.title}`,
          status: "planning",
          priority:
            bucketItem.priority === "high"
              ? "high"
              : bucketItem.priority === "low"
                ? "low"
                : "medium",
          tags: bucketItem.category_tags,
        });
        (updates as Record<string, unknown>).linked_project_id = project.id;
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: bucketItem.id,
            kind: "project",
            external_id: project.id,
            external_label: project.name,
          }),
        );
      }

      if (selected.has("tasks")) {
        const firstTask = await createTask.mutateAsync({
          title: `Plan next step for: ${bucketItem.title}`,
          description: bucketItem.why_this_matters
            ? `Why this matters: ${bucketItem.why_this_matters}`
            : undefined,
          status: "todo",
          priority:
            bucketItem.priority === "high"
              ? "high"
              : bucketItem.priority === "low"
                ? "low"
                : "medium",
          tags: bucketItem.category_tags,
          project_id: (updates as { linked_project_id?: string }).linked_project_id ??
            bucketItem.linked_project_id ??
            undefined,
        });
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: bucketItem.id,
            kind: "task",
            external_id: firstTask.id,
            external_label: firstTask.title,
          }),
        );
      }

      if (selected.has("savings") && bucketItem.estimated_cost) {
        const sg = await createSavingsGoal.mutateAsync({
          name: `${bucketItem.title} — fund`,
          target_amount: bucketItem.estimated_cost,
          current_amount: 0,
          deadline: bucketItem.target_date ?? undefined,
        });
        (updates as Record<string, unknown>).linked_savings_goal_id = sg.id;
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: bucketItem.id,
            kind: "savings_goal",
            external_id: sg.id,
            external_label: sg.name,
          }),
        );
      }

      if (selected.has("flight") && bucketItem.type === "travel") {
        (updates as Record<string, unknown>).flight_watch_enabled = true;
      }

      if (selected.has("calendar")) {
        const g = await createGoal.mutateAsync({
          name: `${bucketItem.title} — target milestone`,
          description: bucketItem.why_this_matters ?? undefined,
          target_date: bucketItem.target_date ?? undefined,
          category: "Bucket List",
          status: "active",
        });
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: bucketItem.id,
            kind: "calendar_event",
            external_id: g.id,
            external_label: g.name,
          }),
        );
      }

      if (selected.has("map")) {
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: bucketItem.id,
            kind: "map_marker",
            external_label: bucketItem.destination_name ?? bucketItem.title,
            meta: {
              lat: bucketItem.destination_lat,
              lng: bucketItem.destination_lng,
            },
          }),
        );
      }

      if (selected.has("research")) {
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: bucketItem.id,
            kind: "knowledge_entry",
            external_label: `${bucketItem.title} — research`,
            meta: { pending: true },
          }),
        );
      }

      if (selected.has("memory")) {
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: bucketItem.id,
            kind: "journal_entry",
            external_label: `${bucketItem.title} — reflection placeholder`,
            meta: { prepared: true },
          }),
        );
      }

      await Promise.all(integrationWrites);

      if (Object.keys(updates).length > 0) {
        await updateBucket.mutateAsync({ id: bucketItem.id, data: updates });
      }

      toast.success(`${selected.size} action${selected.size === 1 ? "" : "s"} applied`);
      close();
    } catch (err) {
      console.error(err);
      toast.error("Some actions could not be applied");
    } finally {
      setRunning(false);
    }
  }

  const open = Boolean(bucketId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{copy.activateModalTitle}</DialogTitle>
          <DialogDescription>{copy.detailActivateDescription}</DialogDescription>
        </DialogHeader>

        <Separator />

        {bucket.data ? (
          <div className="flex flex-col gap-2">
            {actions.map((action) => {
              const active = selected.has(action.key);
              const Icon = action.icon;
              return (
                <label
                  key={action.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    active
                      ? "border-lime-400/60 bg-lime-400/10"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={active}
                    onCheckedChange={() => toggle(action.key)}
                  />
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-background/70 text-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold">
                      {action.label}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            {copy.cancel}
          </Button>
          <Button
            disabled={applyDisabled || running || !bucket.data}
            onClick={() => bucket.data && handleApply(bucket.data)}
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying…
              </>
            ) : (
              copy.activateApply
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
