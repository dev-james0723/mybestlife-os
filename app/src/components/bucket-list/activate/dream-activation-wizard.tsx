"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DreamExtractionProgress } from "../ai/dream-extraction-progress";
import {
  useUpdateBucketItem,
  useUpsertBucketIntegration,
} from "@/hooks/use-bucket-list";
import { useActivateDreamPlan } from "@/hooks/use-bucket-ai";
import { useCreateProject } from "@/hooks/use-projects";
import { useCreateTask } from "@/hooks/use-tasks";
import { useCreateSavingsGoal } from "@/hooks/use-finance";
import { useCreateNote } from "@/hooks/use-notes";
import { useBucketListStore } from "@/stores/bucket-list-store";
import { nextActivationStatus } from "@/lib/bucket-list/activation";
import type { ActivationChecklistContext } from "@/lib/bucket-list/activation";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketActivationMode,
  BucketDreamActivationPlan,
  BucketItem,
  UpdateBucketItemInput,
} from "@/types/bucket-list";

import { DreamActivationModeStep } from "./dream-activation-mode-step";
import {
  DreamActivationPreview,
  type ActivationArrayKey,
  type ActivationScalarKey,
  type ActivationSelections,
} from "./dream-activation-preview";
import {
  DreamActivationResult,
  type ActivationCreatedCounts,
} from "./dream-activation-result";

type WizardStep = "mode" | "generating" | "preview" | "result";

function mapPriority(p: BucketItem["priority"]): "low" | "medium" | "high" {
  if (p === "high") return "high";
  if (p === "low" || p === "someday") return "low";
  return "medium";
}

function initialSelections(plan: BucketDreamActivationPlan): ActivationSelections {
  return {
    project: Boolean(plan.suggestedProject),
    savings: Boolean(plan.suggestedSavingsGoal),
    advanceStatus: true,
    tasks: plan.suggestedTasks.map(() => true),
    calendar: plan.suggestedCalendarPlaceholders.map(() => true),
    notes: plan.suggestedNotes.map(() => true),
    knowledge: plan.suggestedKnowledgeResources.map(() => true),
  };
}

/**
 * Guided Dream Activation flow: pick a mode → AI proposes a plan → review &
 * select → confirmed writes create real Life-OS records via the existing
 * repositories. Nothing is written before the user confirms in the preview.
 */
