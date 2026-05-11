import { formatDate } from "@/lib/utils/date";
import type { Project } from "@/types/database";

const SUMMARY_FALLBACK_LIMIT = 120;

export function getProjectOneSentenceSummary(
  description: string | null | undefined,
): string {
  const raw = (description ?? "").trim();
  if (!raw) return "";

  const singleLine = raw.replace(/\s+/g, " ").trim();
  const firstSentence = singleLine
    .split(/[.!?。！？]/)
    .map((part) => part.trim())
    .find(Boolean);

  const summary = firstSentence || singleLine;
  if (summary.length <= SUMMARY_FALLBACK_LIMIT) return summary;
  return `${summary.slice(0, SUMMARY_FALLBACK_LIMIT - 1)}…`;
}

export function getProjectDateRangeLabel(project: Project): string {
  if (project.start_date && project.end_date) {
    return `${formatDate(project.start_date)} - ${formatDate(project.end_date)}`;
  }
  if (project.start_date) return `${formatDate(project.start_date)} -`;
  if (project.end_date) return `- ${formatDate(project.end_date)}`;
  return "";
}
