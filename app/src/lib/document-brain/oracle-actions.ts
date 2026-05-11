"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { retryExtractionJobForUser } from "@/lib/document-brain/jobs/extractionJobService";

export async function retryDocumentExtractionJobAction(jobId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await retryExtractionJobForUser(jobId, user.id);
}
