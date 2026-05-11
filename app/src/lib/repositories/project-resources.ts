import { createClient } from "@/lib/supabase/client";
import type { ProjectResource, ProjectResourceCategory } from "@/types/database";

async function getCurrentUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("You must be signed in.");
  return data.user.id;
}

export type CreateProjectResourceInput = {
  project_id: string;
  category: ProjectResourceCategory;
  title: string;
  url: string;
  source?: string;
  thumbnail_url?: string;
  description?: string;
  is_favorite?: boolean;
  sort_order?: number;
};

export const projectResourcesRepository = {
  async listByProject(projectId: string): Promise<ProjectResource[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_resources")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async createMany(inputs: CreateProjectResourceInput[]): Promise<void> {
    if (inputs.length === 0) return;
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const rows = inputs.map((row, i) => ({
      ...row,
      user_id: userId,
      is_favorite: row.is_favorite ?? true,
      sort_order: row.sort_order ?? i,
    }));
    const { error } = await supabase.from("project_resources").insert(rows);
    if (error) throw error;
  },

  async updateFavorite(
    id: string,
    is_favorite: boolean,
  ): Promise<ProjectResource> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_resources")
      .update({ is_favorite, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
