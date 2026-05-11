import { createClient } from "@/lib/supabase/client";
import type {
  CareerVaultShare,
  CreateShareInput,
  ShareAccessLog,
} from "@/types/career-vault";
import {
  generateShareToken,
  hashSharePassword,
} from "@/lib/career-vault/share-crypto";

export type UpdateShareInput = Partial<{
  expires_at: string | null;
  max_views: number | null;
  recipient_label: string | null;
  allow_download: boolean;
  watermark_enabled: boolean;
  is_active: boolean;
}>;

function buildPublicShareUrl(token: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/share/${token}`;
  }
  // Server-side rendering fallback — share URLs are only ever displayed on
  // the client, so this branch is defensive. `NEXT_PUBLIC_APP_URL` can be
  // set in prod; otherwise we return a relative path.
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return base ? `${base}/share/${token}` : `/share/${token}`;
}

export const careerVaultSharesRepository = {
  buildPublicShareUrl,

  async list(): Promise<CareerVaultShare[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_shares")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerVaultShare[];
  },

  async listForFile(fileId: string): Promise<CareerVaultShare[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_shares")
      .select("*")
      .eq("file_id", fileId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerVaultShare[];
  },

  async getById(id: string): Promise<CareerVaultShare> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_shares")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as CareerVaultShare;
  },

  async create(input: CreateShareInput): Promise<CareerVaultShare> {
    const supabase = createClient();

    if (input.shareType === "single_file" && !input.fileId) {
      throw new Error("fileId is required for single_file shares");
    }
    if (input.shareType === "bundle" && !input.bundleId) {
      throw new Error("bundleId is required for bundle shares");
    }

    // Resolve password hash client-side. The only ever-plaintext password is
    // the one the user typed; it's discarded after hashing.
    let password_salt: string | null = null;
    let password_hash: string | null = null;
    if (input.password && input.password.length > 0) {
      const hashed = await hashSharePassword(input.password);
      password_salt = hashed.salt;
      password_hash = hashed.hash;
    }

    // Collision-resistant by construction; retry once on the off-chance the
    // unique constraint still trips (e.g. a cosmic-ray birthday-collision).
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = generateShareToken(16);
      const { data, error } = await supabase
        .from("career_vault_shares")
        .insert({
          share_token: token,
          share_type: input.shareType,
          file_id: input.shareType === "single_file" ? input.fileId : null,
          bundle_id: input.shareType === "bundle" ? input.bundleId : null,
          password_salt,
          password_hash,
          expires_at: input.expiresAt ?? null,
          max_views: input.maxViews ?? null,
          recipient_label: input.recipientLabel ?? null,
          allow_download: input.allowDownload ?? true,
          watermark_enabled: input.watermarkEnabled ?? false,
        })
        .select()
        .single();
      if (!error) return data as CareerVaultShare;
      if (error.code !== "23505") throw error;
    }
    throw new Error("Could not generate unique share token");
  },

  async update(id: string, updates: UpdateShareInput): Promise<CareerVaultShare> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_shares")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CareerVaultShare;
  },

  async revoke(id: string): Promise<CareerVaultShare> {
    return careerVaultSharesRepository.update(id, { is_active: false });
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("career_vault_shares")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async listAccessLogs(shareId: string): Promise<ShareAccessLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("share_access_logs")
      .select("*")
      .eq("share_id", shareId)
      .order("accessed_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as ShareAccessLog[];
  },

  async deleteAccessLogs(shareId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("share_access_logs")
      .delete()
      .eq("share_id", shareId);
    if (error) throw error;
  },
};
