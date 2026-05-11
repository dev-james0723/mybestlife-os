import type { VaultLibraryTool } from "@/lib/vault/software-library-schema";

/** Compact curated-tool rows for stack seed modules. */
export function libTool(
  id: string,
  name: string,
  opts?: {
    website_url?: string | null;
    category?: string;
    role_in_stack?: string;
    workflow_tags?: string[];
  },
): VaultLibraryTool {
  return {
    id,
    name,
    website_url: opts?.website_url ?? null,
    category: opts?.category ?? null,
    role_in_stack: opts?.role_in_stack ?? null,
    workflow_tags: opts?.workflow_tags,
  };
}
