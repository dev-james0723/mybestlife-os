import { createClient } from "@/lib/supabase/client";
import type { CareerVaultFile, TagUsage } from "@/types/career-vault";

/**
 * Tag storage note: tags live on `career_vault_files.tags` (TEXT[]). There is
 * no separate tags table. All operations here read the user's files, compute
 * the change locally, and write back affected rows one by one. That keeps
 * RLS behaviour simple at the cost of a round-trip per affected file.
 */
export const careerVaultTagsRepository = {
  /** Lowercase + trim + collapse whitespace. Duplicate of the client sanitiser. */
  normalize(tag: string): string {
    return tag
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u00C0-\uFFFF-]+/g, "");
  },

  /** Count each distinct tag across the current user's vault files. */
  async listUsage(): Promise<TagUsage[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_files")
      .select("tags");
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as Pick<CareerVaultFile, "tags">[]) {
      for (const t of row.tags ?? []) {
        const norm = t.trim();
        if (!norm) continue;
        counts.set(norm, (counts.get(norm) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },

  /** Return every file the user owns that contains `tag`. */
  async filesByTag(tag: string): Promise<CareerVaultFile[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_files")
      .select("*")
      .contains("tags", [tag])
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerVaultFile[];
  },

  /** Rename `from` → `to` across every file that has it. */
  async rename(from: string, to: string): Promise<number> {
    const normalized = careerVaultTagsRepository.normalize(to);
    if (!normalized) throw new Error("Target tag is empty");
    if (normalized === from) return 0;

    const supabase = createClient();
    const affected = await careerVaultTagsRepository.filesByTag(from);

    let updated = 0;
    for (const f of affected) {
      const next = Array.from(
        new Set(f.tags.map((t) => (t === from ? normalized : t))),
      );
      const { error } = await supabase
        .from("career_vault_files")
        .update({ tags: next, updated_at: new Date().toISOString() })
        .eq("id", f.id);
      if (error) throw error;
      updated += 1;
    }
    return updated;
  },

  /**
   * Merge `sources` into `target`. Files holding *any* of the source tags
   * will, after this call, contain `target` instead (and none of the sources).
   */
  async merge(sources: string[], target: string): Promise<number> {
    const normalizedTarget = careerVaultTagsRepository.normalize(target);
    if (!normalizedTarget) throw new Error("Target tag is empty");

    const supabase = createClient();
    const sourceSet = new Set(sources.filter((s) => s && s !== normalizedTarget));
    if (sourceSet.size === 0) return 0;

    const { data, error } = await supabase
      .from("career_vault_files")
      .select("*")
      .overlaps("tags", Array.from(sourceSet));
    if (error) throw error;

    const affected = (data ?? []) as CareerVaultFile[];
    let updated = 0;
    for (const f of affected) {
      const next = Array.from(
        new Set(
          f.tags
            .filter((t) => !sourceSet.has(t))
            .concat(normalizedTarget),
        ),
      );
      const { error: updateError } = await supabase
        .from("career_vault_files")
        .update({ tags: next, updated_at: new Date().toISOString() })
        .eq("id", f.id);
      if (updateError) throw updateError;
      updated += 1;
    }
    return updated;
  },

  /** Remove `tag` from every file that has it. */
  async remove(tag: string): Promise<number> {
    const supabase = createClient();
    const affected = await careerVaultTagsRepository.filesByTag(tag);

    let updated = 0;
    for (const f of affected) {
      const next = f.tags.filter((t) => t !== tag);
      const { error } = await supabase
        .from("career_vault_files")
        .update({ tags: next, updated_at: new Date().toISOString() })
        .eq("id", f.id);
      if (error) throw error;
      updated += 1;
    }
    return updated;
  },
};
