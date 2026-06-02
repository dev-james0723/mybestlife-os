"use client";

import { useState, useMemo, useCallback, useRef, type RefObject } from "react";
import { format } from "date-fns";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { LoadingPage } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import {
  OSControl,
  OSDialogSurface,
  OSEmptyState,
  OSPrimaryAction,
  OSSolidPanel,
} from "@/components/ui/os-primitives";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { RichTextReadOnly } from "@/components/shared/rich-text-read-only";
import { stripHtml } from "@/lib/utils/html";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarCheck, Plus, Pencil, Trash2, Sparkles, AlertTriangle, Target, Calendar } from "lucide-react";
import {
  useWeeklyReviews,
  useCreateWeeklyReview,
  useUpdateWeeklyReview,
  useDeleteWeeklyReview,
} from "@/hooks/use-weekly-reviews";
import { formatDate } from "@/lib/utils/date";
import type { WeeklyReview } from "@/types/database";

function reviewPreview(review: WeeklyReview): string {
  const text = stripHtml(review.content?.trim() ?? "");
  if (!text) return "No summary yet";
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

export default function WeeklyReviewPage() {
  const { data: reviews, isLoading } = useWeeklyReviews();
  const createReview = useCreateWeeklyReview();
  const updateReview = useUpdateWeeklyReview();
  const deleteReview = useDeleteWeeklyReview();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<WeeklyReview | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createEditorKey, setCreateEditorKey] = useState(0);
  const crOverall = useRef<RichTextEditorHandle>(null);
  const crHighlights = useRef<RichTextEditorHandle>(null);
  const crChallenges = useRef<RichTextEditorHandle>(null);
  const crFocus = useRef<RichTextEditorHandle>(null);
  const erOverall = useRef<RichTextEditorHandle>(null);
  const erHighlights = useRef<RichTextEditorHandle>(null);
  const erChallenges = useRef<RichTextEditorHandle>(null);
  const erFocus = useRef<RichTextEditorHandle>(null);

  const [form, setForm] = useState({
    review_date: format(new Date(), "yyyy-MM-dd"),
  });

  const resetForm = useCallback(() => {
    setForm({
      review_date: format(new Date(), "yyyy-MM-dd"),
    });
    crOverall.current?.reset();
    crHighlights.current?.reset();
    crChallenges.current?.reset();
    crFocus.current?.reset();
  }, []);

  const filtered = useMemo(() => {
    if (!reviews) return [];
    if (!search.trim()) return reviews;
    const q = search.toLowerCase();
    return reviews.filter(
      (r) =>
        stripHtml(r.content ?? "").toLowerCase().includes(q) ||
        stripHtml(r.highlights ?? "").toLowerCase().includes(q) ||
        stripHtml(r.challenges ?? "").toLowerCase().includes(q) ||
        stripHtml(r.next_week_focus ?? "").toLowerCase().includes(q)
    );
  }, [reviews, search]);

  const fieldHtml = (ref: RefObject<RichTextEditorHandle | null>) => {
    const html = ref.current?.getHtml() ?? "";
    const text = ref.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return null;
    return html.trim() || text;
  };

  const handleCreate = async () => {
    await createReview.mutateAsync({
      review_date: form.review_date,
      content: fieldHtml(crOverall),
      highlights: fieldHtml(crHighlights),
      challenges: fieldHtml(crChallenges),
      next_week_focus: fieldHtml(crFocus),
    });
    resetForm();
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const updated = await updateReview.mutateAsync({
      id: selected.id,
      data: {
        review_date: form.review_date,
        content: fieldHtml(erOverall),
        highlights: fieldHtml(erHighlights),
        challenges: fieldHtml(erChallenges),
        next_week_focus: fieldHtml(erFocus),
      },
    });
    setSelected(updated);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteReview.mutateAsync(selected.id);
    setSelected(null);
    setShowDeleteConfirm(false);
  };

  const openCreateWeekly = () => {
    resetForm();
    setCreateEditorKey((k) => k + 1);
    setShowCreate(true);
  };

  const openDetail = (review: WeeklyReview) => {
    setSelected(review);
    setForm({
      review_date: review.review_date,
    });
    setIsEditing(false);
  };

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageShell
        title="Weekly Review"
        description="Reflect, learn, and set focus for the week ahead"
        actions={
          <OSPrimaryAction onClick={openCreateWeekly}>
            <Plus className="h-4 w-4 mr-2" />
            New review
          </OSPrimaryAction>
        }
      >
        <FilterBar
          search={{
            placeholder: "Search reviews…",
            value: search,
            onChange: setSearch,
          }}
        />

        {filtered.length === 0 ? (
          <OSEmptyState
            icon={CalendarCheck}
            title="No weekly reviews"
            description={
              reviews?.length === 0
                ? "Capture highlights, challenges, and next week's focus"
                : "Try a different search"
            }
            action={
              reviews?.length === 0
                ? (
                    <OSPrimaryAction onClick={openCreateWeekly}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create review
                    </OSPrimaryAction>
                  )
                : undefined
            }
          />
        ) : (
          <div className="space-y-3 mt-4">
            {filtered.map((review) => (
              <EntityCard
                key={review.id}
                title={`Week of ${formatDate(review.review_date)}`}
                subtitle={reviewPreview(review)}
                meta={<span>Updated {formatDate(review.updated_at)}</span>}
                onClick={() => openDetail(review)}
              />
            ))}
          </div>
        )}
      </PageShell>

      {/* ── Create Weekly Review Modal ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <OSDialogSurface size="2xl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New weekly review</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2" key={createEditorKey}>
            <div className="space-y-2">
              <Label>Review date</Label>
              <DatePickerInput
                value={form.review_date}
                onChange={(v) => setForm((f) => ({ ...f, review_date: v }))}
                className="sm:max-w-xs"
              />
            </div>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Overall Reflection</h3>
              </div>
              <RichTextEditor
                ref={crOverall}
                initialHtml=""
                placeholder="How did the week go?"
                minHeightClass="min-h-[120px]"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Highlights</h3>
              </div>
              <RichTextEditor
                ref={crHighlights}
                initialHtml=""
                placeholder="Wins and bright spots"
                minHeightClass="min-h-[100px]"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Challenges</h3>
              </div>
              <RichTextEditor
                ref={crChallenges}
                initialHtml=""
                placeholder="What was hard?"
                minHeightClass="min-h-[100px]"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Next Week Focus</h3>
              </div>
              <RichTextEditor
                ref={crFocus}
                initialHtml=""
                placeholder="Top priorities for next week"
                minHeightClass="min-h-[100px]"
              />
            </section>
          </div>

          <DialogFooter>
            <OSControl onClick={() => setShowCreate(false)}>
              Cancel
            </OSControl>
            <OSPrimaryAction onClick={handleCreate} disabled={createReview.isPending}>
              {createReview.isPending ? "Saving…" : "Save review"}
            </OSPrimaryAction>
          </DialogFooter>
        </OSDialogSurface>
      </Dialog>

      {/* ── Weekly Review Detail Modal ── */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setIsEditing(false); } }}>
        <OSDialogSurface size="2xl" className="max-h-[85vh] overflow-y-auto">
          {selected && (
            isEditing ? (
              <>
                <DialogHeader>
                  <DialogTitle>Edit review</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-2" key={`${selected.id}-edit`}>
                  <div className="space-y-2">
                    <Label>Review date</Label>
                    <DatePickerInput
                      value={form.review_date}
                      onChange={(v) => setForm((f) => ({ ...f, review_date: v }))}
                      className="sm:max-w-xs"
                    />
                  </div>

                  <Separator />

                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Overall Reflection</h3>
                    </div>
                    <RichTextEditor
                      ref={erOverall}
                      initialHtml={selected.content ?? ""}
                      placeholder="How did the week go?"
                      minHeightClass="min-h-[120px]"
                    />
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Highlights</h3>
                    </div>
                    <RichTextEditor
                      ref={erHighlights}
                      initialHtml={selected.highlights ?? ""}
                      placeholder="Wins and bright spots"
                      minHeightClass="min-h-[100px]"
                    />
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Challenges</h3>
                    </div>
                    <RichTextEditor
                      ref={erChallenges}
                      initialHtml={selected.challenges ?? ""}
                      placeholder="What was hard?"
                      minHeightClass="min-h-[100px]"
                    />
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Next Week Focus</h3>
                    </div>
                    <RichTextEditor
                      ref={erFocus}
                      initialHtml={selected.next_week_focus ?? ""}
                      placeholder="Top priorities for next week"
                      minHeightClass="min-h-[100px]"
                    />
                  </section>
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
                  <OSControl onClick={() => setIsEditing(false)}>
                    Cancel
                  </OSControl>
                  <OSPrimaryAction onClick={handleUpdate} disabled={updateReview.isPending}>
                    {updateReview.isPending ? "Saving…" : "Save changes"}
                  </OSPrimaryAction>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4 pr-8">
                    <div className="space-y-2">
                      <DialogTitle className="text-xl">Weekly Review</DialogTitle>
                      <Badge variant="secondary" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        Week of {formatDate(selected.review_date)}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Overall Reflection</p>
                    </div>
                    <OSSolidPanel className="rounded-xl p-4">
                      <RichTextReadOnly value={selected.content} />
                    </OSSolidPanel>
                  </section>

                  <Separator />

                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Highlights</p>
                    </div>
                    <OSSolidPanel className="rounded-xl p-4">
                      <RichTextReadOnly value={selected.highlights} />
                    </OSSolidPanel>
                  </section>

                  <Separator />

                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Challenges</p>
                    </div>
                    <OSSolidPanel className="rounded-xl p-4">
                      <RichTextReadOnly value={selected.challenges} />
                    </OSSolidPanel>
                  </section>

                  <Separator />

                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Next Week Focus</p>
                    </div>
                    <OSSolidPanel className="rounded-xl p-4">
                      <RichTextReadOnly value={selected.next_week_focus} />
                    </OSSolidPanel>
                  </section>

                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(selected.created_at)}
                  </p>
                </div>

                <DialogFooter>
                  <OSControl onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </OSControl>
                </DialogFooter>
              </>
            )
          )}
        </OSDialogSurface>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete weekly review?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the review for{" "}
              {selected ? formatDate(selected.review_date) : "this week"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReview.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
