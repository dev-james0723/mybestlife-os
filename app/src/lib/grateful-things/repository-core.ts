import type { SupabaseClient } from "@supabase/supabase-js";
import type { GratefulThing } from "@/types/database";
import { isMissingColumnError } from "@/lib/grateful-things/db-errors";

export type GratefulThingWriteInput = {
  content: string;
  entry_date?: string;
  category?: string | null;
  photo_url?: string | null;
  thumbnail_url?: string | null;
  is_favorite?: boolean;
};

function buildInsertPayload(userId: string, input: GratefulThingWriteInput) {
  return {
    user_id: userId,
    content: input.content,
    entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
    category: input.category?.trim() || null,
    photo_url: input.photo_url ?? null,
    is_favorite: input.is_favorite ?? false,
  };
}

export async function insertGratefulThing(
  supabase: SupabaseClient,
  userId: string,
  input: GratefulThingWriteInput,
): Promise<GratefulThing> {
  const base = buildInsertPayload(userId, input);
  const withThumb = {
    ...base,
    thumbnail_url: input.thumbnail_url ?? null,
  };

  let result = await supabase.from("grateful_things").insert(withThumb).select().single();
  if (isMissingColumnError(result.error, "thumbnail_url")) {
    result = await supabase.from("grateful_things").insert(base).select().single();
  }
  if (result.error) throw result.error;
  return result.data as GratefulThing;
}

export async function updateGratefulThingRow(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<GratefulThing> {
  const withThumb = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from("grateful_things")
    .update(withThumb)
    .eq("id", id)
    .select()
    .single();

  if (isMissingColumnError(result.error, "thumbnail_url") && "thumbnail_url" in withThumb) {
    const { thumbnail_url: _thumb, ...withoutThumb } = withThumb;
    void _thumb;
    result = await supabase
      .from("grateful_things")
      .update(withoutThumb)
      .eq("id", id)
      .select()
      .single();
  }

  if (result.error) throw result.error;
  return result.data as GratefulThing;
}

export async function requireAuthenticatedUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}
