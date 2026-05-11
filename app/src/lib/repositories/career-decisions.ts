import { createClient } from "@/lib/supabase/client";
import type {
  CareerDecision,
  DecisionFramework,
  DecisionOption,
  DecisionType,
} from "@/types/database";

export type CreateDecisionInput = {
  title: string;
  decisionType?: DecisionType | null;
  framework?: DecisionFramework | null;
  context?: string | null;
  options?: DecisionOption[];
  assumptions?: string | null;
  decision?: string | null;
  expectedOutcome?: string | null;
  decidedAt: string;
  reviewReminderDate?: string | null;
};

export type UpdateDecisionInput = Partial<{
  title: string;
  decision_type: DecisionType | null;
  framework: DecisionFramework | null;
  context: string | null;
  options: DecisionOption[];
  assumptions: string | null;
  decision: string | null;
  expected_outcome: string | null;
  actual_outcome: string | null;
  lessons_learned: string | null;
  decision_quality_score: number | null;
  review_date: string | null;
  decided_at: string;
  review_reminder_date: string | null;
}>;

export const careerDecisionsRepository = {
  async list(): Promise<CareerDecision[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_decisions")
      .select("*")
      .order("decided_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerDecision[];
  },

  async get(id: string): Promise<CareerDecision | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_decisions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as CareerDecision | null) ?? null;
  },

  async create(input: CreateDecisionInput): Promise<CareerDecision> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_decisions")
      .insert({
        title: input.title,
        decision_type: input.decisionType ?? null,
        framework: input.framework ?? null,
        context: input.context ?? null,
        options: input.options ?? [],
        assumptions: input.assumptions ?? null,
        decision: input.decision ?? null,
        expected_outcome: input.expectedOutcome ?? null,
        decided_at: input.decidedAt,
        review_reminder_date: input.reviewReminderDate ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CareerDecision;
  },

  async update(
    id: string,
    updates: UpdateDecisionInput,
  ): Promise<CareerDecision> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_decisions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CareerDecision;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("career_decisions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
