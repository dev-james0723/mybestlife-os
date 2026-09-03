import { NextResponse } from "next/server";
import {
  DOCUMENT_FILES_BUCKET,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_UPLOAD_MIME_TYPES,
  isOwnedDocumentStoragePath,
  normalizeDocumentId,
  normalizeDocumentLocale,
  normalizeDocumentUploadId,
  type DocumentIntakeAnalyzeResponse,
  type DocumentIntakeReservationResponse,
  sanitizeDocumentFileName,
  type DocumentIntakeDeleteResponse,
  type DocumentIntakeResponse,
  type DocumentIntakeSignedUrlResponse,
} from "@/lib/documents/document-intake";
import { validateDocumentFile } from "@/lib/documents/document-file-validation";
import {
  createDocumentSignedUploadUrl,
  createDocumentSignedUrl,
  deleteDocumentFileServer,
  downloadDocumentFileServer,
} from "@/lib/documents/document-storage";
import {
  cancelDocumentUploadReservation,
  claimDocumentUploadReservation,
  cleanupStaleDocumentUploads,
  markDocumentUploadReady,
  removeDocumentUploadReservation,
  reserveDocumentUpload,
} from "@/lib/documents/document-upload-reservations";
import { GEMINI_INLINE_FILE_MAX_BYTES } from "@/lib/knowledge/ai/geminiExtractFileText";
import { requireLifeAgentUser } from "@/lib/life-agent/actions-api-shared";
import { analyzeLifeAgentUpload } from "@/lib/life-agent/upload-analyzer";

export const runtime = "nodejs";
export const maxDuration = 120;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
const STALE_UPLOAD_AGE_MS = 24 * 60 * 60 * 1_000;

function json<T>(body: T, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function validationStatus(code: string): number {
  if (code === "file_too_large") return 413;
  if (
    code === "unsupported_extension" ||
    code === "mime_type_mismatch" ||
    code === "file_signature_mismatch"
  ) {
    return 415;
  }
  return 400;
}

async function discardReservedUpload(input: {
  supabase: Parameters<typeof deleteDocumentFileServer>[0]["supabase"];
  userId: string;
  uploadId: string;
  storagePath: string;
}) {
  const cancellation = await cancelDocumentUploadReservation({
    supabase: input.supabase,
    userId: input.userId,
    uploadId: input.uploadId,
  });
  if (!cancellation.reservation) return;
  await deleteDocumentFileServer({
    supabase: input.supabase,
    storagePath: cancellation.reservation.storage_path,
  });
}

export async function PUT(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const uploadId = normalizeDocumentUploadId(record?.uploadId);
  const fileName = typeof record?.fileName === "string"
    ? sanitizeDocumentFileName(record.fileName)
    : "";
  const fileSize = typeof record?.fileSize === "number" ? record.fileSize : 0;
  if (!uploadId || !fileName || !Number.isInteger(fileSize)) {
    return json({ error: "invalid_upload_reservation" }, 400);
  }
  if (fileSize <= 0) return json({ error: "file_empty" }, 400);
  if (fileSize > DOCUMENT_MAX_BYTES) return json({ error: "file_too_large" }, 413);

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!DOCUMENT_UPLOAD_MIME_TYPES[extension]) {
    return json({ error: "unsupported_extension" }, 415);
  }

  await cleanupStaleDocumentUploads({
    supabase: auth.supabase,
    userId: auth.userId,
    olderThanIso: new Date(Date.now() - STALE_UPLOAD_AGE_MS).toISOString(),
  });

  const reservation = await reserveDocumentUpload({
    supabase: auth.supabase,
    userId: auth.userId,
    uploadId,
    fileName,
  });
  if (!reservation.reservation) {
    return json(
      { error: "upload_reservation_failed", detail: reservation.error },
      reservation.error ? 500 : 409,
    );
  }

  const signedUpload = await createDocumentSignedUploadUrl({
    supabase: auth.supabase,
    storagePath: reservation.reservation.storage_path,
  });
  if (!signedUpload.url) {
    await removeDocumentUploadReservation({
      supabase: auth.supabase,
      userId: auth.userId,
      uploadId,
    });
    return json(
      { error: "signed_upload_url_failed", detail: signedUpload.error },
      500,
    );
  }

  const response: DocumentIntakeReservationResponse = {
    uploadId,
    storagePath: reservation.reservation.storage_path,
    uploadUrl: signedUpload.url,
  };
  return json(response);
}

