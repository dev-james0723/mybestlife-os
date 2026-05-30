"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  X,
  Calendar,
  BarChart3,
  FileText,
  Loader2,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useKeyResults,
  useCreateKeyResult,
  useUpdateKeyResult,
  useDeleteKeyResult,
} from "@/hooks/use-goals";
import { useIdeas } from "@/hooks/use-ideas";
import { useTasks } from "@/hooks/use-tasks";
import { useQuery } from "@tanstack/react-query";
import { brainRelationsRepository } from "@/lib/brain/queries";
import {
  taskIdsForGoal,
  computeProjectTaskProgress,
} from "@/lib/tasks/task-linking";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/utils/html";
import { toast } from "sonner";
import type { Goal, KeyResult } from "@/types/database";
import { GoalLinkedQuotes } from "@/components/quote-library/goal-linked-quotes";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
];

type KeyResultDraft = {
  _tempId: string;
  id?: string;
  name: string;
  target_value: string;
  current_value: string;
  unit: string;
};

function computeProgress(keyResults: KeyResult[]): number {
  const withTargets = keyResults.filter(
    (kr) => kr.target_value != null && kr.target_value > 0
  );
  if (withTargets.length === 0) return 0;
  const total = withTargets.reduce((sum, kr) => {
    return sum + Math.min((kr.current_value / kr.target_value!) * 100, 100);
  }, 0);
  return Math.round(total / withTargets.length);
}

function krProgress(kr: KeyResult): number {
  if (!kr.target_value || kr.target_value <= 0) return 0;
  return Math.min(Math.round((kr.current_value / kr.target_value) * 100), 100);
}

// ─── Key Results Form Section (shared between Create & Edit) ─────────────────

