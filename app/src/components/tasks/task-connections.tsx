"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarPlus,
  FileText,
  Lightbulb,
  Loader2,
  StickyNote,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { OSControl } from "@/components/ui/os-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils/date";
import { withAppLocalePrefix } from "@/lib/i18n/locale-path";
import { useAppStore } from "@/stores/app-store";
import type { Task } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";

export interface TaskConnectionItem {
  id: string;
  title: string;
}

interface TaskConnectionsProps {
  task: Task;
  goals: TaskConnectionItem[];
  papers: TaskConnectionItem[];
  ideas: TaskConnectionItem[];
  knowledge: TaskConnectionItem[];
  notes?: TaskConnectionItem[];
  linkedGoalIds: string[];
  linkedPaperIds: string[];
  linkedIdeaIds: string[];
  linkedKnowledgeIds: string[];
  linkedNoteIds?: string[];
  onAddToPlan: () => void;
  addingToPlan?: boolean;
  onLinkGoal: (goalId: string) => void;
  onUnlinkGoal: (goalId: string) => void;
  onLinkPaper: (paperId: string) => void;
  onUnlinkPaper: (paperId: string) => void;
  onLinkIdea: (ideaId: string) => void;
  onUnlinkIdea: (ideaId: string) => void;
  onLinkKnowledge: (knowledgeId: string) => void;
  onUnlinkKnowledge: (knowledgeId: string) => void;
  onUnlinkNote?: (noteId: string) => void;
  goalPending?: boolean;
  paperPending?: boolean;
  ideaPending?: boolean;
  knowledgePending?: boolean;
  notePending?: boolean;
  copy: TasksCenterUiCopy;
}

type ConnectionKind = "goal" | "paper" | "idea" | "knowledge" | "note";

function connectionHref(
  kind: ConnectionKind,
  id: string,
  locale: AppLocale,
): string | undefined {
  if (kind === "goal") return withAppLocalePrefix(locale, "/goals");
  if (kind === "idea") {
    return withAppLocalePrefix(locale, `/ideas?idea=${encodeURIComponent(id)}`);
  }
  if (kind === "paper" || kind === "knowledge") {
    return withAppLocalePrefix(locale, `/knowledge-base/${id}/oracle`);
  }
  return undefined;
}

