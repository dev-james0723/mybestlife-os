import {
  vaultCuratedStackTemplateSchema,
  type VaultCuratedStackTemplate,
} from "@/lib/vault/software-library-schema";
import { VAULT_STACK_SEEDS_BATCH_01 } from "@/lib/vault/stack-seeds/batch-01";
import { VAULT_STACK_SEEDS_BATCH_02 } from "@/lib/vault/stack-seeds/batch-02";
import { VAULT_STACK_SEEDS_BATCH_03 } from "@/lib/vault/stack-seeds/batch-03";
import { VAULT_STACK_SEEDS_BATCH_04 } from "@/lib/vault/stack-seeds/batch-04";
import { VAULT_STACK_SEEDS_BATCH_05 } from "@/lib/vault/stack-seeds/batch-05";
import { VAULT_STACK_SEEDS_BATCH_06 } from "@/lib/vault/stack-seeds/batch-06";
/** Side-effect: asserts catalog ↔ schema slug alignment at module load. */
import "@/lib/vault/industry-catalog";

const RAW_CURATED_STACKS = [
  ...VAULT_STACK_SEEDS_BATCH_01,
  ...VAULT_STACK_SEEDS_BATCH_02,
  ...VAULT_STACK_SEEDS_BATCH_03,
  ...VAULT_STACK_SEEDS_BATCH_04,
  ...VAULT_STACK_SEEDS_BATCH_05,
  ...VAULT_STACK_SEEDS_BATCH_06,
];

/**
 * Curated AI software stacks (config-driven, typed).
 * Seeds live under `stack-seeds/` so the catalog can grow without one mega-file.
 */
export const VAULT_CURATED_STACK_TEMPLATES: VaultCuratedStackTemplate[] =
  vaultCuratedStackTemplateSchema.array().parse(RAW_CURATED_STACKS);

export function getCuratedStackById(id: string): VaultCuratedStackTemplate | undefined {
  return VAULT_CURATED_STACK_TEMPLATES.find((s) => s.id === id);
}

export function curatedStacksByIndustry(
  industry: VaultCuratedStackTemplate["industry"],
): VaultCuratedStackTemplate[] {
  return VAULT_CURATED_STACK_TEMPLATES.filter((s) => s.industry === industry);
}
