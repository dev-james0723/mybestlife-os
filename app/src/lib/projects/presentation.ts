import { isValid, parseISO } from "date-fns";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";
import type { Project } from "@/types/database";

type ProjectDateVariant = "short" | "long" | "day";

const DATE_OPTIONS: Record<ProjectDateVariant, Intl.DateTimeFormatOptions> = {
  short: { month: "short", day: "numeric" },
  long: { year: "numeric", month: "short", day: "numeric" },
  day: { day: "numeric" },
};

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function toIntlLocale(locale: AppLocale): string {
  return locale === "en" ? "en-US" : locale;
}

function getDateFormatter(
  locale: AppLocale,
  variant: ProjectDateVariant,
): Intl.DateTimeFormat {
  const key = `${locale}:${variant}`;
  const cached = dateFormatterCache.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(
    toIntlLocale(locale),
    DATE_OPTIONS[variant],
  );
  dateFormatterCache.set(key, formatter);
  return formatter;
}

export function parseProjectDate(
  value: string | Date | null | undefined,
): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

export function formatProjectDate(
  value: string | Date | null | undefined,
  locale: AppLocale,
  variant: ProjectDateVariant = "long",
): string {
  const date = parseProjectDate(value);
  if (!date) return "";
  return getDateFormatter(locale, variant).format(date);
}

export function getProjectDateRangeLabelLocalized(
  project: Project,
  locale: AppLocale,
  variant: ProjectDateVariant = "short",
): string {
  const start = formatProjectDate(project.start_date, locale, variant);
  const end = formatProjectDate(project.end_date, locale, variant);
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} -`;
  if (end) return `- ${end}`;
  return "";
}

export function getProjectStatusLabel(
  status: Project["status"],
  ui: ProjectsUiCopy,
): string {
  switch (status) {
    case "planning":
      return ui.statusPlanning;
    case "active":
      return ui.statusActive;
    case "paused":
      return ui.statusPaused;
    case "completed":
      return ui.statusCompleted;
    case "cancelled":
      return ui.statusCancelled;
    default:
      return status;
  }
}

export function getProjectPriorityLabel(
  priority: Project["priority"],
  ui: ProjectsUiCopy,
): string {
  switch (priority) {
    case "low":
      return ui.priorityLow;
    case "medium":
      return ui.priorityMedium;
    case "high":
      return ui.priorityHigh;
    case "urgent":
      return ui.priorityUrgent;
    default:
      return priority;
  }
}

export function getProjectStatusOptions(ui: ProjectsUiCopy): Array<{
  value: Project["status"];
  label: string;
}> {
  return [
    { value: "planning", label: ui.statusPlanning },
    { value: "active", label: ui.statusActive },
    { value: "paused", label: ui.statusPaused },
    { value: "completed", label: ui.statusCompleted },
    { value: "cancelled", label: ui.statusCancelled },
  ];
}

export function getProjectPriorityOptions(ui: ProjectsUiCopy): Array<{
  value: Project["priority"];
  label: string;
}> {
  return [
    { value: "low", label: ui.priorityLow },
    { value: "medium", label: ui.priorityMedium },
    { value: "high", label: ui.priorityHigh },
    { value: "urgent", label: ui.priorityUrgent },
  ];
}
