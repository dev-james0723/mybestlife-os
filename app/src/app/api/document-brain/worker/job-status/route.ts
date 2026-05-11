import { NextResponse } from "next/server";
import { applyWorkerJobStatus, type WorkerJobStatusPayload } from "@/lib/document-brain/jobs/extractionJobService";
import type { ExtractionJobStatus } from "@/lib/document-brain/jobs/extractionJobStatus";
import { EXTRACTION_JOB_STATUSES } from "@/lib/document-brain/jobs/extractionJobStatus";

export const runtime = "nodejs";

function parseStatus(v: unknown): v is ExtractionJobStatus {
  return typeof v === "string" && (EXTRACTION_JOB_STATUSES as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  const secret = process.env.MINERU_WORKER_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "worker_not_configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const workerSecretValid = token === secret;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const job_id = typeof o.job_id === "string" ? o.job_id.trim() : "";
  const user_id = typeof o.user_id === "string" ? o.user_id.trim() : "";
  const document_id = typeof o.document_id === "string" ? o.document_id.trim() : "";
  const status = o.status;

  if (!job_id || !user_id || !document_id || !parseStatus(status)) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }

  const payload: WorkerJobStatusPayload = {
    job_id,
    user_id,
    document_id,
    status,
    progress: typeof o.progress === "number" ? o.progress : undefined,
    current_stage: typeof o.current_stage === "string" ? o.current_stage : null,
    output_base_path: typeof o.output_base_path === "string" ? o.output_base_path : null,
    error_code: typeof o.error_code === "string" ? o.error_code : null,
    error_message: typeof o.error_message === "string" ? o.error_message : null,
  };

  const result = await applyWorkerJobStatus(payload, { workerSecretValid });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "unauthorized" ? 401 : 400 });
  }
  return NextResponse.json({ ok: true });
}