function KeyResultsFormSection({
  drafts,
  onAdd,
  onRemove,
  onUpdate,
  emptyMessage,
}: {
  drafts: KeyResultDraft[];
  onAdd: () => void;
  onRemove: (tempId: string) => void;
  onUpdate: (tempId: string, field: keyof KeyResultDraft, value: string) => void;
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Key Results</Label>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {drafts.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
        <div className="space-y-3">
          {drafts.map((kr) => (
            <div key={kr._tempId} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Input
                  className="flex-1"
                  value={kr.name}
                  onChange={(e) => onUpdate(kr._tempId, "name", e.target.value)}
                  placeholder="Key result title"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemove(kr._tempId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div
                className={cn(
                  "grid gap-3",
                  kr.id
                    ? "grid-cols-1 sm:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2"
                )}
              >
                {kr.id && (
                  <div className="space-y-1">
                    <Label className="text-xs">Current Value</Label>
                    <Input
                      type="number"
                      value={kr.current_value}
                      onChange={(e) =>
                        onUpdate(kr._tempId, "current_value", e.target.value)
                      }
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Target Value</Label>
                  <Input
                    type="number"
                    value={kr.target_value}
                    onChange={(e) =>
                      onUpdate(kr._tempId, "target_value", e.target.value)
                    }
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input
                    value={kr.unit}
                    onChange={(e) =>
                      onUpdate(kr._tempId, "unit", e.target.value)
                    }
                    placeholder="e.g. km, books, %"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── GoalDetailModal ─────────────────────────────────────────────────────────

function GoalDetailModal({
  goal,
  open,
  onOpenChange,
}: {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: keyResults, isLoading: krLoading } = useKeyResults(goal.id);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const createKeyResult = useCreateKeyResult();
  const updateKeyResult = useUpdateKeyResult();
  const deleteKeyResult = useDeleteKeyResult();
  const { data: ideas } = useIdeas();
  const ideasHref = useLocalizedPath("/ideas");

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "active" as Goal["status"],
    target_date: "",
    category: "",
  });
  const [editKRs, setEditKRs] = useState<KeyResultDraft[]>([]);
  const [deletedKRIds, setDeletedKRIds] = useState<string[]>([]);

  const progress = keyResults ? computeProgress(keyResults) : 0;
  const linkedIdeas = useMemo(
    () => (ideas ?? []).filter((idea) => idea.linked_goal_ids?.includes(goal.id)),
    [goal.id, ideas],
  );

  const { data: allTasks } = useTasks();
  const { data: relations } = useQuery({
    queryKey: ["brain", "relations"] as const,
    queryFn: () => brainRelationsRepository.list(),
    staleTime: 60_000,
  });
  const relatedTasks = useMemo(() => {
    const ids = new Set(taskIdsForGoal(relations ?? [], goal.id));
    return (allTasks ?? []).filter((t) => ids.has(t.id));
  }, [relations, allTasks, goal.id]);
  const taskProgress = useMemo(
    () => computeProjectTaskProgress(relatedTasks),
    [relatedTasks],
  );

  function enterEditMode() {
    setEditForm({
      name: goal.name,
      description: goal.description ?? "",
      status: goal.status,
      target_date: goal.target_date ?? "",
      category: goal.category ?? "",
    });
    setEditKRs(
      (keyResults ?? []).map((kr) => ({
        _tempId: kr.id,
        id: kr.id,
        name: kr.name,
        target_value: kr.target_value?.toString() ?? "",
        current_value: kr.current_value.toString(),
        unit: kr.unit ?? "",
      }))
    );
    setDeletedKRIds([]);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function addKR() {
    setEditKRs((prev) => [
      ...prev,
      { _tempId: crypto.randomUUID(), name: "", target_value: "", current_value: "0", unit: "" },
    ]);
  }

  function removeKR(tempId: string) {
    setEditKRs((prev) => {
      const kr = prev.find((k) => k._tempId === tempId);
      if (kr?.id) setDeletedKRIds((ids) => [...ids, kr.id!]);
      return prev.filter((k) => k._tempId !== tempId);
    });
  }

  function updateKR(tempId: string, field: keyof KeyResultDraft, value: string) {
    setEditKRs((prev) =>
      prev.map((kr) => (kr._tempId === tempId ? { ...kr, [field]: value } : kr))
    );
  }

  async function handleSave() {
    if (!editForm.name.trim()) {
      toast.error("Goal name is required");
      return;
    }
    setSaving(true);
    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        data: {
          name: editForm.name,
          description: editForm.description || undefined,
          status: editForm.status,
          target_date: editForm.target_date || undefined,
          category: editForm.category || undefined,
        },
      });

      for (const krId of deletedKRIds) {
        await deleteKeyResult.mutateAsync(krId);
      }

      for (const kr of editKRs) {
        if (kr.id && !deletedKRIds.includes(kr.id)) {
          await updateKeyResult.mutateAsync({
            id: kr.id,
            data: {
              name: kr.name,
              target_value: kr.target_value ? Number(kr.target_value) : undefined,
              current_value: kr.current_value ? Number(kr.current_value) : 0,
              unit: kr.unit || undefined,
            },
          });
        } else if (!kr.id && kr.name.trim()) {
          await createKeyResult.mutateAsync({
            goal_id: goal.id,
            name: kr.name,
            target_value: kr.target_value ? Number(kr.target_value) : undefined,
            unit: kr.unit || undefined,
          });
        }
      }

      setEditing(false);
    } catch {
      // errors surfaced by mutation hooks
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deleteGoal.mutateAsync(goal.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="2xl" className="max-h-[85vh] overflow-y-auto">
          {editing ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit Goal</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Goal Name *</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="Goal name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, description: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={editForm.status}
                          onValueChange={(v) =>
                            setEditForm((f) => ({ ...f, status: v as Goal["status"] }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Date</Label>
                        <DatePickerInput
                          value={editForm.target_date}
                          onChange={(v) =>
                            setEditForm((f) => ({ ...f, target_date: v }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, category: e.target.value }))
                        }
                        placeholder="e.g. Health, Career, Finance"
                      />
                    </div>
                  </CardContent>
                </Card>

                <KeyResultsFormSection
                  drafts={editKRs}
                  onAdd={addKR}
                  onRemove={removeKR}
                  onUpdate={updateKR}
                  emptyMessage="No key results yet. Add one to track measurable progress."
                />
              </div>

              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="sm:mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !editForm.name.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div className="space-y-2">
                    <DialogTitle className="text-xl">{goal.name}</DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge variant="status" value={goal.status} />
                      {goal.category && (
                        <Badge variant="outline">{goal.category}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2.5" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Key Results</h4>
                  </div>
                  {krLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading key results...
                    </div>
                  ) : !keyResults || keyResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No key results defined for this goal.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {keyResults.map((kr) => {
                        const pct = krProgress(kr);
                        return (
                          <div
                            key={kr.id}
                            className="rounded-lg border p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                {kr.name}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {kr.current_value}
                                {kr.target_value != null && ` / ${kr.target_value}`}
                                {kr.unit && ` ${kr.unit}`}
                              </span>
                            </div>
                            {kr.target_value != null && kr.target_value > 0 && (
                              <Progress value={pct} className="h-1.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {goal.description && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">Description</h4>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {goal.description}
                      </p>
                    </div>
                  </>
                )}

                {goal.target_date && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Target Date:</span>
                      <span className="font-medium">
                        {formatDate(goal.target_date)}
                      </span>
                    </div>
                  </>
                )}

                {linkedIdeas.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">Linked ideas</h4>
                      </div>
                      <div className="space-y-2">
                        {linkedIdeas.slice(0, 8).map((idea) => (
                          <Link
                            key={idea.id}
                            href={`${ideasHref}?idea=${encodeURIComponent(idea.id)}`}
                            className="block rounded-lg border border-border/60 p-3 text-sm transition-colors hover:bg-muted/30"
                          >
                            <p className="line-clamp-1 font-medium">
                              {idea.title?.trim() || stripHtml(idea.content).slice(0, 80)}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {relatedTasks.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">Related tasks</h4>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {taskProgress.done}/{taskProgress.total} ·{" "}
                          {taskProgress.completionPct}%
                        </span>
                      </div>
                      <Progress value={taskProgress.completionPct} className="h-1.5" />
                      <div className="space-y-2">
                        {relatedTasks.slice(0, 8).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3 text-sm"
                          >
                            <span
                              className={cn(
                                "line-clamp-1",
                                task.status === "done" &&
                                  "text-muted-foreground line-through",
                              )}
                            >
                              {task.title}
                            </span>
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <GoalLinkedQuotes goalId={goal.id} />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={enterEditMode}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{goal.name}&rdquo;? This
              will also remove all associated key results. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteGoal.isPending}
            >
              {deleteGoal.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── CreateGoalModal ─────────────────────────────────────────────────────────

function CreateGoalModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createGoal = useCreateGoal();
  const createKeyResult = useCreateKeyResult();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "active" as Goal["status"],
    target_date: "",
    category: "",
  });
  const [krDrafts, setKrDrafts] = useState<KeyResultDraft[]>([]);

  function reset() {
    setForm({ name: "", description: "", status: "active", target_date: "", category: "" });
    setKrDrafts([]);
  }

  function addKrDraft() {
    setKrDrafts((prev) => [
      ...prev,
      { _tempId: crypto.randomUUID(), name: "", target_value: "", current_value: "0", unit: "" },
    ]);
  }

  function removeKrDraft(tempId: string) {
    setKrDrafts((prev) => prev.filter((k) => k._tempId !== tempId));
  }

  function updateKrDraft(tempId: string, field: keyof KeyResultDraft, value: string) {
    setKrDrafts((prev) =>
      prev.map((kr) => (kr._tempId === tempId ? { ...kr, [field]: value } : kr))
    );
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const goal = await createGoal.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        status: form.status,
        target_date: form.target_date || undefined,
        category: form.category || undefined,
      });

      for (const kr of krDrafts) {
        if (kr.name.trim()) {
          await createKeyResult.mutateAsync({
            goal_id: goal.id,
            name: kr.name,
            target_value: kr.target_value ? Number(kr.target_value) : undefined,
            unit: kr.unit || undefined,
          });
        }
      }

      reset();
      onOpenChange(false);
    } catch {
      // errors surfaced by mutation hooks
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent size="xl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goal</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Goal Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="What do you want to achieve?"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe your goal..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as Goal["status"] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <DatePickerInput
                    value={form.target_date}
                    onChange={(v) => setForm((f) => ({ ...f, target_date: v }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Health, Career, Finance"
                />
              </div>
            </CardContent>
          </Card>

          <KeyResultsFormSection
            drafts={krDrafts}
            onAdd={addKrDraft}
            onRemove={removeKrDraft}
            onUpdate={updateKrDraft}
            emptyMessage="Define measurable outcomes to track your progress."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!form.name.trim() || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Goal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── GoalsPage ───────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const selectedGoal = useMemo(
    () => goals?.find((g) => g.id === selectedGoalId) ?? null,
    [goals, selectedGoalId]
  );

  const filteredGoals = useMemo(() => {
    if (!goals) return [];
    let result = [...goals];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter((g) => g.status === statusFilter);
    }
    return result;
  }, [goals, search, statusFilter]);

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageShell
        title="Goals"
        description="Set and track your goals and key results"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        }
      >
        <FilterBar
          search={{ placeholder: "Search goals...", value: search, onChange: setSearch }}
          filters={[
            { key: "status", label: "Status", options: statusOptions, value: statusFilter },
          ]}
          onFilterChange={(key, value) => {
            if (key === "status") setStatusFilter(value);
          }}
        />

        {filteredGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals found"
            description={
              goals?.length === 0
                ? "Create your first goal to start tracking progress"
                : "Try adjusting your filters"
            }
            action={
              goals?.length === 0
                ? { label: "Create Goal", onClick: () => setShowCreate(true) }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGoals.map((goal) => (
              <EntityCard
                key={goal.id}
                icon={<Target className="h-5 w-5 text-primary" />}
                title={goal.name}
                subtitle={goal.description ?? undefined}
                badges={
                  <div className="flex items-center gap-1.5">
                    <StatusBadge variant="status" value={goal.status} />
                    {goal.category && (
                      <Badge variant="outline">{goal.category}</Badge>
                    )}
                  </div>
                }
                meta={
                  goal.target_date
                    ? `Target: ${formatDate(goal.target_date)}`
                    : undefined
                }
                onClick={() => setSelectedGoalId(goal.id)}
              >
                <Progress value={0} className="h-2" />
              </EntityCard>
            ))}
          </div>
        )}
      </PageShell>

      <CreateGoalModal open={showCreate} onOpenChange={setShowCreate} />

      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          open={!!selectedGoal}
          onOpenChange={(v) => {
            if (!v) setSelectedGoalId(null);
          }}
        />
      )}
    </>
  );
}
