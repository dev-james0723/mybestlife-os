import { createClient } from "@/lib/supabase/client";
import type {
  CareerOpportunity,
  CareerVaultFile,
  OpportunityInteraction,
  OpportunityInteractionType,
  OpportunityStage,
} from "@/types/career-vault";

export type CreateOpportunityInput = {
  companyName: string;
  roleTitle: string;
  location?: string | null;
  stage?: OpportunityStage;
  jobDescription?: string | null;
  jobUrl?: string | null;
  salaryRange?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
  attachedFileIds?: string[];
  excitementScore?: number | null;
  matchScore?: number | null;
  appliedDate?: string | null;
  nextActionDate?: string | null;
};

export type UpdateOpportunityInput = Partial<{
  company_name: string;
  role_title: string;
  location: string | null;
  stage: OpportunityStage;
  job_description: string | null;
  job_url: string | null;
  salary_range: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  attached_file_ids: string[];
  excitement_score: number | null;
  match_score: number | null;
  applied_date: string | null;
  next_action_date: string | null;
  stage_history: Record<string, string>;
}>;

export type CreateInteractionInput = {
  opportunityId: string;
  interactionType: OpportunityInteractionType;
  content: string;
  happenedAt?: string | null;
};

export const careerOpportunitiesRepository = {
  async list(): Promise<CareerOpportunity[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_opportunities")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerOpportunity[];
  },

  async getById(id: string): Promise<CareerOpportunity> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_opportunities")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as CareerOpportunity;
  },

  /** Opportunities that reference this file in attached_file_ids. */
  async listForFile(fileId: string): Promise<CareerOpportunity[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_opportunities")
      .select("*")
      .contains("attached_file_ids", [fileId])
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerOpportunity[];
  },

  async create(input: CreateOpportunityInput): Promise<CareerOpportunity> {
    const supabase = createClient();
    const initialStage = input.stage ?? "researching";
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("career_opportunities")
      .insert({
        company_name: input.companyName,
        role_title: input.roleTitle,
        location: input.location ?? null,
        stage: initialStage,
        job_description: input.jobDescription ?? null,
        job_url: input.jobUrl ?? null,
        salary_range: input.salaryRange ?? null,
        contact_name: input.contactName ?? null,
        contact_email: input.contactEmail ?? null,
        notes: input.notes ?? null,
        attached_file_ids: input.attachedFileIds ?? [],
        excitement_score: input.excitementScore ?? null,
        match_score: input.matchScore ?? null,
        applied_date: input.appliedDate ?? null,
        next_action_date: input.nextActionDate ?? null,
        stage_history: { [initialStage]: now },
      })
      .select()
      .single();
    if (error) throw error;
    return data as CareerOpportunity;
  },

  async update(id: string, updates: UpdateOpportunityInput): Promise<CareerOpportunity> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_opportunities")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CareerOpportunity;
  },

  /**
   * Atomic-ish stage transition: reads the current `stage_history`, inserts
   * the new stage's first-visit timestamp if missing, then writes back. Two
   * concurrent writers would race, but per-user contention here is vanishing.
   */
  async setStage(id: string, nextStage: OpportunityStage): Promise<CareerOpportunity> {
    const existing = await careerOpportunitiesRepository.getById(id);
    if (existing.stage === nextStage) return existing;
    const history = { ...(existing.stage_history ?? {}) };
    if (!history[nextStage]) history[nextStage] = new Date().toISOString();
    return careerOpportunitiesRepository.update(id, {
      stage: nextStage,
      stage_history: history,
    });
  },

  async setAttachedFiles(id: string, fileIds: string[]): Promise<CareerOpportunity> {
    const unique = Array.from(new Set(fileIds));
    return careerOpportunitiesRepository.update(id, {
      attached_file_ids: unique,
    });
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("career_opportunities")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async loadAttachedFiles(
    opportunity: CareerOpportunity,
  ): Promise<CareerVaultFile[]> {
    if (opportunity.attached_file_ids.length === 0) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_vault_files")
      .select("*")
      .in("id", opportunity.attached_file_ids);
    if (error) throw error;
    const byId = new Map<string, CareerVaultFile>();
    for (const f of (data ?? []) as CareerVaultFile[]) byId.set(f.id, f);
    return opportunity.attached_file_ids
      .map((id) => byId.get(id))
      .filter((f): f is CareerVaultFile => !!f);
  },
};

export const opportunityInteractionsRepository = {
  async listForOpportunity(
    opportunityId: string,
  ): Promise<OpportunityInteraction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("opportunity_interactions")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("happened_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as OpportunityInteraction[];
  },

  async create(input: CreateInteractionInput): Promise<OpportunityInteraction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("opportunity_interactions")
      .insert({
        opportunity_id: input.opportunityId,
        interaction_type: input.interactionType,
        content: input.content,
        happened_at: input.happenedAt ?? new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data as OpportunityInteraction;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("opportunity_interactions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
