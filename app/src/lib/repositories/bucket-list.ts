import { createClient } from "@/lib/supabase/client";
import type {
  BucketDreamImageRecord,
  BucketDreamImageSource,
  BucketDreamImageType,
  BucketFlightQuote,
  BucketFlightProvider,
  BucketIntegrationKind,
  BucketItem,
  BucketItemIntegration,
  BucketReflection,
  BucketSettings,
  CreateBucketItemInput,
  UpdateBucketItemInput,
} from "@/types/bucket-list";

export const BUCKET_DREAM_IMAGE_BUCKET = "bucket-dream-images";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

type BucketItemRow = Omit<
  BucketItem,
  | "category_tags"
  | "linked_task_ids"
  | "linked_calendar_event_ids"
  | "linked_knowledge_resource_ids"
  | "inspiration_links"
> & {
  category_tags: string[] | null;
  linked_task_ids: string[] | null;
  linked_calendar_event_ids: string[] | null;
  linked_knowledge_resource_ids: string[] | null;
  inspiration_links: BucketItem["inspiration_links"] | null;
};

function normalizeBucketItem(row: BucketItemRow): BucketItem {
  return {
    ...row,
    category_tags: row.category_tags ?? [],
    linked_task_ids: row.linked_task_ids ?? [],
    linked_calendar_event_ids: row.linked_calendar_event_ids ?? [],
    linked_knowledge_resource_ids: row.linked_knowledge_resource_ids ?? [],
    inspiration_links: Array.isArray(row.inspiration_links)
      ? row.inspiration_links
      : [],
  };
}

// ─── Bucket Items ─────────────────────────────────────────────────────────────

export const bucketItemsRepository = {
  async getAll(): Promise<BucketItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_items")
      .select("*")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => normalizeBucketItem(row as BucketItemRow));
  },

  async getById(id: string): Promise<BucketItem> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_items")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return normalizeBucketItem(data as BucketItemRow);
  },

  async create(input: CreateBucketItemInput): Promise<BucketItem> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_items")
      .insert({
        ...input,
        user_id: userId,
        status: input.status ?? "dreaming",
        priority: input.priority ?? "medium",
        difficulty: input.difficulty ?? "med",
        cost_currency: input.cost_currency ?? "USD",
        category_tags: input.category_tags ?? [],
        inspiration_links: input.inspiration_links ?? [],
      })
      .select("*")
      .single();
    if (error) throw error;
    return normalizeBucketItem(data as BucketItemRow);
  },

  async update(id: string, input: UpdateBucketItemInput): Promise<BucketItem> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_items")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return normalizeBucketItem(data as BucketItemRow);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("bucket_items").delete().eq("id", id);
    if (error) throw error;
  },

  async toggleFeatured(id: string, isFeatured: boolean): Promise<BucketItem> {
    return bucketItemsRepository.update(id, { is_featured: isFeatured });
  },

  async markCompleted(id: string): Promise<BucketItem> {
    return bucketItemsRepository.update(id, {
      status: "completed" as const,
      completed_at: new Date().toISOString(),
    } as UpdateBucketItemInput);
  },

  async reopen(id: string): Promise<BucketItem> {
    return bucketItemsRepository.update(id, {
      status: "active" as const,
      completed_at: null,
    } as UpdateBucketItemInput);
  },
};

// ─── Seed RPC ─────────────────────────────────────────────────────────────────