export function DreamActivationWizard({
  item,
  copy,
  onClose,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
  onClose: () => void;
}) {
  const [step, setStep] = useState<WizardStep>("mode");
  const [mode, setMode] = useState<BucketActivationMode>("practical");
  const [plan, setPlan] = useState<BucketDreamActivationPlan | null>(null);
  const [selections, setSelections] = useState<ActivationSelections | null>(null);
  const [created, setCreated] = useState<ActivationCreatedCounts | null>(null);
  const [checklistCtx, setChecklistCtx] = useState<ActivationChecklistContext | null>(
    null,
  );
  const [creating, setCreating] = useState(false);

  const buildPlan = useActivateDreamPlan();
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const createSavingsGoal = useCreateSavingsGoal();
  const createNote = useCreateNote();
  const upsertIntegration = useUpsertBucketIntegration();
  const updateBucket = useUpdateBucketItem();
  const setSelectedBucketId = useBucketListStore((s) => s.setSelectedBucketId);

  const next = nextActivationStatus(item.status);

  async function handleGenerate() {
    setStep("generating");
    try {
      const result = await buildPlan.mutateAsync({
        bucketItemId: item.id,
        activationMode: mode,
      });
      setPlan(result);
      setSelections(initialSelections(result));
      setStep("preview");
    } catch {
      setStep("mode");
    }
  }

  function toggleScalar(key: ActivationScalarKey) {
    setSelections((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  }

  function toggleArray(key: ActivationArrayKey, index: number) {
    setSelections((prev) => {
      if (!prev) return prev;
      const arr = [...prev[key]];
      arr[index] = !arr[index];
      return { ...prev, [key]: arr };
    });
  }

  function selectAll(value: boolean) {
    setSelections((prev) => {
      if (!prev || !plan) return prev;
      return {
        project: plan.suggestedProject ? value : prev.project,
        savings: plan.suggestedSavingsGoal ? value : prev.savings,
        advanceStatus: prev.advanceStatus,
        tasks: prev.tasks.map(() => value),
        calendar: prev.calendar.map(() => value),
        notes: prev.notes.map(() => value),
        knowledge: prev.knowledge.map(() => value),
      };
    });
  }

  async function handleCreate() {
    if (!plan || !selections) return;
    setCreating(true);
    try {
      const updates: UpdateBucketItemInput = {};
      const integrationWrites: Promise<unknown>[] = [];
      const counts: ActivationCreatedCounts = {
        project: 0,
        tasks: 0,
        savings: 0,
        calendar: 0,
        notes: 0,
        knowledge: 0,
      };
      let linkedProjectId = item.linked_project_id;

      // Project
      if (plan.suggestedProject && selections.project) {
        const project = await createProject.mutateAsync({
          name: plan.suggestedProject.name,
          description: plan.suggestedProject.description || undefined,
          status: "planning",
          priority: mapPriority(item.priority),
          tags: item.category_tags,
        });
        linkedProjectId = project.id;
        updates.linked_project_id = project.id;
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: item.id,
            kind: "project",
            external_id: project.id,
            external_label: project.name,
          }),
        );
        counts.project += 1;
      }

      // Tasks
      const newTaskIds: string[] = [];
      for (let i = 0; i < plan.suggestedTasks.length; i += 1) {
        if (!selections.tasks[i]) continue;
        const t = plan.suggestedTasks[i]!;
        const task = await createTask.mutateAsync({
          title: t.title,
          description: t.description || undefined,
          status: "todo",
          priority:
            t.priority === "high" || t.priority === "low" || t.priority === "medium"
              ? t.priority
              : mapPriority(item.priority),
          due_date: t.dueDate || undefined,
          tags: item.category_tags,
          project_id: linkedProjectId ?? undefined,
        });
        newTaskIds.push(task.id);
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: item.id,
            kind: "task",
            external_id: task.id,
            external_label: task.title,
          }),
        );
        counts.tasks += 1;
      }
      if (newTaskIds.length > 0) {
        updates.linked_task_ids = [...item.linked_task_ids, ...newTaskIds];
      }

      // Savings goal
      if (plan.suggestedSavingsGoal && selections.savings) {
        const sg = await createSavingsGoal.mutateAsync({
          name: plan.suggestedSavingsGoal.name,
          target_amount: plan.suggestedSavingsGoal.targetAmount,
          current_amount: 0,
          deadline: plan.suggestedSavingsGoal.targetDate || undefined,
        });
        updates.linked_savings_goal_id = sg.id;
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: item.id,
            kind: "savings_goal",
            external_id: sg.id,
            external_label: sg.name,
          }),
        );
        counts.savings += 1;
      }

      // Calendar placeholders → integration rows (no real calendar event yet).
      plan.suggestedCalendarPlaceholders.forEach((c, i) => {
        if (!selections.calendar[i]) return;
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: item.id,
            kind: "calendar_event",
            external_label: c.title,
            meta: { date: c.date, notes: c.notes, placeholder: true },
          }),
        );
        counts.calendar += 1;
      });

      // Notes → real notes + integration.
      for (let i = 0; i < plan.suggestedNotes.length; i += 1) {
        if (!selections.notes[i]) continue;
        const n = plan.suggestedNotes[i]!;
        const note = await createNote.mutateAsync({
          title: n.title,
          content: n.content,
          category: "Bucket List",
          tags: item.category_tags,
          project_id: linkedProjectId ?? undefined,
        });
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: item.id,
            kind: "note",
            external_id: note.id,
            external_label: note.title,
          }),
        );
        counts.notes += 1;
      }

      // Knowledge resources → resource_link integration rows.
      plan.suggestedKnowledgeResources.forEach((k, i) => {
        if (!selections.knowledge[i]) return;
        integrationWrites.push(
          upsertIntegration.mutateAsync({
            bucket_item_id: item.id,
            kind: "resource_link",
            external_label: k.title,
            external_url: k.url ?? null,
            meta: { notes: k.notes },
          }),
        );
        counts.knowledge += 1;
      });

      // Thoughtful, confirmed status advance.
      if (selections.advanceStatus && next) {
        updates.status = next;
      }

      await Promise.all(integrationWrites);
      if (Object.keys(updates).length > 0) {
        await updateBucket.mutateAsync({ id: item.id, data: updates });
      }

      setCreated(counts);
      setChecklistCtx({
        hasFirstAction: counts.tasks > 0 || item.linked_task_ids.length > 0,
        hasResearch: counts.knowledge > 0,
        hasBudget: counts.savings > 0,
        hasSchedule: counts.calendar > 0,
        hasPeople: false,
        hasSupplies: false,
      });
      const total =
        counts.project +
        counts.tasks +
        counts.savings +
        counts.calendar +
        counts.notes +
        counts.knowledge;
      toast.success(copy.activateResultSummary(total));
      setStep("result");
    } catch (err) {
      console.error(err);
      toast.error("Some actions could not be created");
    } finally {
      setCreating(false);
    }
  }

  if (step === "generating") {
    return <DreamExtractionProgress copy={copy} />;
  }

  if (step === "preview" && plan && selections) {
    return (
      <DreamActivationPreview
        plan={plan}
        selections={selections}
        nextStatus={next}
        currentStatus={item.status}
        copy={copy}
        creating={creating}
        onToggleScalar={toggleScalar}
        onToggleArray={toggleArray}
        onSelectAll={selectAll}
        onCreate={handleCreate}
        onBack={() => setStep("mode")}
        onCancel={onClose}
      />
    );
  }

  if (step === "result" && created && checklistCtx) {
    return (
      <DreamActivationResult
        item={item}
        created={created}
        checklistCtx={checklistCtx}
        copy={copy}
        onViewDream={() => {
          onClose();
          setSelectedBucketId(item.id);
        }}
        onDone={onClose}
      />
    );
  }

  return (
    <DreamActivationModeStep
      mode={mode}
      onSelect={setMode}
      onGenerate={handleGenerate}
      generating={buildPlan.isPending}
      copy={copy}
    />
  );
}

/** Loading fallback used while the bucket item is being fetched. */
export function DreamActivationWizardLoading() {
  return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
