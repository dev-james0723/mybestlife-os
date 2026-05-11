import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mimeToExt } from "@/lib/quote-library/thumbnail/image";

export const QUICK_TASK_ICON_BUCKET = "quick-task-icons";

export type UploadedQuickTaskIcon = {
  storagePath: string;
  publicUrl: string;
};

/** Safe filename segment — ASCII slug only. */
export function slugifyQuickTaskLabel(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "task";
}

export async function uploadQuickTaskIconToSupabase(params: {
  supabase: SupabaseClient;
  userId: string;
  slug: string;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<UploadedQuickTaskIcon> {
  const ext = mimeToExt(params.mimeType);
  const storagePath = `${params.userId}/${params.slug}-${randomUUID().slice(0, 8)}.${ext}`;

  const { error: uploadError } = await params.supabase.storage
    .from(QUICK_TASK_ICON_BUCKET)
    .upload(storagePath, params.bytes, {
      contentType: params.mimeType,
      upsert: true,
      cacheControl: "31536000, immutable",
    });
  if (uploadError) {
    throw new Error(`quick_task_icon_upload_failed: ${uploadError.message}`);
  }

  const { data: urlData } = params.supabase.storage.from(QUICK_TASK_ICON_BUCKET).getPublicUrl(storagePath);
  if (!urlData?.publicUrl) {
    throw new Error("quick_task_icon_public_url_missing");
  }

  return { storagePath, publicUrl: urlData.publicUrl };
}
