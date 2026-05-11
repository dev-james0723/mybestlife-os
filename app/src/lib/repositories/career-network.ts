import { createClient } from "@/lib/supabase/client";
import type {
  CareerNetworkEdge,
  CareerNetworkNode,
  NetworkNodeType,
} from "@/types/database";

export type CreateNodeInput = {
  nodeType: NetworkNodeType;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  roleTitle?: string | null;
  industry?: string | null;
  website?: string | null;
  projectUrl?: string | null;
  projectStatus?: string | null;
  opportunityId?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  notes?: string | null;
  lastInteractionDate?: string | null;
  color?: string | null;
  size?: number;
};

export type UpdateNodeInput = Partial<{
  node_type: NetworkNodeType;
  name: string;
  subtitle: string | null;
  description: string | null;
  email: string | null;
  linkedin_url: string | null;
  role_title: string | null;
  industry: string | null;
  website: string | null;
  project_url: string | null;
  project_status: string | null;
  opportunity_id: string | null;
  image_url: string | null;
  tags: string[];
  notes: string | null;
  last_interaction_date: string | null;
  color: string | null;
  size: number;
}>;

export type CreateEdgeInput = {
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  strength?: number | null;
  notes?: string | null;
};

export const careerNetworkRepository = {
  async listNodes(): Promise<CareerNetworkNode[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_network_nodes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerNetworkNode[];
  },

  async listEdges(): Promise<CareerNetworkEdge[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_network_edges")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerNetworkEdge[];
  },

  async createNode(input: CreateNodeInput): Promise<CareerNetworkNode> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("career_network_nodes")
      .insert({
        user_id: user.id,
        node_type: input.nodeType,
        name: input.name,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        email: input.email ?? null,
        linkedin_url: input.linkedinUrl ?? null,
        role_title: input.roleTitle ?? null,
        industry: input.industry ?? null,
        website: input.website ?? null,
        project_url: input.projectUrl ?? null,
        project_status: input.projectStatus ?? null,
        opportunity_id: input.opportunityId ?? null,
        image_url: input.imageUrl ?? null,
        tags: input.tags ?? [],
        notes: input.notes ?? null,
        last_interaction_date: input.lastInteractionDate ?? null,
        color: input.color ?? null,
        size: input.size ?? 1,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CareerNetworkNode;
  },

  async updateNode(
    id: string,
    updates: UpdateNodeInput,
  ): Promise<CareerNetworkNode> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("career_network_nodes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CareerNetworkNode;
  },

  async deleteNode(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("career_network_nodes")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async createEdge(input: CreateEdgeInput): Promise<CareerNetworkEdge> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("career_network_edges")
      .insert({
        user_id: user.id,
        source_node_id: input.sourceNodeId,
        target_node_id: input.targetNodeId,
        relationship_type: input.relationshipType,
        strength: input.strength ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CareerNetworkEdge;
  },

  async deleteEdge(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("career_network_edges")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async logInteraction(
    nodeId: string,
    date: string,
  ): Promise<CareerNetworkNode> {
    return careerNetworkRepository.updateNode(nodeId, {
      last_interaction_date: date,
    });
  },
};
