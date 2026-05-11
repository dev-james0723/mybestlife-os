import { createClient } from "@/lib/supabase/client";
import type {
  CareerVaultBundle,
  CareerVaultBundleType,
  CareerVaultFile,
} from "@/types/career-vault";

export type CreateBundleInput = {
  name: string;
  description?: string | null;
  bundleType?: CareerVaultBundleType | null;
  fileOrder: string[];
  includeCoverPage?: boolean;
  coverTitle?: string | null;
  coverSubtitle?: string | null;
  coverRecipient?: string | null;
};

export type UpdateBundleInput = Partial<{
  name: string;
  description: string | null;
  bundle_type: CareerVaultBundleType | null;
  file_order: string[];
  include_cover_page: boolean;
  cover_title: string | null;
  cover_subtitle: string | null;
  cover_recipient: string | null;
  last_exported_at: string | null;
}>;

export const careerVaultBundlesRepository = {
  async list(): Promise<CareerVaultBundle[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_bundles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerVaultBundle[];
  },

  async getById(id: string): Promise<CareerVaultBundle> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_bundles")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as CareerVaultBundle;
  },

  async create(input: CreateBundleInput): Promise<CareerVaultBundle> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_bundles")
      .insert({
        name: input.name,
        description: input.description ?? null,
        bundle_type: input.bundleType ?? null,
        file_order: input.fileOrder,
        include_cover_page: input.includeCoverPage ?? true,
        cover_title: input.coverTitle ?? null,
        cover_subtitle: input.coverSubtitle ?? null,
        cover_recipient: input.coverRecipient ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CareerVaultBundle;
  },

  async update(id: string, updates: UpdateBundleInput): Promise<CareerVaultBundle> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_bundles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CareerVaultBundle;
  },

  async duplicate(id: string): Promise<CareerVaultBundle> {
    const existing = await careerVaultBundlesRepository.getById(id);
    return careerVaultBundlesRepository.create({
      name: `${existing.name} (copy)`,
      description: existing.description,
      bundleType: existing.bundle_type,
      fileOrder: [...existing.file_order],
      includeCoverPage: existing.include_cover_page,
      coverTitle: existing.cover_title,
      coverSubtitle: existing.cover_subtitle,
      coverRecipient: existing.cover_recipient,
    });
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("career_vault_bundles")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async markExported(id: string): Promise<void> {
    const supabase = createClient();
    await supabase
      .from("career_vault_bundles")
      .update({ last_exported_at: new Date().toISOString() })
      .eq("id", id);
  },

  /** Load all vault files referenced in `file_order`, keeping the order. */
  async loadFiles(bundle: CareerVaultBundle): Promise<CareerVaultFile[]> {
    if (bundle.file_order.length === 0) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_files")
      .select("*")
      .in("id", bundle.file_order);
    if (error) throw error;
    const byId = new Map<string, CareerVaultFile>();
    for (const f of (data ?? []) as CareerVaultFile[]) byId.set(f.id, f);
    // Preserve the user-specified order; drop ids that no longer exist.
    return bundle.file_order
      .map((id) => byId.get(id))
      .filter((f): f is CareerVaultFile => !!f);
  },
};
