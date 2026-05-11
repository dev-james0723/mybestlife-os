"use client";

import { createClient } from "@/lib/supabase/client";
import type { ImageAttachment } from "@/types/idea";

const BUCKET = "idea-attachments";

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
  };
  return map[mime] ?? "bin";
}

export async function uploadIdeaAttachment(file: File): Promise<ImageAttachment> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const id = crypto.randomUUID();
  const ext = extFromMime(file.type);
  const path = `ideas/${user.id}/drafts/${id}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  return {
    id,
    storage_path: path,
    preview_url: URL.createObjectURL(file),
    mime_type: file.type,
    size: file.size,
    upload_state: "done",
  };
}

export async function removeIdeaAttachment(storagePath: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}