export async function POST(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const uploadId = normalizeDocumentUploadId(record?.uploadId);
  if (!uploadId) {
    return json({ error: "upload_reservation_required" }, 409);
  }
  const reservation = await claimDocumentUploadReservation({
    supabase: auth.supabase,
    userId: auth.userId,
    uploadId,
  });
  if (!reservation.reservation) {
    return json(
      { error: "upload_reservation_unavailable", detail: reservation.error },
      reservation.error ? 500 : 409,
    );
  }

  const storagePath = reservation.reservation.storage_path;
  const download = await downloadDocumentFileServer({
    supabase: auth.supabase,
    storagePath,
  });
  if (!download.bytes) {
    await discardReservedUpload({
      supabase: auth.supabase,
      userId: auth.userId,
      uploadId,
      storagePath,
    });
    return json({ error: "uploaded_file_unavailable", detail: download.error }, 409);
  }

  const fileName = storagePath.split("/").pop() ?? "document";
  const validation = await validateDocumentFile({
    fileName,
    declaredMimeType: download.mimeType,
    bytes: download.bytes,
  });
  if (!validation.ok) {
    await discardReservedUpload({
      supabase: auth.supabase,
      userId: auth.userId,
      uploadId,
      storagePath,
    });
    return json(
      { error: validation.code, detail: validation.message },
      validationStatus(validation.code),
    );
  }

  if (request.signal.aborted) {
    await discardReservedUpload({
      supabase: auth.supabase,
      userId: auth.userId,
      uploadId,
      storagePath,
    });
    return json({ error: "request_aborted" }, 499);
  }

  const readyReservation = await markDocumentUploadReady({
    supabase: auth.supabase,
    userId: auth.userId,
    uploadId,
  });
  if (!readyReservation.reservation) {
    await discardReservedUpload({
      supabase: auth.supabase,
      userId: auth.userId,
      uploadId,
      storagePath,
    });
    return json({ error: "upload_cancelled" }, 409);
  }

  const warnings = [...validation.warnings];
  const signedUrl = await createDocumentSignedUrl({
    supabase: auth.supabase,
    storagePath,
  });
  if (signedUrl.error) warnings.push("preview_url_unavailable");

  if (request.signal.aborted) {
    await discardReservedUpload({
      supabase: auth.supabase,
      userId: auth.userId,
      uploadId,
      storagePath,
    });
    return json({ error: "request_aborted" }, 499);
  }

  const responseBody: DocumentIntakeResponse = {
    uploadId,
    storageBucket: DOCUMENT_FILES_BUCKET,
    storagePath,
    fileName,
    mimeType: validation.mimeType,
    fileSize: download.bytes.byteLength,
    previewUrl: signedUrl.url,
    aiStatus: "not_requested",
    warnings: [...new Set(warnings)],
  };

  return json(responseBody);
}

function isTextAnalysisMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/csv"
  );
}

function isExtractionFallback(
  analysis: Awaited<ReturnType<typeof analyzeLifeAgentUpload>>,
): boolean {
  return (
    analysis.detectedType === "unknown" &&
    analysis.confidence <= 0.2 &&
    analysis.suggestedActions.length === 0 &&
    analysis.warnings.length > 0 &&
    analysis.summary.startsWith("Could not read this file automatically")
  );
}

