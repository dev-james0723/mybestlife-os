import { NextResponse, after } from "next/server";
import { applyWorkerJobStatus, type WorkerJobStatusPayload } from "@/lib/document-brain/jobs/extractionJobService";
import { autoGenerateMindMapForDocument } from "@/lib/document-brain/mind-map/autoGenerateMindMap";
import { indexDocOracleRetrievalForDocument } from "@/lib/retrieval/doc-oracle-indexer";
import type { ExtractionJobStatus } from "@/lib/document-brain/jobs/extractionJobStatus";
import { EXTRACTION_JOB_STATUSES } from "@/lib/document-brain/jobs/extractionJobStatus";

export const runtime = "nodejs";

const TAG = "[doc-oracle/worker-callback]";

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

  if (!workerSecretValid) {
    const hasAuth = Boolean(auth.trim());
    const bearerScheme = auth.toLowerCase().startsWith("bearer ");
    console.warn(
      `${TAG} unauthorized attempt job_id=${job_id || "[missing]"} document_id=${document_id || "[missing]"} has_authorization_header=${hasAuth} bearer_scheme=${bearerScheme}`,
    );
  } else {
    console.info(
      `${TAG} POST job_id=${job_id} document_id=${document_id} status=${typeof status === "string" ? status : "[invalid]"}`,
    );
  }

  if (!job_id || !user_id || !document_id || !parseStatus(status)) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }

  const document_summary = typeof o.document_summary === "string" ? o.document_summary : null;
  const kb_raw_content = typeof o.kb_raw_content === "string" ? o.kb_raw_content : null;
  const total_pages =
    typeof o.total_pages === "number" && Number.isFinite(o.total_pages) ? Math.trunc(o.total_pages) : null;
  const parser_version = typeof o.parser_version === "string" ? o.parser_version.trim() : null;
  const document_type = typeof o.document_type === "string" ? o.document_type.trim() : null;
  const language = typeof o.language === "string" ? o.language.trim() : null;
  const manifest_storage_path =
    typeof o.manifest_storage_path === "string" ? o.manifest_storage_path.trim() : null;

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
    document_summary,
    kb_raw_content,
    total_pages,
    parser_version,
    document_type,
    language,
    manifest_storage_path,
  };

  const result = await applyWorkerJobStatus(payload, { workerSecretValid });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "unauthorized" ? 401 : 400 });
  }

  if (workerSecretValid && payload.status === "completed") {
    after(async () => {
      try {
        const mm = await autoGenerateMindMapForDocument({
          userId: payload.user_id,
          documentId: payload.document_id,
          reason: "extraction_completed",
        });
        if (!mm.ok) {
          console.error(
            `${TAG} mind_map_auto_generation_failed document_id=${payload.document_id} error=${mm.error ?? "unknown"}`,
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(
          `${TAG} mind_map_auto_generation_exception document_id=${payload.document_id} error=${msg.slice(0, 400)}`,
        );
      }

      try {
        const indexed = await indexDocOracleRetrievalForDocument({
          userId: payload.user_id,
          documentId: payload.document_id,
        });
        if (!indexed.ok) {
          console.error(
            `${TAG} retrieval_index_failed document_id=${payload.document_id} indexed=${indexed.indexed} failed=${indexed.failed} error=${indexed.error ?? indexed.warnings[0] ?? "unknown"}`,
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(
          `${TAG} retrieval_index_exception document_id=${payload.document_id} error=${msg.slice(0, 400)}`,
        );
      }
    });
  }

  return NextResponse.json({ ok: true });
}
