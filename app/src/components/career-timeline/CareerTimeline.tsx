"use client";

import { useMemo, useState } from "react";
import {
  Edit2,
  Trash2,
  Plus,
  FileText,
  Briefcase,
  Sparkles,
  History,
  GraduationCap,
  Award,
  Mic,
  Rocket,
  BookOpen,
  Star,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  useCareerEvents,
  useDeleteCareerEvent,
} from "@/hooks/use-career-events";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { useCareerVaultShares } from "@/hooks/use-career-vault-shares";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import type {
  CareerEvent,
  CareerEventType,
  CareerOpportunity,
  CareerVaultFile,
  CareerVaultShare,
} from "@/types/database";
import { EventFormModal } from "./EventFormModal";

type FilterKey = "all" | "education" | "jobs" | "files" | "events" | "shares" | "opportunities";

type TimelineRow =
  | { kind: "event"; date: string; event: CareerEvent }
  | { kind: "file"; date: string; file: CareerVaultFile }
  | { kind: "share"; date: string; share: CareerVaultShare }
  | { kind: "opportunity"; date: string; opportunity: CareerOpportunity; stage: string };

const ICONS: Record<CareerEventType, React.ReactNode> = {
  job_started: <Briefcase className="h-4 w-4" />,
  job_ended: <Briefcase className="h-4 w-4" />,
  promotion: <Star className="h-4 w-4" />,
  education_started: <GraduationCap className="h-4 w-4" />,
  education_completed: <GraduationCap className="h-4 w-4" />,
  certification_earned: <Award className="h-4 w-4" />,
  project_shipped: <Rocket className="h-4 w-4" />,
  award_received: <Award className="h-4 w-4" />,
  speaking_event: <Mic className="h-4 w-4" />,
  publication: <BookOpen className="h-4 w-4" />,
  milestone: <Sparkles className="h-4 w-4" />,
  custom: <History className="h-4 w-4" />,
};

function yearOf(dateIso: string): string {
  const y = new Date(dateIso).getFullYear();
  return Number.isFinite(y) ? String(y) : "—";
}

function formatMonthDay(dateIso: string, locale: string): string {
  try {
    return new Date(dateIso).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateIso;
  }
}