export async function PATCH(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const storagePath = typeof record?.storagePath === "string"
    ? record.storagePath.trim()
    : "";
  if (!isOwnedDocumentStoragePath(storagePath, auth.userId)) {
    return json({ error: "invalid_storage_path" }, 403);
  }

  const download = await downloadDocumentFileServer({
    supabase: auth.supabase,
    storagePath,
  });
  if (!download.bytes) {
    return json({ error: "download_failed", detail: download.error }, 404);
  }

  const fileName = storagePath.split("/").pop() ?? "document";
  const validation = await validateDocumentFile({
    fileName,
    declaredMimeType: download.mimeType,
    bytes: download.bytes,
  });
  if (!validation.ok) {
    return json(
      { error: validation.code, detail: validation.message },
      validationStatus(validation.code),
    );
  }

  const warnings = [...validation.warnings];
  if (!validation.aiReady) {
    const response: DocumentIntakeAnalyzeResponse = {
      aiStatus: "skipped",
      warnings: [...new Set([...warnings, "ai_analysis_not_supported_for_format"])],
    };
    return json(response);
  }

  if (
    !isTextAnalysisMimeType(validation.mimeType) &&
    download.bytes.byteLength > GEMINI_INLINE_FILE_MAX_BYTES
  ) {
    const response: DocumentIntakeAnalyzeResponse = {
      aiStatus: "skipped",
      warnings: [...new Set([...warnings, "ai_analysis_file_too_large"])],
    };
    return json(response);
  }

  try {
    const analysis = await analyzeLifeAgentUpload({
      bytes: download.bytes,
      mimeType: validation.mimeType,
      fileName,
      locale: normalizeDocumentLocale(
        typeof record?.locale === "string" ? record.locale : null,
      ),
    });
    if (isExtractionFallback(analysis)) {
      const response: DocumentIntakeAnalyzeResponse = {
        aiStatus: "failed",
        warnings: [...new Set([...warnings, "ai_analysis_failed_upload_preserved"])],
      };
      return json(response);
    }

    const response: DocumentIntakeAnalyzeResponse = {
      analysis,
      aiStatus: "complete",
      warnings: [...new Set([...warnings, ...analysis.warnings])],
    };
    return json(response);
  } catch {
    const response: DocumentIntakeAnalyzeResponse = {
      aiStatus: "failed",
      warnings: [...new Set([...warnings, "ai_analysis_failed_upload_preserved"])],
    };
    return json(response);
  }
}

export async function GET(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  const storagePath = new URL(request.url).searchParams.get("storagePath")?.trim() ?? "";
  if (!isOwnedDocumentStoragePath(storagePath, auth.userId)) {
    return json({ error: "invalid_storage_path" }, 403);
  }

  const signedUrl = await createDocumentSignedUrl({
    supabase: auth.supabase,
    storagePath,
  });
  if (!signedUrl.url) {
    return json({ error: "signed_url_failed", detail: signedUrl.error }, 404);
  }

  const body: DocumentIntakeSignedUrlResponse = { url: signedUrl.url };
  return json(body);
}

export async function DELETE(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const uploadId = normalizeDocumentUploadId(record?.uploadId);
  const documentId = normalizeDocumentId(record?.documentId);
  if ((!uploadId && !documentId) || (uploadId && documentId)) {
    return json({ error: "invalid_storage_target" }, 403);
  }

  if (uploadId) {
    const cancellation = await cancelDocumentUploadReservation({
      supabase: auth.supabase,
      userId: auth.userId,
      uploadId,
    });
    if (cancellation.error) {
      return json({ error: "delete_failed", detail: cancellation.error }, 500);
    }

    if (cancellation.reservation) {
      const removal = await deleteDocumentFileServer({
        supabase: auth.supabase,
        storagePath: cancellation.reservation.storage_path,
      });
      if (removal.error) {
        return json({ error: "delete_failed", detail: removal.error }, 500);
      }
    }

    const response: DocumentIntakeDeleteResponse = {
      deleted: true,
      uploadId,
    };
    return json(response);
  }

  const { data: document, error: documentError } = await auth.supabase
    .from("documents")
    .select("id,storage_path")
    .eq("id", documentId!)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (documentError) {
    return json({ error: "delete_failed", detail: documentError.message }, 500);
  }
  if (!document) {
    const response: DocumentIntakeDeleteResponse = {
      deleted: true,
      documentId: documentId!,
    };
    return json(response);
  }

  if (document.storage_path) {
    if (!isOwnedDocumentStoragePath(document.storage_path, auth.userId)) {
      return json({ error: "invalid_document_storage_path" }, 409);
    }
    const removal = await deleteDocumentFileServer({
      supabase: auth.supabase,
      storagePath: document.storage_path,
    });
    if (removal.error) {
      return json({ error: "delete_failed", detail: removal.error }, 500);
    }
  }

  const { error: recordDeleteError } = await auth.supabase
    .from("documents")
    .delete()
    .eq("id", documentId!)
    .eq("user_id", auth.userId);
  if (recordDeleteError) {
    return json(
      { error: "document_record_delete_failed", detail: recordDeleteError.message },
      500,
    );
  }

  const response: DocumentIntakeDeleteResponse = {
    deleted: true,
    documentId: documentId!,
  };
  return json(response);
}
