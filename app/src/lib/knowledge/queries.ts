import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mapRowToItem,
  mapRowToCollection,
  mapRowToConnection,
  type KnowledgeItem,
  type SmartCollection,
  type KnowledgeConnection,
} from "@/types/knowledge";
import { mapRowToDocumentBrainJob } from "@/lib/document-brain/map-extraction-job-row";

async function fetchLatestExtractionJobsForDocuments(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  documentIds: string[],
): Promise<Map<string, ReturnType<typeof mapRowToDocumentBrainJob>>> {
  const map = new Map<string, ReturnType<typeof mapRowToDocumentBrainJob>>();
  if (documentIds.length === 0) return map;
  const chunkSize = 120;
  for (let i = 0; i < documentIds.length; i += chunkSize) {
    const chunk = documentIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("document_extraction_jobs")
      .select("*")
      .eq("user_id", userId)
      .in("document_id", chunk)
      .order("created_at", { ascending: false });
    if (error || !data) continue;
    for (const row of data) {
      const docId = row.document_id as string;
      if (!map.has(docId)) {
        map.set(docId, mapRowToDocumentBrainJob(row as Record<string, unknown>));
      }
    }
  }
  return map;
}

export async function getKnowledgeItems(userId: string): Promise<KnowledgeItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("user_id", userId)
    .order("date_added", { ascending: false });
  if (error) throw error;
  const items = (data ?? []).map((r) => mapRowToItem(r as Record<string, unknown>));
  const jobMap = await fetchLatestExtractionJobsForDocuments(
    supabase,
    userId,
    items.map((it) => it.id),
  );
  return items.map((it) => ({
    ...it,
    documentBrainJob: jobMap.get(it.id) ?? it.documentBrainJob,
  }));
}

export async function getSmartCollections(userId: string): Promise<SmartCollection[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_smart_collections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapRowToCollection(r as Record<string, unknown>));
}

export async function searchKnowledgeItems(
  userId: string,
  query: string,
): Promise<KnowledgeItem[]> {
  const supabase = await createServerSupabaseClient();
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");

  const { data, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("user_id", userId)
    .or(
      `title.ilike.%${query}%,ai_summary.ilike.%${query}%,raw_content.ilike.%${query}%`,
    )
    .order("date_added", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map((r) => mapRowToItem(r as Record<string, unknown>));
}

export async function getConnections(itemId: string): Promise<KnowledgeConnection[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_connections")
    .select("*")
    .or(`source_item_id.eq.${itemId},target_item_id.eq.${itemId}`);
  if (error) throw error;
  return (data ?? []).map((r) => mapRowToConnection(r as Record<string, unknown>));
}

/** All knowledge_connections rows touching any of the user's items (chunked `.in()` for large libraries). */
export async function getKnowledgeConnectionsForUser(userId: string): Promise<KnowledgeConnection[]> {
  const supabase = await createServerSupabaseClient();
  const { data: itemRows, error: itemErr } = await supabase
    .from("knowledge_items")
    .select("id")
    .eq("user_id", userId);
  if (itemErr) throw itemErr;
  const ids = (itemRows ?? []).map((r) => r.id as string);
  if (ids.length === 0) return [];

  const chunkSize = 120;
  const byId = new Map<string, KnowledgeConnection>();

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data: fromSource, error: e1 } = await supabase
      .from("knowledge_connections")
      .select("*")
      .in("source_item_id", chunk);
    if (e1) throw e1;
    const { data: fromTarget, error: e2 } = await supabase
      .from("knowledge_connections")
      .select("*")
      .in("target_item_id", chunk);
    if (e2) throw e2;
    for (const row of [...(fromSource ?? []), ...(fromTarget ?? [])]) {
      const c = mapRowToConnection(row as Record<string, unknown>);
      byId.set(c.id, c);
    }
  }

  return [...byId.values()];
}

export async function getKnowledgeItemById(id: string): Promise<KnowledgeItem | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return mapRowToItem(data as Record<string, unknown>);
}

/** RLS-safe explicit user scope for Doc Oracle and other sensitive reads. */
export async function getKnowledgeItemForUser(
  itemId: string,
  userId: string,
): Promise<KnowledgeItem | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRowToItem(data as Record<string, unknown>);
}
