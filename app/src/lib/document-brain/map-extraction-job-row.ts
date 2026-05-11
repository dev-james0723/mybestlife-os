import type { ExtractionJobStatus } from "./jobs/extractionJobStatus";

export type DocumentBrainJobSummary = {
  id: string;
  status: ExtractionJobStatus;
  progress: number;
  currentStage: string | null;
  parser: string;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  createdAt: string;
};

export function mapRowToDocumentBrainJob(row: Record<string, unknown>): DocumentBrainJobSummary {
  return {
    id: row.id as string,
    status: row.status as DocumentBrainJobSummary["status"],
    progress: typeof row.progress === "number" ? row.progress : 0,
    currentStage: (row.current_stage as string) ?? null,
    parser: (row.parser as string) ?? "mineru",
    retryCount: typeof row.retry_count === "number" ? row.retry_count : 0,
    maxRetries: typeof row.max_retries === "number" ? row.max_retries : 3,
    errorMessage: (row.error_message as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
  };
}
