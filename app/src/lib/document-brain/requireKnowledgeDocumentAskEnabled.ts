import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireKnowledgeDocumentAskEnabled(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: 404 | 403; error: string }> {
  const { data: item, error } = await supabase
    .from("knowledge_items")
    .select("id, ask_enabled")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !item) return { ok: false, status: 404, error: "not_found" };
  if (item.ask_enabled === false) return { ok: false, status: 403, error: "ask_disabled" };
  return { ok: true };
}
