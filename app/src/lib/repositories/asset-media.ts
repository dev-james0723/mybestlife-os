/**
 * Repository for the Asset Intelligence Hub evidence layer:
 *   - `asset_images`    (uploaded photos + AI-generated product visuals)
 *   - `asset_documents` (many documents per asset, each with a role)
 *
 * Mirrors the conventions in {@link assetsRepository}: a browser Supabase
 * client per call, errors thrown directly, `updated_at` set manually on
 * updates, and nullish-coalescing for optional inserts.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  AssetImage,
  AssetImageType,
  AssetDocumentLink,
  AssetDocumentRole,
} from "@/types/asset-intelligence";

// ---------------------------------------------------------------------------
// asset_images
// ---------------------------------------------------------------------------

export type CreateAssetImageInput = {
  asset_id: string;
  image_url: string;
  storage_path?: string | null;
  image_type: AssetImageType;
  prompt?: string | null;
  model_used?: string | null;
  is_primary?: boolean;
};

export const assetImagesRepository = {
  async listForAsset(assetId: string): Promise<AssetImage[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("asset_images")
      .select("*")
      .eq("asset_id", assetId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as AssetImage[];
  },

  async create(input: CreateAssetImageInput): Promise<AssetImage> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("asset_images")
      .insert({
        asset_id: input.asset_id,
        image_url: input.image_url,
        storage_path: input.storage_path ?? null,
        image_type: input.image_type,
        prompt: input.prompt ?? null,
        model_used: input.model_used ?? null,
        is_primary: input.is_primary ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return data as AssetImage;
  },

  /**
   * Promote one image to primary. The partial unique index
   * `asset_images_one_primary_idx` enforces at most one primary per asset, so
   * we clear the existing primary first, then set the new one.
   */
  async setPrimary(assetId: string, imageId: string): Promise<void> {
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error: clearError } = await supabase
      .from("asset_images")
      .update({ is_primary: false, updated_at: now })
      .eq("asset_id", assetId)
      .eq("is_primary", true);
    if (clearError) throw clearError;
    const { error } = await supabase
      .from("asset_images")
      .update({ is_primary: true, updated_at: now })
      .eq("id", imageId);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("asset_images").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// asset_documents
// ---------------------------------------------------------------------------

export type CreateAssetDocumentInput = {
  asset_id: string;
  document_id: string;
  document_role: AssetDocumentRole;
  confidence?: number | null;
};

export const assetDocumentsRepository = {
  async listForAsset(assetId: string): Promise<AssetDocumentLink[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("asset_documents")
      .select("*")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as AssetDocumentLink[];
  },

  async create(input: CreateAssetDocumentInput): Promise<AssetDocumentLink> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("asset_documents")
      .insert({
        asset_id: input.asset_id,
        document_id: input.document_id,
        document_role: input.document_role,
        confidence: input.confidence ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as AssetDocumentLink;
  },

  async updateRole(
    id: string,
    document_role: AssetDocumentRole,
  ): Promise<AssetDocumentLink> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("asset_documents")
      .update({ document_role, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as AssetDocumentLink;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("asset_documents")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
