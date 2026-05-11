"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, CheckCircle2, Flag, Repeat, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { useAppStore } from "@/stores/app-store";
import type {
  CalendarItem,
  CalendarItemSourceType,
  CalendarItemTask,
} from "@/lib/calendar/types";

type Props = {
  items: readonly CalendarItem[];
  viewAllHref: string;
};

type PriorityBadge = {
  label: string;
  bg: string;
  text: string;
  icon: typeof Calendar;
};

function itemBadge(
  item: CalendarItem,
  copy: ReturnType<typeof getCalendarUiCopy>
): PriorityBadge {
  if (item.source_type === "milestone") {
    return {
      label: copy.badgeMilestone,
      bg: "rgba(168, 85, 247, 0.18)",
      text: "#d8b4fe",
      icon: Flag,
    };
  }
  if (item.source_type === "habit") {
    return {
      label: copy.badgeHabit,
      bg: "rgba(16, 185, 129, 0.18)",
      text: "#6ee7b7",
      icon: Repeat,
    };
  }
  if (item.source_type === "reminder") {
    return {
      label: copy.badgeReminder,
      bg: "rgba(234, 179, 8, 0.18)",
      text: "#fde68a",
      icon: Zap,
    };
  }
  if (item.source_type === "external") {
    return {
      label: copy.badgeExternal,
      bg: "rgba(59, 130, 246, 0.18)",
      text: "#93c5fd",
      icon: Calendar,
    };
  }
  // task
  const t = item as CalendarItemTask;
  if (t.priority === "urgent" || t.priority === "high") {
    return {
      label: copy.badgeDeadline,
      bg: "rgba(239, 68, 68, 0.18)",
      text: "#fca5a5",
      icon: Target,
    };
  }
  if ((t.estimated_blocks ?? 0) >= 6) {
    return {
      label: copy.badgeFocus,
      bg: "rgba(59, 130, 246, 0.18)",
      text: "#93c5fd",
      icon: Target,
    };
  }
  return {
    label: copy.badgeDeadline,
    bg: "rgba(148, 163, 184, 0.18)",
    text: "#cbd5e1",
    icon: CheckCircle2,
  };
}

const SOURCE_ICON: Record<CalendarItemSourceType, typeof Calendar> = {
  task: CheckCircle2,
  habit: Repeat,
  milestone: Flag,
  reminder: Zap,
  external: Calendar,
};

export function UpcomingPrioritiesPanel({ items, viewAllHref }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);

  if (items.length === 0) {
    return (
      <section
        className="calendar-glass-dark calendar-specular-highlight px-5 py-8 text-center"
        aria-label={copy.orbitalUpcomingTitle}
      >
        <p className="text-sm text-muted-foreground">{copy.orbitalEmptyState}</p>
      </section>
    );
  }

  return (
    <section
      className="calendar-glass-dark calendar-specular-highlight flex h-full flex-col overflow-hidden"
      aria-label={copy.orbitalUpcomingTitle}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/90">
          {copy.orbitalUpcomingTitle}
        </h3>
        <Link
          href={viewAllHref}
          className="text-xs font-medium text-[var(--calendar-lime)] hover:brightness-110"
        >
          {copy.viewFullList}
        </Link>
      </header>
      <ul className="flex-1 overflow-y-auto">
        {items.map((item) => {
          const badge = itemBadge(item, copy);
          const Icon = SOURCE_ICON[item.source_type];
          const BadgeIcon = badge.icon;
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 border-b border-white/5 px-5 py-3 text-sm last:border-b-0",
                "transition-colors hover:bg-white/5"
              )}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${item.color ?? "#64748b"}24`,
                  color: item.color ?? "#cbd5e1",
                }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{item.title}</p>
                {item.subtitle && (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                <BadgeIcon className="h-2.5 w-2.5" />
                {badge.label}
              </span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {format(parseISO(item.date), "MMM d", { locale: dateLocale })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
