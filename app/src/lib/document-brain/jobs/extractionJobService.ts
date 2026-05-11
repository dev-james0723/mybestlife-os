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
  /** MinerU markdown excerpt or full text for Doc Oracle summary (optional). */
  document_summary?: string | null;
  total_pages?: number | null;
  parser_version?: string | null;
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

/**
 * Mark job + knowledge item failed when MinerU dispatch/fallback runs in deferred work (`after()`):
 * the request cookie session may be gone on serverless, so user-scoped Supabase updates can silently fail.
 */
export async function markMinerUDispatchFailureAdmin(args: {
  jobId: string;
  userId: string;
  documentId: string;
  jobErrorMessage: string;
  itemErrorMessage: string;
  jobErrorCode?: string;
}): Promise<void> {
  const admin = createServiceRoleSupabaseClient();
  const now = new Date().toISOString();
  await admin
    .from("document_extraction_jobs")
    .update({
      status: "failed",
      error_code: args.jobErrorCode ?? "dispatch_failed",
      error_message: args.jobErrorMessage.slice(0, 2000),
      completed_at: now,
      current_stage: null,
    })
    .eq("id", args.jobId)
    .eq("user_id", args.userId);

  await admin
    .from("knowledge_items")
    .update({
      status: "error",
      processing_step: null,
      extraction_status: "failed",
      error_details: { step: "mineru_dispatch", error: args.itemErrorMessage.slice(0, 500) },
      date_modified: now,
    })
    .eq("id", args.documentId)
    .eq("user_id", args.userId);
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
    await upsertAnalysisAndMarkItemReady(admin, {
      userId: payload.user_id,
      documentId: payload.document_id,
      documentSummary: payload.document_summary ?? null,
      totalPages: payload.total_pages ?? null,
      parserVersion: payload.parser_version ?? null,
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

/**
 * Used when MinerU HTTP dispatch fails: finish the job using text extracted in the Next.js runtime.
 * Doc Oracle reads `document_analyses`; this keeps the workspace usable without the worker.
 */
export async function completeExtractionJobWithLocalPdfFallback(input: {
  jobId: string;
  userId: string;
  documentId: string;
  rawText: string;
  documentTitle: string;
  mineruErrorSummary: string;
}): Promise<void> {
  const admin = createServiceRoleSupabaseClient();
  const now = new Date().toISOString();
  const trimmed = input.rawText.trim();
  const excerpt = trimmed.slice(0, 1800);
  const reason = input.mineruErrorSummary.trim().slice(0, 240);
  const summary =
    excerpt.length > 0
      ? `MinerU worker was unreachable (${reason || "dispatch failed"}). Local PDF text extraction instead.\n\n${excerpt}${trimmed.length > excerpt.length ? "…" : ""}`
      : `MinerU worker was unreachable (${reason || "dispatch failed"}). No readable text was extracted locally — this may be a scanned PDF.`;

  const { data: existingAnalysis } = await admin
    .from("document_analyses")
    .select("id")
    .eq("document_id", input.documentId)
    .maybeSingle();

  const analysisPayload = {
    user_id: input.userId,
    document_id: input.documentId,
    parser: "local-pdf-fallback",
    parser_version: reason.slice(0, 120) || "mineru-dispatch-failed",
    document_title: input.documentTitle,
    document_type: "pdf",
    total_pages: 0,
    summary,
    status: "completed" as const,
    updated_at: now,
  };

  if (existingAnalysis?.id) {
    await admin.from("document_analyses").update(analysisPayload).eq("id", existingAnalysis.id as string);
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
      error_details: null,
      raw_content: trimmed.slice(0, 100000) || null,
      date_modified: now,
    })
    .eq("id", input.documentId)
    .eq("user_id", input.userId);

  await admin
    .from("document_extraction_jobs")
    .update({
      status: "completed",
      progress: 100,
      current_stage: "Local PDF extraction (MinerU unavailable)",
      error_code: null,
      error_message: null,
      completed_at: now,
    })
    .eq("id", input.jobId)
    .eq("user_id", input.userId);
}

async function upsertAnalysisAndMarkItemReady(
  admin: ReturnType<typeof createServiceRoleSupabaseClient>,
  input: {
    userId: string;
    documentId: string;
    documentSummary?: string | null;
    totalPages?: number | null;
    parserVersion?: string | null;
  },
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

  const trimmedSummary = input.documentSummary?.trim() ?? "";
  const hasMineruBody = trimmedSummary.length > 0;
  const summary = hasMineruBody
    ? trimmedSummary.slice(0, 50000)
    : "Doc Oracle analysis shell is ready. Full MinerU normalization and enrichment will populate pages, sections, and glossary once the worker pipeline is configured.";
  const parserVersion =
    input.parserVersion?.trim() || (hasMineruBody ? "mineru-pipeline" : "stub-worker");
  const totalPages =
    typeof input.totalPages === "number" && Number.isFinite(input.totalPages) && input.totalPages > 0
      ? input.totalPages
      : 0;

  const analysisPayload = {
    user_id: input.userId,
    document_id: input.documentId,
    parser: "mineru",
    parser_version: parserVersion,
    document_title: title,
    document_type: "pdf",
    total_pages: totalPages,
    summary,
    status: "completed" as const,
    updated_at: now,
  };

  if (existingAnalysis?.id) {
    await admin.from("document_analyses").update(analysisPayload).eq("id", existingAnalysis.id as string);
  } else {
    await admin.from("document_analyses").insert({
      ...analysisPayload,
      created_at: now,
    });
  }

  const itemUpdate: Record<string, unknown> = {
    status: "ready",
    processing_step: null,
    extraction_status: "success",
    ask_enabled: true,
    date_modified: now,
  };
  if (hasMineruBody) {
    itemUpdate.raw_content = trimmedSummary.slice(0, 100000);
  }

  await admin.from("knowledge_items").update(itemUpdate).eq("id", input.documentId).eq("user_id", input.userId);
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
    const dispatchErr = [dispatch.status != null ? `HTTP ${dispatch.status}` : "", dispatch.error ?? ""]
      .filter((s) => String(s).trim())
      .join(": ")
      .trim();
    try {
      const { extractKnowledgeFileWithServiceRole } = await import("@/lib/knowledge/ai/extractContent");
      const originalName = j.input_file_path.split("/").pop() ?? "document.pdf";
      const rawText = await extractKnowledgeFileWithServiceRole(j.input_file_path, originalName, undefined);
      const { data: ki } = await supabase
        .from("knowledge_items")
        .select("title")
        .eq("id", j.document_id)
        .maybeSingle();
      const title =
        ki && typeof ki === "object" && "title" in ki && typeof (ki as { title?: unknown }).title === "string"
          ? (ki as { title: string }).title
          : "Document";
      await completeExtractionJobWithLocalPdfFallback({
        jobId,
        userId,
        documentId: j.document_id,
        rawText,
        documentTitle: title,
        mineruErrorSummary: dispatchErr || "MinerU dispatch failed",
      });
      return;
    } catch (fallbackErr) {
      console.error("[document-brain] retry MinerU dispatch failed; local fallback failed", fallbackErr);
      await markJobFailedByIdForUser(jobId, userId, dispatch.error ?? "dispatch_failed");
      throw new Error(dispatch.error ?? "DISPATCH_FAILED");
    }
  }
}
