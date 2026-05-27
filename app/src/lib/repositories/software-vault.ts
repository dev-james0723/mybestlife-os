import { createClient } from "@/lib/supabase/client";
import type { SoftwareVaultEntry } from "@/types/database";
import type {
  BillingCycle,
  ConfidenceLevel,
  FieldSource,
  PricingPlan,
  SoftwareAlternative,
} from "@/types/vault-smart-autofill";

export type CreateSoftwareVaultInput = {
  app_name: string;
  website_url?: string | null;
  icon_url?: string | null;
  category?: string | null;
  platforms?: string | null;
  use_cases?: string | null;
  status?: SoftwareVaultEntry["status"];
  priority?: SoftwareVaultEntry["priority"];
  cost_type?: SoftwareVaultEntry["cost_type"];
  cost_amount?: number | null;
  cost_period?: string | null;
  why_i_use_it?: string | null;
  best_feature?: string | null;
  biggest_downside?: string | null;
  best_alternative?: string | null;
  replaces?: string | null;
  tags?: string | null;
  default_tool_for?: string | null;
  summary?: string | null;
  ai_generated_fields?: string[];
  pricing_plans?: PricingPlan[];
  selected_plan_id?: string | null;
  billing_cycle?: BillingCycle | null;
  cost_currency?: string | null;
  alternative_options?: SoftwareAlternative[];
  field_sources?: FieldSource[];
  field_confidence?: Record<string, ConfidenceLevel>;
  pricing_last_checked_at?: string | null;
  is_default_stack?: boolean;
};

export type UpdateSoftwareVaultInput = Partial<CreateSoftwareVaultInput> & {
  launch_count?: number;
  last_opened_at?: string | null;
};

export const softwareVaultRepository = {
  async getAll(): Promise<SoftwareVaultEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("software_vault")
      .select("*")
      .order("app_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as SoftwareVaultEntry[];
  },

  async getById(id: string): Promise<SoftwareVaultEntry> {
    const supabase = createClient();
    const { data, error } = await supabase.from("software_vault").select("*").eq("id", id).single();
    if (error) throw error;
    return data as SoftwareVaultEntry;
  },

  async create(input: CreateSoftwareVaultInput): Promise<SoftwareVaultEntry> {
    const supabase = createClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;
    const userId = auth.user?.id;
    if (!userId) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("software_vault")
      .insert({
        user_id: userId,
        app_name: input.app_name,
        website_url: input.website_url ?? null,
        icon_url: input.icon_url ?? null,
        category: input.category ?? null,
        platforms: input.platforms ?? null,
        use_cases: input.use_cases ?? null,
        status: input.status ?? "Testing",
        priority: input.priority ?? "Nice-to-have",
        cost_type: input.cost_type ?? "Free",
        cost_amount: input.cost_amount ?? null,
        cost_period: input.cost_period ?? null,
        why_i_use_it: input.why_i_use_it ?? null,
        best_feature: input.best_feature ?? null,
        biggest_downside: input.biggest_downside ?? null,
        best_alternative: input.best_alternative ?? null,
        replaces: input.replaces ?? null,
        tags: input.tags ?? null,
        default_tool_for: input.default_tool_for ?? null,
        summary: input.summary ?? null,
        ai_generated_fields: input.ai_generated_fields ?? [],
        pricing_plans: input.pricing_plans ?? [],
        selected_plan_id: input.selected_plan_id ?? null,
        billing_cycle: input.billing_cycle ?? null,
        cost_currency: input.cost_currency ?? null,
        alternative_options: input.alternative_options ?? [],
        field_sources: input.field_sources ?? [],
        field_confidence: input.field_confidence ?? {},
        pricing_last_checked_at: input.pricing_last_checked_at ?? null,
        is_default_stack: input.is_default_stack ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return data as SoftwareVaultEntry;
  },

  async update(id: string, input: UpdateSoftwareVaultInput): Promise<SoftwareVaultEntry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("software_vault")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as SoftwareVaultEntry;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("software_vault").delete().eq("id", id);
    if (error) throw error;
  },

  async markOpened(id: string): Promise<void> {
    const supabase = createClient();
    const { data, error: readErr } = await supabase
      .from("software_vault")
      .select("launch_count")
      .eq("id", id)
      .single();
    if (readErr) throw readErr;
    const next = (data?.launch_count ?? 0) + 1;
    const { error } = await supabase
      .from("software_vault")
      .update({ launch_count: next, last_opened_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
