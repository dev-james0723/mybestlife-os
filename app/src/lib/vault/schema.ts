import { z } from "zod";

export const VAULT_STATUSES = ["Testing", "Active", "Retired", "Wishlist"] as const;
export const VAULT_PRIORITIES = ["Must-have", "Nice-to-have", "Optional"] as const;
export const VAULT_COST_TYPES = ["Free", "Freemium", "Paid", "Subscription"] as const;

/**
 * Schema used to validate the Gemini JSON response for software autofill.
 * We keep every field optional so partial responses can still succeed — the
 * frontend shows sparkle badges only on keys we actually received.
 */
export const vaultAutofillSchema = z.object({
  app_name: z.string().trim().min(1).optional(),
  website_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  category: z.string().trim().max(120).optional(),
  platforms: z.string().trim().max(240).optional(),
  use_cases: z.string().trim().max(600).optional(),
  status: z.enum(VAULT_STATUSES).optional(),
  priority: z.enum(VAULT_PRIORITIES).optional(),
  cost_type: z.enum(VAULT_COST_TYPES).optional(),
  cost_amount: z.number().nonnegative().optional().nullable(),
  cost_period: z.string().trim().max(60).optional(),
  why_i_use_it: z.string().trim().max(800).optional(),
  best_feature: z.string().trim().max(400).optional(),
  biggest_downside: z.string().trim().max(400).optional(),
  best_alternative: z.string().trim().max(200).optional(),
  replaces: z.string().trim().max(200).optional(),
  tags: z.string().trim().max(240).optional(),
  default_tool_for: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(280).optional(),
});

export type VaultAutofill = z.infer<typeof vaultAutofillSchema>;

export const vaultAutofillRequestSchema = z.object({
  query: z.string().trim().min(1).max(400),
  fields: z.array(z.string()).optional(),
});

export type VaultAutofillRequest = z.infer<typeof vaultAutofillRequestSchema>;