function ConnectionGroup({
  kind,
  icon: Icon,
  label,
  placeholder,
  emptyLabel,
  options,
  linkedIds,
  onLink,
  onUnlink,
  pending,
  copy,
}: {
  kind: ConnectionKind;
  icon: LucideIcon;
  label: string;
  placeholder?: string;
  emptyLabel: string;
  options: TaskConnectionItem[];
  linkedIds: string[];
  onLink?: (id: string) => void;
  onUnlink?: (id: string) => void;
  pending?: boolean;
  copy: TasksCenterUiCopy;
}) {
  const language = useAppStore((s) => s.language);
  const optionById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );
  const normalizedLinkedIds = useMemo(
    () => [...new Set(linkedIds.filter(Boolean))],
    [linkedIds],
  );
  const linkable = useMemo(
    () => options.filter((option) => !normalizedLinkedIds.includes(option.id)),
    [normalizedLinkedIds, options],
  );

  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/35"
      data-task-connection={kind}
    >
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="break-words [overflow-wrap:anywhere]">{label}</span>
        </h4>
        {normalizedLinkedIds.length > 0 ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {copy.linkedItemCount(normalizedLinkedIds.length)}
          </span>
        ) : null}
      </div>

      <div className="space-y-2 p-2.5">
        {normalizedLinkedIds.length > 0 ? (
          <div className="space-y-1.5">
            {normalizedLinkedIds.map((id) => {
              const option = optionById.get(id);
              const title = option?.title?.trim() || copy.unavailableLinkedItem;
              const href = option
                ? connectionHref(kind, id, language)
                : undefined;
              return (
                <div
                  key={id}
                  className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-border/55 bg-background/55 px-2.5 py-2"
                >
                  {href ? (
                    <Link
                      href={href}
                      className="group flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium hover:text-primary"
                    >
                      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                        {title}
                      </span>
                      <ArrowUpRight
                        className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary"
                        aria-hidden
                      />
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 break-words text-sm font-medium [overflow-wrap:anywhere]">
                      {title}
                    </span>
                  )}
                  {onUnlink ? (
                    <button
                      type="button"
                      onClick={() => onUnlink(id)}
                      disabled={pending}
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                      aria-label={copy.removeLinkedItemAria(title)}
                    >
                      {pending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            {emptyLabel}
          </p>
        )}

        {onLink && placeholder && linkable.length > 0 ? (
          <Select
            value=""
            disabled={pending}
            onValueChange={(value) => value && onLink(String(value))}
            itemToStringLabel={(value) =>
              linkable.find((option) => option.id === value)?.title ??
              String(value)
            }
          >
            <SelectTrigger className="h-11 min-h-11 w-full min-w-0 rounded-xl">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {linkable.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span className="whitespace-normal break-words [overflow-wrap:anywhere]">
                    {option.title}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </section>
  );
}

/** Editable cross-module links for a task, with human-readable entity names. */
export function TaskConnections({
  task,
  goals,
  papers,
  ideas,
  knowledge,
  notes = [],
  linkedGoalIds,
  linkedPaperIds,
  linkedIdeaIds,
  linkedKnowledgeIds,
  linkedNoteIds = [],
  onAddToPlan,
  addingToPlan,
  onLinkGoal,
  onUnlinkGoal,
  onLinkPaper,
  onUnlinkPaper,
  onLinkIdea,
  onUnlinkIdea,
  onLinkKnowledge,
  onUnlinkKnowledge,
  onUnlinkNote,
  goalPending,
  paperPending,
  ideaPending,
  knowledgePending,
  notePending,
  copy,
}: TaskConnectionsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        {copy.connectionsTitle}
      </p>

      <div className="space-y-1.5">
        <OSControl
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onAddToPlan}
          disabled={addingToPlan}
        >
          {addingToPlan ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="h-4 w-4" />
          )}
          {copy.addToTodayPlan}
        </OSControl>
        {task.scheduled_date ? (
          <p className="pl-1 text-xs text-muted-foreground">
            {copy.scheduledForLabel} · {formatDate(task.scheduled_date)}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <ConnectionGroup
          kind="goal"
          icon={Target}
          label={copy.linkGoalLabel}
          placeholder={copy.linkGoalPlaceholder}
          emptyLabel={copy.noGoalsAvailable}
          options={goals}
          linkedIds={linkedGoalIds}
          onLink={onLinkGoal}
          onUnlink={onUnlinkGoal}
          pending={goalPending}
          copy={copy}
        />
        <ConnectionGroup
          kind="paper"
          icon={FileText}
          label={copy.linkPapersLabel}
          placeholder={copy.linkPaperPlaceholder}
          emptyLabel={copy.noPapersAvailable}
          options={papers}
          linkedIds={linkedPaperIds}
          onLink={onLinkPaper}
          onUnlink={onUnlinkPaper}
          pending={paperPending}
          copy={copy}
        />
        <ConnectionGroup
          kind="idea"
          icon={Lightbulb}
          label={copy.linkIdeasLabel}
          placeholder={copy.linkIdeaPlaceholder}
          emptyLabel={copy.noIdeasAvailable}
          options={ideas}
          linkedIds={linkedIdeaIds}
          onLink={onLinkIdea}
          onUnlink={onUnlinkIdea}
          pending={ideaPending}
          copy={copy}
        />
        <ConnectionGroup
          kind="knowledge"
          icon={BookOpen}
          label={copy.linkKnowledgeLabel}
          placeholder={copy.linkKnowledgePlaceholder}
          emptyLabel={copy.noKnowledgeAvailable}
          options={knowledge}
          linkedIds={linkedKnowledgeIds}
          onLink={onLinkKnowledge}
          onUnlink={onUnlinkKnowledge}
          pending={knowledgePending}
          copy={copy}
        />
        {linkedNoteIds.length > 0 ? (
          <ConnectionGroup
            kind="note"
            icon={StickyNote}
            label={copy.linkNotesLabel}
            emptyLabel={copy.unavailableLinkedItem}
            options={notes}
            linkedIds={linkedNoteIds}
            onUnlink={onUnlinkNote}
            pending={notePending}
            copy={copy}
          />
        ) : null}
      </div>
    </div>
  );
}
