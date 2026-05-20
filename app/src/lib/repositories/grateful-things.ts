import { createClient } from "@/lib/supabase/client";
import { persistGratitudePhotos } from "@/lib/grateful-things/photo-storage";
import {
  insertGratefulThing,
  requireAuthenticatedUserId,
  updateGratefulThingRow,
} from "@/lib/grateful-things/repository-core";
import type { GratefulThing } from "@/types/database";

export type CreateGratefulThingInput = {
  content: string;
  entry_date?: string;
  category?: string | null;
  /** Data URL, remote URL, or File — persisted to storage when needed. */
  photo_url?: string | File | null;
  is_favorite?: boolean;
};

export type UpdateGratefulThingInput = Partial<CreateGratefulThingInput>;

async function createViaApi(input: CreateGratefulThingInput): Promise<GratefulThing> {
  const photo =
    input.photo_url instanceof File
      ? await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") resolve(reader.result);
            else reject(new Error("read_failed"));
          };
          reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
          reader.readAsDataURL(input.photo_url as File);
        })
      : typeof input.photo_url === "string"
        ? input.photo_url
        : null;

  const res = await fetch("/api/grateful-things", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: input.content,
      entry_date: input.entry_date,
      category: input.category,
      photo_url: photo,
      is_favorite: input.is_favorite,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as GratefulThing | { error?: string };
  if (!res.ok) {
    throw new Error(typeof data === "object" && data && "error" in data && data.error
      ? String(data.error)
      : "Failed to save entry");
  }
  return data as GratefulThing;
}

export const gratefulThingsRepository = {
  async getAll(): Promise<GratefulThing[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("grateful_things")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<GratefulThing> {
    const supabase = createClient();
    const { data, error } = await supabase.from("grateful_things").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateGratefulThingInput): Promise<GratefulThing> {
    return createViaApi(input);
  },

  async update(id: string, input: UpdateGratefulThingInput): Promise<GratefulThing> {
    const supabase = createClient();
    const userId = await requireAuthenticatedUserId(supabase);
    const { photo_url: photoInput, ...rest } = input;
    const patch: Record<string, unknown> = { ...rest };

    if (photoInput !== undefined) {
      const photos = await persistGratitudePhotos({
        photo: photoInput,
        entryId: id,
      });
      patch.photo_url = photos.photo_url;
      patch.thumbnail_url = photos.thumbnail_url;
    }

    return updateGratefulThingRow(supabase, id, patch);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("grateful_things").delete().eq("id", id);
    if (error) throw error;
  },
};
