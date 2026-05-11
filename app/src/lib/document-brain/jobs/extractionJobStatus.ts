export const EXTRACTION_JOB_STATUSES = [
  "queued",
  "processing",
  "parsing",
  "normalizing",
  "enriching",
  "indexing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type ExtractionJobStatus = (typeof EXTRACTION_JOB_STATUSES)[number];

export function isTerminalExtractionJobStatus(s: string): boolean {
  return s === "completed" || s === "failed" || s === "cancelled";
}
