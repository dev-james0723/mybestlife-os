import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildDocumentStoragePath,
  DOCUMENT_FILES_BUCKET,
} from "@/lib/documents/document-intake";
import { deleteDocumentFileServer } from "@/lib/documents/document-storage";

export type DocumentUploadReservationStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "cancelled";

export type DocumentUploadReservation = {
  id: string;
  user_id: string;
  storage_path: string;
  status: DocumentUploadReservationStatus;
  created_at: string;
  updated_at: string;
};

type ReservationResult = {
  reservation?: DocumentUploadReservation;
  error?: string;
};

const RESERVATION_COLUMNS =
  "id,user_id,storage_path,status,created_at,updated_at" as const;

export async function reserveDocumentUpload(input: {
  supabase: SupabaseClient;
  userId: string;
  uploadId: string;
  fileName: string;
}): Promise<ReservationResult> {
  const storagePath = buildDocumentStoragePath(
    input.userId,
    input.uploadId,
    input.fileName,
  );
  const { data, error } = await input.supabase
    .from("document_intake_uploads")
    .insert({
      id: input.uploadId,
      user_id: input.userId,
      storage_bucket: DOCUMENT_FILES_BUCKET,
      storage_path: storagePath,
      status: "pending",
    })
    .select(RESERVATION_COLUMNS)
    .single();

  return error
    ? { error: error.message }
    : { reservation: data as DocumentUploadReservation };
}

export async function claimDocumentUploadReservation(input: {
  supabase: SupabaseClient;
  userId: string;
  uploadId: string;
}): Promise<ReservationResult> {
  const { data, error } = await input.supabase
    .from("document_intake_uploads")
    .update({ status: "uploading", updated_at: new Date().toISOString() })
    .eq("id", input.uploadId)
    .eq("user_id", input.userId)
    .eq("status", "pending")
    .select(RESERVATION_COLUMNS)
    .maybeSingle();

  if (error) return { error: error.message };
  return data
    ? { reservation: data as DocumentUploadReservation }
    : {};
}

export async function markDocumentUploadReady(input: {
  supabase: SupabaseClient;
  userId: string;
  uploadId: string;
}): Promise<ReservationResult> {
  const { data, error } = await input.supabase
    .from("document_intake_uploads")
    .update({ status: "uploaded", updated_at: new Date().toISOString() })
    .eq("id", input.uploadId)
    .eq("user_id", input.userId)
    .eq("status", "uploading")
    .select(RESERVATION_COLUMNS)
    .maybeSingle();

  if (error) return { error: error.message };
  return data
    ? { reservation: data as DocumentUploadReservation }
    : {};
}

export async function cancelDocumentUploadReservation(input: {
  supabase: SupabaseClient;
  userId: string;
  uploadId: string;
}): Promise<ReservationResult> {
  const { data, error } = await input.supabase
    .from("document_intake_uploads")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .eq("id", input.uploadId)
    .neq("status", "cancelled")
    .select(RESERVATION_COLUMNS)
    .maybeSingle();
  if (error) return { error: error.message };
  return data
    ? { reservation: data as DocumentUploadReservation }
    : {};
}

async function cancelStaleDocumentUploadReservation(input: {
  supabase: SupabaseClient;
  userId: string;
  uploadId: string;
  olderThanIso: string;
}): Promise<ReservationResult> {
  const { data, error } = await input.supabase
    .from("document_intake_uploads")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .eq("id", input.uploadId)
    .lt("updated_at", input.olderThanIso)
    .select(RESERVATION_COLUMNS)
    .maybeSingle();

  if (error) return { error: error.message };
  return data
    ? { reservation: data as DocumentUploadReservation }
    : {};
}

export async function removeDocumentUploadReservation(input: {
  supabase: SupabaseClient;
  userId: string;
  uploadId: string;
}): Promise<{ error?: string }> {
  const { error } = await input.supabase
    .from("document_intake_uploads")
    .delete()
    .eq("id", input.uploadId)
    .eq("user_id", input.userId);
  return error ? { error: error.message } : {};
}

/**
 * Opportunistic safety net for abandoned uploads. A committed Document removes
 * its reservation through a database trigger, so only unclaimed temporary
 * objects can reach this sweep.
 */
export async function cleanupStaleDocumentUploads(input: {
  supabase: SupabaseClient;
  userId: string;
  olderThanIso: string;
}): Promise<DocumentUploadCleanupResult> {
  const { data, error } = await input.supabase
    .from("document_intake_uploads")
    .select(RESERVATION_COLUMNS)
    .eq("user_id", input.userId)
    .lt("updated_at", input.olderThanIso)
    .limit(20);

  if (error) {
    return { scanned: 0, deleted: 0, skipped: 0, failed: 1, error: error.message };
  }

  return cleanupReservationRows(input.supabase, data ?? [], input.olderThanIso);
}

export type DocumentUploadCleanupResult = {
  scanned: number;
  deleted: number;
  skipped: number;
  failed: number;
  error?: string;
};

async function cleanupReservationRows(
  supabase: SupabaseClient,
  rows: DocumentUploadReservation[],
  olderThanIso: string,
): Promise<DocumentUploadCleanupResult> {
  const result: DocumentUploadCleanupResult = {
    scanned: rows.length,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };

  for (const row of rows) {
    // Re-check staleness in the UPDATE itself. A claim, commit, cancellation,
    // or another sweeper can refresh/remove the row after the initial SELECT;
    // only the worker whose compare-and-set still matches may delete the file.
    const cancellation = await cancelStaleDocumentUploadReservation({
      supabase,
      userId: row.user_id,
      uploadId: row.id,
      olderThanIso,
    });
    if (cancellation.error) {
      result.failed += 1;
      continue;
    }
    if (!cancellation.reservation) {
      result.skipped += 1;
      continue;
    }

    const removal = await deleteDocumentFileServer({
      supabase,
      storagePath: cancellation.reservation.storage_path,
    });
    if (removal.error) {
      result.failed += 1;
      continue;
    }

    const reservationRemoval = await removeDocumentUploadReservation({
      supabase,
      userId: row.user_id,
      uploadId: row.id,
    });
    if (reservationRemoval.error) {
      result.failed += 1;
      continue;
    }
    result.deleted += 1;
  }

  return result;
}

export async function cleanupStaleDocumentUploadsGlobally(input: {
  supabase: SupabaseClient;
  olderThanIso: string;
}): Promise<DocumentUploadCleanupResult> {
  const { data, error } = await input.supabase
    .from("document_intake_uploads")
    .select(RESERVATION_COLUMNS)
    .lt("updated_at", input.olderThanIso)
    .order("updated_at", { ascending: true })
    .limit(100);

  if (error) {
    return { scanned: 0, deleted: 0, skipped: 0, failed: 1, error: error.message };
  }

  return cleanupReservationRows(
    input.supabase,
    (data ?? []) as DocumentUploadReservation[],
    input.olderThanIso,
  );
}
