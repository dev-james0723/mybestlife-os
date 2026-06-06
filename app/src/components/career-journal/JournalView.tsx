"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  ClipboardCheck,
  Edit2,
  Plus,
  Scale,
  Trash2,
  TrendingUp,
} from "lucide-react";
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
import { OSControl, OSIconControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  CareerEmptyState,
  CareerMetricCard,
  CareerMetricGrid,
  CareerSectionPanel,
} from "@/components/career/career-page-ui";
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
  const reviewDueCount = useMemo(
    () => decisions.filter((decision) => needsReview(decision)).length,
    [decisions],
  );
  const reviewed = useMemo(
    () =>
      decisions.filter(
        (decision) =>
          decision.decision_quality_score !== null &&
          decision.decision_quality_score !== undefined,
      ),
    [decisions],
  );
  const averageQuality =
    reviewed.length > 0
      ? Math.round(
          reviewed.reduce(
            (sum, decision) => sum + (decision.decision_quality_score ?? 0),
            0,
          ) / reviewed.length,
        )
      : null;

  if (q.isLoading) return <LoadingPage />;

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <OSPrimaryAction
          className="gap-2"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          {copy.newDecision}
        </OSPrimaryAction>
      }
    >
      <div className="space-y-5">
        <CareerMetricGrid>
          <CareerMetricCard
            icon={Scale}
            label="Decisions"
            value={decisions.length}
            description="Career calls captured with context and assumptions."
          />
          <CareerMetricCard
            icon={CalendarCheck}
            label="Reviews due"
            value={reviewDueCount}
            description="Decisions ready for outcome review."
          />
          <CareerMetricCard
            icon={ClipboardCheck}
            label="Reviewed"
            value={reviewed.length}
            description="Closed feedback loops in your judgment system."
          />
          <CareerMetricCard
            icon={TrendingUp}
            label="Avg. quality"
            value={averageQuality === null ? "—" : `${averageQuality}/10`}
            description="Average score after reviewing the decision process."
          />
        </CareerMetricGrid>

        {decisions.length === 0 ? (
          <CareerEmptyState
            icon={Scale}
            title="Capture your first career decision"
            description={copy.empty}
            actionLabel={copy.newDecision}
            onAction={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          />
        ) : (
          <CareerSectionPanel
            title="Decision log"
            description="Each card keeps the decision, framework, review date, and outcome quality visible."
          >
            <ul className="space-y-3">
              {decisions.map((d) => (
                <li
                  key={d.id}
                  className="space-y-3 rounded-xl border border-white/55 bg-white/74 p-4 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-slate-950/72"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                        {d.decision_quality_score !== null &&
                        d.decision_quality_score !== undefined ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {copy.qualityScore(d.decision_quality_score)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {copy.decidedOn(formatDate(d.decided_at, language))}
                      </p>
                      {d.decision ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6">
                          {d.decision}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {needsReview(d) ? (
                        <OSControl
                          osSize="compact"
                          className="gap-1"
                          onClick={() => {
                            setReviewing(d);
                            setReviewOpen(true);
                          }}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                          {copy.reviewNow}
                        </OSControl>
                      ) : null}
                      <OSIconControl
                        osSize="compact"
                        variant="ghost"
                        onClick={() => {
                          setEditing(d);
                          setFormOpen(true);
                        }}
                        aria-label={copy.form.title}
                      >
                        <Edit2 className="h-4 w-4" aria-hidden />
                      </OSIconControl>
                      <OSIconControl
                        osSize="compact"
                        variant="ghost"
                        onClick={() => setDeleteTarget(d)}
                        aria-label={copy.form.remove}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </OSIconControl>
                    </div>
                  </div>
                  {d.options.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {d.options.slice(0, 6).map((o, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg border border-white/50 bg-white/58 px-2 py-1 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]"
                        >
                          {o.name}
                          {o.score !== null && o.score !== undefined
                            ? ` · ${o.score}/10`
                            : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </CareerSectionPanel>
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