export async function runBucketListSeed(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("seed_bucket_list_starter");
  if (error) throw error;
  if (!data || !Array.isArray(data) || data.length === 0) return 0;
  const first = data[0] as { seeded_count?: number } | undefined;
  return first?.seeded_count ?? 0;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export type UpsertIntegrationInput = {
  bucket_item_id: string;
  kind: BucketIntegrationKind;
  external_id?: string | null;
  external_label?: string | null;
  external_url?: string | null;
  meta?: Record<string, unknown>;
};

export const bucketIntegrationsRepository = {
  async listForBucket(bucketItemId: string): Promise<BucketItemIntegration[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_item_integrations")
      .select("*")
      .eq("bucket_item_id", bucketItemId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BucketItemIntegration[];
  },

  async upsert(input: UpsertIntegrationInput): Promise<BucketItemIntegration> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_item_integrations")
      .upsert(
        {
          user_id: userId,
          bucket_item_id: input.bucket_item_id,
          kind: input.kind,
          external_id: input.external_id ?? null,
          external_label: input.external_label ?? null,
          external_url: input.external_url ?? null,
          meta: input.meta ?? {},
        },
        {
          onConflict: "bucket_item_id,kind,external_id,external_url",
          ignoreDuplicates: false,
        },
      )
      .select("*")
      .single();
    if (error) throw error;
    return data as BucketItemIntegration;
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("bucket_item_integrations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ─── Reflections ──────────────────────────────────────────────────────────────

export type CreateBucketReflectionInput = {
  bucket_item_id: string;
  reflection_text?: string | null;
  ai_summary?: string | null;
  photo_gallery?: BucketReflection["photo_gallery"];
  mood?: BucketReflection["mood"] | null;
};

export const bucketReflectionsRepository = {
  async listForBucket(bucketItemId: string): Promise<BucketReflection[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_reflections")
      .select("*")
      .eq("bucket_item_id", bucketItemId)
      .order("reflected_on", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BucketReflection[];
  },

  async create(
    input: CreateBucketReflectionInput,
  ): Promise<BucketReflection> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_reflections")
      .insert({
        ...input,
        user_id: userId,
        photo_gallery: input.photo_gallery ?? [],
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as BucketReflection;
  },

  async update(
    id: string,
    input: Partial<CreateBucketReflectionInput>,
  ): Promise<BucketReflection> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_reflections")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as BucketReflection;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("bucket_reflections")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ─── Flight quotes ────────────────────────────────────────────────────────────

export type RecordFlightQuoteInput = {
  bucket_item_id: string;
  provider: BucketFlightProvider;
  mode: "exploratory" | "live";
  origin_airport: string;
  destination_airport: string;
  depart_date?: string | null;
  return_date?: string | null;
  currency: string;
  cheapest_price?: number | null;
  fastest_price?: number | null;
  direct_price?: number | null;
  cheapest_deeplink?: string | null;
  raw_payload?: Record<string, unknown> | null;
};

export const bucketFlightQuotesRepository = {
  async latestForBucket(
    bucketItemId: string,
  ): Promise<BucketFlightQuote | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_flight_quotes")
      .select("*")
      .eq("bucket_item_id", bucketItemId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as BucketFlightQuote | null;
  },

  async historyForBucket(
    bucketItemId: string,
    limit = 30,
  ): Promise<BucketFlightQuote[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_flight_quotes")
      .select("*")
      .eq("bucket_item_id", bucketItemId)
      .order("fetched_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as BucketFlightQuote[];
  },

  async record(input: RecordFlightQuoteInput): Promise<BucketFlightQuote> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_flight_quotes")
      .insert({
        ...input,
        user_id: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as BucketFlightQuote;
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const bucketSettingsRepository = {
  async getOrCreate(): Promise<BucketSettings> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("bucket_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return existing as BucketSettings;

    const { data, error } = await supabase
      .from("bucket_settings")
      .insert({ user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    return data as BucketSettings;
  },

  async update(input: Partial<Omit<BucketSettings, "user_id" | "created_at" | "updated_at">>) {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_settings")
      .update(input)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as BucketSettings;
  },

  async markSeedsCleared() {
    const supabase = createClient();
    const userId = await requireUserId();
    await supabase
      .from("bucket_items")
      .delete()
      .eq("user_id", userId)
      .eq("is_seed", true);
    return bucketSettingsRepository.update({ seeds_cleared: true });
  },
};

// ─── Dream images (gallery) ─────────────────────────────────────────────────────

export type CreateDreamImageInput = {
  bucket_item_id: string;
  image_url: string;
  image_type?: BucketDreamImageType;
  source_type?: BucketDreamImageSource;
  caption?: string | null;
  ai_caption?: string | null;
  source_url?: string | null;
  prompt?: string | null;
  model_used?: string | null;
  is_primary?: boolean;
};

export type UploadDreamImageInput = {
  bucket_item_id: string;
  file: File;
  image_type?: BucketDreamImageType;
  caption?: string | null;
};

/** True when an image represents an AI-generated visual (drives the cover badge). */
function isGeneratedImage(image: {
  source_type: BucketDreamImageSource;
  image_type: BucketDreamImageType;
}): boolean {
  return image.source_type === "generated" || image.image_type === "generated_visual";
}

/** Best-effort extraction of the storage object path from a public URL in our bucket. */
function dreamImageStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET_DREAM_IMAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export const bucketDreamImagesRepository = {
  async listForBucket(bucketItemId: string): Promise<BucketDreamImageRecord[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_dream_images")
      .select("*")
      .eq("bucket_item_id", bucketItemId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BucketDreamImageRecord[];
  },

  async create(input: CreateDreamImageInput): Promise<BucketDreamImageRecord> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_dream_images")
      .insert({
        user_id: userId,
        bucket_item_id: input.bucket_item_id,
        image_url: input.image_url,
        image_type: input.image_type ?? "inspiration",
        source_type: input.source_type ?? "uploaded",
        caption: input.caption ?? null,
        ai_caption: input.ai_caption ?? null,
        source_url: input.source_url ?? null,
        prompt: input.prompt ?? null,
        model_used: input.model_used ?? null,
        is_primary: input.is_primary ?? false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as BucketDreamImageRecord;
  },

  /** Client-side upload to the public dream-images bucket, then record the row. */
  async upload(input: UploadDreamImageInput): Promise<BucketDreamImageRecord> {
    const userId = await requireUserId();
    const supabase = createClient();

    const ext =
      input.file.type === "image/png"
        ? "png"
        : input.file.type === "image/webp"
          ? "webp"
          : input.file.type === "image/gif"
            ? "gif"
            : "jpg";
    const storagePath = `${userId}/${input.bucket_item_id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_DREAM_IMAGE_BUCKET)
      .upload(storagePath, input.file, {
        contentType: input.file.type || "image/jpeg",
        upsert: false,
        cacheControl: "31536000, immutable",
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(BUCKET_DREAM_IMAGE_BUCKET)
      .getPublicUrl(storagePath);

    return bucketDreamImagesRepository.create({
      bucket_item_id: input.bucket_item_id,
      image_url: urlData.publicUrl,
      image_type: input.image_type ?? "inspiration",
      source_type: "uploaded",
      caption: input.caption ?? null,
    });
  },

  async update(
    id: string,
    input: Partial<Pick<BucketDreamImageRecord, "caption" | "ai_caption" | "image_type">>,
  ): Promise<BucketDreamImageRecord> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bucket_dream_images")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as BucketDreamImageRecord;
  },

  async remove(image: BucketDreamImageRecord): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("bucket_dream_images")
      .delete()
      .eq("id", image.id);
    if (error) throw error;

    // Best-effort: remove the underlying storage object if we own it.
    const path = dreamImageStoragePath(image.image_url);
    if (path) {
      await supabase.storage.from(BUCKET_DREAM_IMAGE_BUCKET).remove([path]);
    }

    // If the removed image was the cover, fall back to the catalog resolver.
    if (image.is_primary) {
      await supabase
        .from("bucket_items")
        .update({ cover_image_url: null, cover_image_is_ai: false })
        .eq("id", image.bucket_item_id);
    }
  },

  /**
   * Set an image as the dream's primary cover. Unsets any other primary,
   * marks this row primary, and syncs `bucket_items.cover_image_url` +
   * `cover_image_is_ai` so the card and detail hero share one source.
   */
  async setPrimary(image: BucketDreamImageRecord): Promise<void> {
    const supabase = createClient();

    // Clear existing primary first (one-primary unique index).
    const { error: clearError } = await supabase
      .from("bucket_dream_images")
      .update({ is_primary: false })
      .eq("bucket_item_id", image.bucket_item_id)
      .eq("is_primary", true);
    if (clearError) throw clearError;

    const { error: setError } = await supabase
      .from("bucket_dream_images")
      .update({ is_primary: true })
      .eq("id", image.id);
    if (setError) throw setError;

    const { error: syncError } = await supabase
      .from("bucket_items")
      .update({
        cover_image_url: image.image_url,
        cover_image_is_ai: isGeneratedImage(image),
      })
      .eq("id", image.bucket_item_id);
    if (syncError) throw syncError;
  },
};
