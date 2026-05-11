import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { docBrainRootPrefix } from "@/lib/document-brain/storage/documentStorage";
import type { ExtractionJobStatus } from "@/lib/document-brain/jobs/extractionJobStatus";
import { isTerminalExtractionJobStatus } from "@/lib/document-brain/jobs/extractionJobStatus";

export type WorkerJobStatusPayload = {
  job_id: string;
  user_id: string;
  document_id: string;
  status: ExtractionJobStatus;
  progress?: number;
  current_stage?: string | null;
  output_base_path?: string | null;
  error_code?: string | null;
  error_message?: string | null;
};

export async function insertQueuedExtractionJob(input: {
  userId: string;
  documentId: string;
  inputFilePath: string;
  parserMode?: string | null;
}): Promise<{ id: string }> {
  const supabase = await createServerSupabaseClient();
  const outputBasePath = docBrainRootPrefix(input.userId, input.documentId);

  const { data, error } = await supabase
    .from("document_extraction_jobs")
    .insert({
      user_id: input.userId,
      document_id: input.documentId,
      status: "queued",
      parser: "mineru",
      parser_mode: input.parserMode ?? null,
      input_file_path: input.inputFilePath,
      output_base_path: outputBasePath,
      progress: 0,
      current_stage: "Queued for MinerU worker",
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data!.id as string };
}

export async function markJobFailedByIdForUser(
  jobId: string,
  userId: string,
  message: string,
  code = "dispatch_failed",
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase
    .from("document_extraction_jobs")
    .update({
      status: "failed",
      error_code: code,
      error_message: message.slice(0, 2000),
      completed_at: new Date().toISOString(),
      current_stage: null,
    })
    .eq("id", jobId)
    .eq("user_id", userId);
}

export async function applyWorkerJobStatus(
  payload: WorkerJobStatusPayload,
  opts: { workerSecretValid: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!opts.workerSecretValid) {
    return { ok: false, error: "unauthorized" };
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: job, error: jobErr } = await admin
    .from("document_extraction_jobs")
    .select("id,user_id,document_id")
    .eq("id", payload.job_id)
    .maybeSingle();

  if (jobErr || !job) {
    return { ok: false, error: "job_not_found" };
  }

  const row = job as { id: string; user_id: string; document_id: string };
  if (row.user_id !== payload.user_id || row.document_id !== payload.document_id) {
    return { ok: false, error: "job_mismatch" };
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: payload.status,
    progress: typeof payload.progress === "number" ? payload.progress : 0,
    current_stage: payload.current_stage ?? null,
    error_code: payload.error_code ?? null,
    error_message: payload.error_message ?? null,
  };
  if (payload.output_base_path != null && payload.output_base_path !== "") {
    updates.output_base_path = payload.output_base_path;
  }
  if (isTerminalExtractionJobStatus(payload.status)) {
    updates.completed_at = now;
    if (payload.status === "cancelled") {
      updates.cancelled_at = now;
    }
  }

  const { error: upErr } = await admin
    .from("document_extraction_jobs")
    .update(updates)
    .eq("id", payload.job_id);
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  if (payload.status === "completed") {
    await upsertStubAnalysisAndMarkItemReady(admin, {
      userId: payload.user_id,
      documentId: payload.document_id,
    });
  }

  if (payload.status === "failed") {
    await admin
      .from("knowledge_items")
      .update({
        status: "error",
        processing_step: null,
        extraction_status: "failed",
        error_details: {
          step: "document_extraction",
          error: (payload.error_message ?? "Extraction failed").slice(0, 500),
        },
        date_modified: now,
      })
      .eq("id", payload.document_id)
      .eq("user_id", payload.user_id);
  }

  return { ok: true };
}

async function upsertStubAnalysisAndMarkItemReady(
  admin: ReturnType<typeof createServiceRoleSupabaseClient>,
  input: { userId: string; documentId: string },
): Promise<void> {
  const now = new Date().toISOString();
  const { data: ki } = await admin
    .from("knowledge_items")
    .select("title,file_path")
    .eq("id", input.documentId)
    .eq("user_id", input.userId)
    .maybeSingle();

  const title =
    ki && typeof ki === "object" && "title" in ki && typeof (ki as { title?: unknown }).title === "string"
      ? (ki as { title: string }).title
      : "Document";

  const { data: existingAnalysis } = await admin
    .from("document_analyses")
    .select("id")
    .eq("document_id", input.documentId)
    .maybeSingle();

  const analysisPayload = {
    user_id: input.userId,
    document_id: input.documentId,
    parser: "mineru",
    parser_version: "stub-worker",
    document_title: title,
    document_type: "pdf",
    total_pages: 0,
    summary:
      "Doc Oracle analysis shell is ready. Full MinerU normalization and enrichment will populate pages, sections, and glossary once the worker pipeline is configured.",
    status: "completed" as const,
    updated_at: now,
  };

  if (existingAnalysis?.id) {
    await admin
      .from("document_analyses")
      .update(analysisPayload)
      .eq("id", existingAnalysis.id as string);
  } else {
    await admin.from("document_analyses").insert({
      ...analysisPayload,
      created_at: now,
    });
  }

  await admin
    .from("knowledge_items")
    .update({
      status: "ready",
      processing_step: null,
      extraction_status: "success",
      ask_enabled: true,
      date_modified: now,
    })
    .eq("id", input.documentId)
    .eq("user_id", input.userId);
}

export async function retryExtractionJobForUser(jobId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: job, error } = await supabase
    .from("document_extraction_jobs")
    .select("id,retry_count,max_retries,document_id,user_id,input_file_path,parser_mode,output_base_path")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error || !job) throw new Error("JOB_NOT_FOUND");

  const j = job as {
    retry_count: number;
    max_retries: number;
    document_id: string;
    input_file_path: string;
    parser_mode: string | null;
    output_base_path: string | null;
  };

  if (j.retry_count >= j.max_retries) {
    throw new Error("MAX_RETRIES");
  }

  const now = new Date().toISOString();
  await supabase
    .from("document_extraction_jobs")
    .update({
      status: "queued",
      progress: 0,
      current_stage: "Queued for retry",
      error_code: null,
      error_message: null,
      completed_at: null,
      cancelled_at: null,
      started_at: null,
      retry_count: j.retry_count + 1,
    })
    .eq("id", jobId)
    .eq("user_id", userId);

  await supabase
    .from("knowledge_items")
    .update({
      status: "processing",
      processing_step: "Re-queued for extraction…",
      extraction_status: "partial",
      error_details: null,
      date_modified: now,
    })
    .eq("id", j.document_id)
    .eq("user_id", userId);

  const { createSignedUrlForKnowledgePath } = await import(
    "@/lib/document-brain/storage/signedUrlService"
  );
  const signed = await createSignedUrlForKnowledgePath(j.input_file_path, 3600);
  const { dispatchMinerUExtractionHttp } = await import("@/lib/document-brain/parser/mineruClient");
  const out = j.output_base_path ?? docBrainRootPrefix(userId, j.document_id);
  const dispatch = await dispatchMinerUExtractionHttp({
    jobId,
    userId,
    documentId: j.document_id,
    signedInputUrl: signed,
    inputStoragePath: j.input_file_path,
    outputBasePath: out,
    parserMode: j.parser_mode,
  });
  if (!dispatch.ok) {
    await markJobFailedByIdForUser(jobId, userId, dispatch.error ?? "dispatch_failed");
    throw new Error(dispatch.error ?? "DISPATCH_FAILED");
  }
}
