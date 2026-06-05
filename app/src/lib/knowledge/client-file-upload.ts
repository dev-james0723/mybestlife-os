"use client";

import { createClient } from "@/lib/supabase/client";
import { compressImageForKnowledgeThumbnail } from "@/lib/knowledge/compress-knowledge-photo";
import {
  clientValidateKnowledgeFileBeforeUpload,
  guessMimeFromExtension,
  isKnowledgePhotoFile,
} from "@/lib/knowledge/knowledge-file-upload";
import { finalizeKnowledgeFileUpload } from "@/lib/knowledge/mutations";
import type { KnowledgeItem, ThumbnailStyle } from "@/types/knowledge";

export type UploadedKnowledgeFileObject = {
  storagePath: string;
  contentType: string;
  thumbnailStoragePath: string | null;
};

export type KnowledgeClientFileUploadOptions = {
  createPhotoThumbnail?: boolean;
};

export type FinalizeKnowledgeClientFileOptions = {
  thumbnailStyle?: ThumbnailStyle | string | null;
  language?: string | null;
};

function extensionFromFileName(name: string): string {
  const ext = name.split(".").pop()?.trim().toLowerCase() ?? "";
  return /^[a-z0-9]{1,12}$/.test(ext) ? ext : "bin";
}

function contentTypeForKnowledgeFile(file: File, ext: string): string {
  return file.type?.trim() || guessMimeFromExtension(ext) || "application/octet-stream";
}

export function assertClientKnowledgeFileAccepted(file: File): void {
  const preflight = clientValidateKnowledgeFileBeforeUpload(file);
  if (preflight) throw new Error(preflight);
}

export async function removeKnowledgeFileObjects(paths: Array<string | null | undefined>) {
  const removePaths = paths.filter((path): path is string => Boolean(path && path.trim()));
  if (removePaths.length === 0) return;
  const supabase = createClient();
  await supabase.storage.from("knowledge-files").remove(removePaths);
}

export async function uploadKnowledgeFileToStorage(
  file: File,
  options: KnowledgeClientFileUploadOptions = {},
): Promise<UploadedKnowledgeFileObject> {
  assertClientKnowledgeFileAccepted(file);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const ext = extensionFromFileName(file.name);
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const contentType = contentTypeForKnowledgeFile(file, ext);
  const createPhotoThumbnail = options.createPhotoThumbnail ?? true;
  let thumbnailStoragePath: string | null = null;

  try {
    if (createPhotoThumbnail && isKnowledgePhotoFile(file)) {
      try {
        const thumbBlob = await compressImageForKnowledgeThumbnail(file);
        thumbnailStoragePath = `${user.id}/${crypto.randomUUID()}_thumb.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from("knowledge-files")
          .upload(thumbnailStoragePath, thumbBlob, {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (thumbErr) {
          console.warn("[knowledge-upload] thumbnail upload failed, falling back to original:", thumbErr);
          thumbnailStoragePath = null;
        }
      } catch (e) {
        console.warn("[knowledge-upload] thumbnail compression skipped:", e);
        thumbnailStoragePath = null;
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("knowledge-files")
      .upload(storagePath, file, { contentType, upsert: false });

    if (uploadError) {
      await removeKnowledgeFileObjects([thumbnailStoragePath]);
      throw uploadError;
    }

    return { storagePath, contentType, thumbnailStoragePath };
  } catch (error) {
    await removeKnowledgeFileObjects([storagePath, thumbnailStoragePath]);
    throw error;
  }
}

export async function finalizeUploadedKnowledgeFile(
  file: File,
  uploaded: UploadedKnowledgeFileObject,
  options: FinalizeKnowledgeClientFileOptions = {},
): Promise<KnowledgeItem> {
  return finalizeKnowledgeFileUpload({
    storagePath: uploaded.storagePath,
    originalFileName: file.name,
    mimeType: uploaded.contentType,
    thumbnailStyle: options.thumbnailStyle ?? "na",
    language: options.language ?? null,
    byteSizeHint: file.size,
    thumbnailStoragePath: uploaded.thumbnailStoragePath,
  });
}

export async function uploadKnowledgeFileFromClient(
  file: File,
  options: FinalizeKnowledgeClientFileOptions & KnowledgeClientFileUploadOptions = {},
): Promise<KnowledgeItem> {
  const uploaded = await uploadKnowledgeFileToStorage(file, options);
  return finalizeUploadedKnowledgeFile(file, uploaded, options);
}
