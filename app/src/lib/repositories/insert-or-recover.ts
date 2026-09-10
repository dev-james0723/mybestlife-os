import type { createServerSupabaseClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Recover an acknowledged primary-key collision without overwriting saved edits. */
export async function insertOrRecoverOwned(
  supabase: Client,
  table: "knowledge_items" | "ideas",
  payload: Record<string, unknown>,
  userId: string,
  operationId?: string,
): Promise<{ data: Record<string, unknown>; recovered: boolean }> {
  if (operationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
    throw new Error("INVALID_SAVE_OPERATION_ID");
  }
  const { data, error } = await supabase.from(table)
    .insert({ ...payload, ...(operationId ? { id: operationId } : {}), user_id: userId })
    .select().single();
  if (!error && data) return { data, recovered: false };
  if (operationId && error?.code === "23505") {
    const existing = await supabase.from(table).select("*")
      .eq("id", operationId).eq("user_id", userId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return { data: existing.data, recovered: true };
  }
  throw error ?? new Error("SAVE_RETURNED_NO_RECORD");
}