export function CareerTimeline() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).timeline;
  const eventsQ = useCareerEvents();
  const filesQ = useCareerVaultFiles();
  const sharesQ = useCareerVaultShares();
  const oppsQ = useCareerOpportunities();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CareerEvent | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const del = useDeleteCareerEvent();

  const rows = useMemo<TimelineRow[]>(() => {
    const out: TimelineRow[] = [];
    for (const e of eventsQ.data ?? []) {
      out.push({ kind: "event", date: e.start_date, event: e });
    }
    for (const f of filesQ.data ?? []) {
      out.push({ kind: "file", date: f.created_at.slice(0, 10), file: f });
    }
    for (const s of sharesQ.data ?? []) {
      out.push({ kind: "share", date: s.created_at.slice(0, 10), share: s });
    }
    for (const o of oppsQ.data ?? []) {
      const applied = o.applied_date ?? o.created_at?.slice(0, 10);
      if (!applied) continue;
      out.push({
        kind: "opportunity",
        date: applied,
        opportunity: o,
        stage: o.stage,
      });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [eventsQ.data, filesQ.data, sharesQ.data, oppsQ.data]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "files") return rows.filter((r) => r.kind === "file");
    if (filter === "shares") return rows.filter((r) => r.kind === "share");
    if (filter === "opportunities")
      return rows.filter((r) => r.kind === "opportunity");
    if (filter === "events")
      return rows.filter(
        (r) => r.kind === "event" && r.event.event_type !== "milestone",
      );
    if (filter === "education")
      return rows.filter(
        (r) =>
          r.kind === "event" &&
          (r.event.event_type === "education_started" ||
            r.event.event_type === "education_completed" ||
            r.event.event_type === "certification_earned"),
      );
    if (filter === "jobs")
      return rows.filter(
        (r) =>
          r.kind === "event" &&
          (r.event.event_type === "job_started" ||
            r.event.event_type === "job_ended" ||
            r.event.event_type === "promotion"),
      );
    return rows;
  }, [rows, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineRow[]>();
    for (const row of filtered) {
      const y = yearOf(row.date);
      const list = map.get(y) ?? [];
      list.push(row);
      map.set(y, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (eventsQ.isLoading || filesQ.isLoading) return <LoadingPage />;

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
          <Plus className="mr-1 h-4 w-4" />
          {copy.newEvent}
        </Button>
      }
    >
      <nav className="flex flex-wrap gap-2">
        {(
          [
            "all",
            "education",
            "jobs",
            "files",
            "events",
            "shares",
            "opportunities",
          ] as FilterKey[]
        ).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`min-h-11 min-w-11 rounded-full border px-4 py-2 text-sm transition-colors sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-1 sm:text-xs ${
              filter === k
                ? "bg-foreground text-background"
                : "bg-background hover:bg-accent/40"
            }`}
          >
            {copy.filters[k]}
          </button>
        ))}
      </nav>

      {grouped.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {copy.empty}
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([year, items]) => (
            <section key={year}>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {year}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <ol className="relative space-y-3 border-l pl-5">
                {items.map((row, idx) => (
                  <li key={rowKey(row, idx)} className="relative">
                    <span
                      className="absolute -left-[27px] top-2 grid h-5 w-5 place-items-center rounded-full border bg-background text-muted-foreground"
                      aria-hidden
                    >
                      {iconFor(row)}
                    </span>
                    <div className="flex items-start justify-between gap-2 rounded-xl border bg-card p-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {formatMonthDay(row.date, language)}
                          {row.kind === "event" && row.event.auto_generated ? (
                            <span className="ml-2 rounded-full border border-amber-400/40 bg-amber-50/40 px-1.5 py-0.5 text-[9px] font-medium uppercase text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                              {copy.autoGenerated}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold">
                          {titleFor(row)}
                        </div>
                        {subtitleFor(row) ? (
                          <div className="text-xs text-muted-foreground">
                            {subtitleFor(row)}
                          </div>
                        ) : null}
                        {row.kind === "event" && row.event.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.event.description}
                          </p>
                        ) : null}
                        {row.kind === "event" &&
                        row.event.related_file_ids.length > 0 ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            <Link2 className="mr-1 inline h-3 w-3" />
                            {copy.relatedFiles}:{" "}
                            {row.event.related_file_ids.length}
                          </p>
                        ) : null}
                      </div>
                      {row.kind === "event" ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={copy.editEvent}
                            onClick={() => {
                              setEditing(row.event);
                              setFormOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={copy.deleteEvent}
                            onClick={() => setConfirmId(row.event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <EventFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
      />

      <AlertDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteEvent}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.confirmDelete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.form.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmId) del.mutate(confirmId);
                setConfirmId(null);
              }}
            >
              {copy.deleteEvent}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function rowKey(r: TimelineRow, idx: number): string {
  if (r.kind === "event") return `e-${r.event.id}`;
  if (r.kind === "file") return `f-${r.file.id}-${idx}`;
  if (r.kind === "share") return `s-${r.share.id}`;
  return `o-${r.opportunity.id}`;
}

function iconFor(r: TimelineRow): React.ReactNode {
  if (r.kind === "event") return ICONS[r.event.event_type] ?? <History className="h-3 w-3" />;
  if (r.kind === "file") return <FileText className="h-3 w-3" />;
  if (r.kind === "share") return <Link2 className="h-3 w-3" />;
  return <Briefcase className="h-3 w-3" />;
}

function titleFor(r: TimelineRow): React.ReactNode {
  if (r.kind === "event") return r.event.title;
  if (r.kind === "file") return r.file.filename;
  if (r.kind === "share") return `Share: ${r.share.share_type}`;
  return `${r.opportunity.role_title} — ${r.opportunity.company_name}`;
}

function subtitleFor(r: TimelineRow): string | null {
  if (r.kind === "event") {
    const parts = [r.event.organization, r.event.location].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  if (r.kind === "opportunity") return `Stage: ${r.opportunity.stage}`;
  if (r.kind === "file") return r.file.category ?? null;
  return null;
}
