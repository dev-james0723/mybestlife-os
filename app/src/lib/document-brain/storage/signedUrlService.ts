import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createSignedUrlForKnowledgePath(
  storagePath: string,
  expiresInSeconds: number,
): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from("knowledge-files")
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "signed_url_failed");
  }
  return data.signedUrl;
}
