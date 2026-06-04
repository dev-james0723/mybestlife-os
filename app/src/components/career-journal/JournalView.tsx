"use client";

import { useMemo, useState } from "react";
import { Plus, Edit2, Trash2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import {
  useCareerDecisions,
  useDeleteDecision,
} from "@/hooks/use-career-decisions";
import { DecisionFormDialog } from "./DecisionForm";
import { ReviewFormDialog } from "./ReviewForm";
import { DecisionQualityChart } from "./DecisionQualityChart";
import type { CareerDecision } from "@/types/database";

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function needsReview(d: CareerDecision): boolean {
  if (d.decision_quality_score !== null && d.decision_quality_score !== undefined) {
    return false;
  }
  if (!d.review_reminder_date) return false;
  return new Date(d.review_reminder_date).getTime() <= Date.now();
}

export function JournalView() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).journal;

  const q = useCareerDecisions();
  const del = useDeleteDecision();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CareerDecision | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewing, setReviewing] = useState<CareerDecision | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CareerDecision | null>(null);

  const decisions = useMemo(() => q.data ?? [], [q.data]);

  if (q.isLoading) return <LoadingPage />;

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <Button
          className="h-11 px-4 sm:h-8 sm:px-2.5"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {copy.newDecision}
        </Button>
      }
    >
      <div className="space-y-4">
        {decisions.length === 0 ? (
          <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            {copy.empty}
          </p>
        ) : (
          <ul className="space-y-3">
            {decisions.map((d) => (
              <li
                key={d.id}
                className="space-y-2 rounded-2xl border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{d.title}</h3>
                      {d.decision_type && (
                        <Badge variant="outline" className="text-[10px]">
                          {copy.decisionTypes[d.decision_type] ??
                            d.decision_type}
                        </Badge>
                      )}
                      {d.framework && (
                        <Badge variant="secondary" className="text-[10px]">
                          {copy.frameworks[d.framework]}
                        </Badge>
                      )}
                      {needsReview(d) && (
                        <Badge className="bg-amber-500 text-[10px] text-white hover:bg-amber-500">
                          {copy.reviewDue(
                            formatDate(
                              d.review_reminder_date ?? d.decided_at,
                              language,
                            ),
                          )}
                        </Badge>
                      )}
                      {d.decision_quality_score && (
                        <Badge variant="secondary" className="text-[10px]">
                          {copy.qualityScore(d.decision_quality_score)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {copy.decidedOn(formatDate(d.decided_at, language))}
                    </p>
                    {d.decision && (
                      <p className="mt-2 line-clamp-2 text-sm">{d.decision}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {needsReview(d) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReviewing(d);
                          setReviewOpen(true);
                        }}
                      >
                        <ClipboardCheck
                          className="mr-1 h-3.5 w-3.5"
                          aria-hidden
                        />
                        {copy.reviewNow}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(d);
                        setFormOpen(true);
                      }}
                      aria-label={copy.form.title}
                    >
                      <Edit2 className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(d)}
                      aria-label={copy.form.remove}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
                {d.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {d.options.slice(0, 6).map((o, idx) => (
                      <span
                        key={idx}
                        className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {o.name}
                        {o.score !== null && o.score !== undefined
                          ? ` · ${o.score}/10`
                          : ""}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <DecisionQualityChart decisions={decisions} />
      </div>

      <DecisionFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        existing={editing}
      />

      <ReviewFormDialog
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) setReviewing(null);
        }}
        decision={reviewing}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.form.remove}</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.title}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.form.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                await del.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {copy.form.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
