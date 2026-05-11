import type { SoftwareVaultEntry } from "@/types/database";
import { softwareVaultRepository } from "@/lib/repositories/software-vault";
import type { VaultLibraryTool } from "@/lib/vault/software-library-schema";
import {
  findVaultDuplicateForLibraryTool,
  libraryToolToCreateInput,
  mergeStackContextIntoEntry,
  type LibraryImportContext,
} from "@/lib/vault/recommended-tool-mapping";

/**
 * Add or merge a batch of library / AI tools into `software_vault`.
 * Callers should invalidate React Query after success.
 */
export async function depositLibraryToolsToVault(
  initialEntries: SoftwareVaultEntry[],
  tools: VaultLibraryTool[],
  ctx: LibraryImportContext,
): Promise<{ added: number; merged: number; working: SoftwareVaultEntry[] }> {
  let working = [...initialEntries];
  let added = 0;
  let merged = 0;

  for (const tool of tools) {
    const dup = findVaultDuplicateForLibraryTool(working, tool);
    if (dup) {
      const patch = mergeStackContextIntoEntry(dup, tool, ctx);
      await softwareVaultRepository.update(dup.id, patch);
      merged += 1;
      working = working.map((e) => (e.id === dup.id ? { ...e, ...patch } : e));
    } else {
      const created = await softwareVaultRepository.create(libraryToolToCreateInput(tool, ctx));
      added += 1;
      working = [...working, created];
    }
  }

  return { added, merged, working };
}
