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
  Info,
} from "lucide-react";
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
import { OSIconControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  CareerEmptyState,
  CareerFilterChips,
  CareerHelpPanel,
  CareerSectionPanel,
} from "@/components/career/career-page-ui";
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

const FILTER_KEYS: FilterKey[] = [
  "all",
  "education",
  "jobs",
  "files",
  "events",
  "shares",
  "opportunities",
];

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
    return rows.filter((row) => rowMatchesFilter(row, filter));
  }, [rows, filter]);

  const filterItems = useMemo(
    () =>
      FILTER_KEYS.map((id) => ({
        id,
        label: copy.filters[id],
        count: rows.filter((row) => rowMatchesFilter(row, id)).length,
      })),
    [copy.filters, rows],
  );

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
        <OSPrimaryAction
          className="gap-2"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          {copy.newEvent}
        </OSPrimaryAction>
      }
    >
      <div className="space-y-5">
        <CareerHelpPanel icon={Info} title="What appears here?">
          Manual milestones, Career Vault files, shared files, applications,
          education, jobs, awards, projects, speaking, publications, and other
          career events are merged into one dated thread.
        </CareerHelpPanel>

        <CareerFilterChips
          items={filterItems}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter career timeline"
        />

        {grouped.length === 0 ? (
          <CareerEmptyState
            icon={History}
            title="Add your first milestone"
            description={copy.empty}
            actionLabel="Add your first milestone"
            onAction={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          />
        ) : (
          <CareerSectionPanel
            title="Career history thread"
            description="Auto-generated items are labeled quietly so your timeline stays useful without becoming noisy."
          >
            <div className="space-y-6">
              {grouped.map(([year, items]) => (
                <section key={year}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {year}
                    </span>
                    <div className="h-px flex-1 bg-border/70" />
                  </div>
                  <ol className="relative space-y-3 border-l border-border/70 pl-5">
                    {items.map((row, idx) => (
                      <li key={rowKey(row, idx)} className="relative">
                        <span
                          className="absolute -left-[27px] top-3 grid h-5 w-5 place-items-center rounded-full border border-white/50 bg-white/80 text-muted-foreground shadow-sm dark:border-white/10 dark:bg-slate-950"
                          aria-hidden
                        >
                          {iconFor(row)}
                        </span>
                        <div className="flex items-start justify-between gap-3 rounded-xl border border-white/55 bg-white/74 p-3 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-slate-950/72">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              {formatMonthDay(row.date, language)}
                              {row.kind === "event" && row.event.auto_generated ? (
                                <span className="ml-2 rounded-md border border-amber-400/40 bg-amber-50/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                  {copy.autoGenerated}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm font-semibold">
                              {titleFor(row)}
                            </div>
                            {subtitleFor(row) ? (
                              <div className="text-xs text-muted-foreground">
                                {subtitleFor(row)}
                              </div>
                            ) : null}
                            {row.kind === "event" && row.event.description ? (
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {row.event.description}
                              </p>
                            ) : null}
                            {row.kind === "event" &&
                            row.event.related_file_ids.length > 0 ? (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                <Link2 className="mr-1 inline h-3 w-3" />
                                {copy.relatedFiles}:{" "}
                                {row.event.related_file_ids.length}
                              </p>
                            ) : null}
                          </div>
                          {row.kind === "event" ? (
                            <div className="flex shrink-0 gap-1">
                              <OSIconControl
                                osSize="compact"
                                variant="ghost"
                                aria-label={copy.editEvent}
                                onClick={() => {
                                  setEditing(row.event);
                                  setFormOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </OSIconControl>
                              <OSIconControl
                                osSize="compact"
                                variant="ghost"
                                aria-label={copy.deleteEvent}
                                onClick={() => setConfirmId(row.event.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </OSIconControl>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </CareerSectionPanel>
        )}
      </div>

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

function rowMatchesFilter(row: TimelineRow, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "files") return row.kind === "file";
  if (filter === "shares") return row.kind === "share";
  if (filter === "opportunities") return row.kind === "opportunity";
  if (filter === "events") {
    return row.kind === "event" && row.event.event_type !== "milestone";
  }
  if (filter === "education") {
    return (
      row.kind === "event" &&
      (row.event.event_type === "education_started" ||
        row.event.event_type === "education_completed" ||
        row.event.event_type === "certification_earned")
    );
  }
  if (filter === "jobs") {
    return (
      row.kind === "event" &&
      (row.event.event_type === "job_started" ||
        row.event.event_type === "job_ended" ||
        row.event.event_type === "promotion")
    );
  }
  return true;
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
