import { createClient } from "@/lib/supabase/client";
import type { RoleModel } from "@/types/database";
import {
  isRoleModelKeyLessonArray,
  isRoleModelLinkArray,
  isRoleModelQuoteArray,
  type RoleModelKeyLesson,
  type RoleModelLink,
  type RoleModelQuote,
} from "@/types/role-model";

export type CreateRoleModelInput = {
  name: string;
  /** @deprecated Use `bio` instead. Kept for legacy callers. */
  description?: string | null;
  /** @deprecated Use `photo_url` instead. */
  image_url?: string | null;
  linked_project_ids?: string[];
  linked_goal_ids?: string[];
  linked_note_ids?: string[];
  // Richer profile fields (added 20260620)
  photo_url?: string | null;
  admiration_blurb?: string | null;
  bio?: string | null;
  category?: string | null;
  quotes?: RoleModelQuote[];
  key_lessons?: RoleModelKeyLesson[];
  tags?: string[];
  links?: RoleModelLink[];
  notes?: string | null;
  is_favorite?: boolean;
};

export type UpdateRoleModelInput = Partial<CreateRoleModelInput>;

const SELECT_COLUMNS =
  "id, user_id, name, description, image_url, linked_project_ids, linked_goal_ids, linked_note_ids, photo_url, admiration_blurb, bio, category, quotes, key_lessons, tags, links, notes, is_favorite, created_at, updated_at";

/**
 * Coerce a raw Supabase row (where JSONB columns are typed as `unknown`)
 * into the strict `RoleModel` shape. Falls back to empty arrays / nulls
 * for legacy rows where the new columns may be `null` or malformed.
 */
function mapRow(row: Record<string, unknown>): RoleModel {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    linked_project_ids: Array.isArray(row.linked_project_ids)
      ? (row.linked_project_ids as string[])
      : [],
    linked_goal_ids: Array.isArray(row.linked_goal_ids)
      ? (row.linked_goal_ids as string[])
      : [],
    linked_note_ids: Array.isArray(row.linked_note_ids)
      ? (row.linked_note_ids as string[])
      : [],
    photo_url: (row.photo_url as string | null) ?? null,
    admiration_blurb: (row.admiration_blurb as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    quotes: isRoleModelQuoteArray(row.quotes) ? row.quotes : [],
    key_lessons: isRoleModelKeyLessonArray(row.key_lessons)
      ? row.key_lessons
      : [],
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    links: isRoleModelLinkArray(row.links) ? row.links : [],
    notes: (row.notes as string | null) ?? null,
    is_favorite: Boolean(row.is_favorite),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Build the `INSERT`/`UPDATE` payload from a partial input. Only includes
 * keys the caller actually provided so PATCH-style updates don't overwrite
 * fields they don't intend to.
 */
function buildPayload(
  input: Partial<CreateRoleModelInput>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.description !== undefined) out.description = input.description;
  if (input.image_url !== undefined) out.image_url = input.image_url;
  if (input.linked_project_ids !== undefined)
    out.linked_project_ids = input.linked_project_ids;
  if (input.linked_goal_ids !== undefined)
    out.linked_goal_ids = input.linked_goal_ids;
  if (input.linked_note_ids !== undefined)
    out.linked_note_ids = input.linked_note_ids;
  if (input.photo_url !== undefined) out.photo_url = input.photo_url;
  if (input.admiration_blurb !== undefined)
    out.admiration_blurb = input.admiration_blurb;
  if (input.bio !== undefined) out.bio = input.bio;
  if (input.category !== undefined) out.category = input.category;
  if (input.quotes !== undefined) out.quotes = input.quotes;
  if (input.key_lessons !== undefined) out.key_lessons = input.key_lessons;
  if (input.tags !== undefined) out.tags = input.tags;
  if (input.links !== undefined) out.links = input.links;
  if (input.notes !== undefined) out.notes = input.notes;
  if (input.is_favorite !== undefined) out.is_favorite = input.is_favorite;
  return out;
}

export const roleModelsRepository = {
  async getAll(): Promise<RoleModel[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("role_models")
      .select(SELECT_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  },

  async getById(id: string): Promise<RoleModel> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("role_models")
      .select(SELECT_COLUMNS)
      .eq("id", id)
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  async create(input: CreateRoleModelInput): Promise<RoleModel> {
    const supabase = createClient();
    const payload = buildPayload(input);
    if (input.linked_project_ids === undefined) payload.linked_project_ids = [];
    if (input.linked_goal_ids === undefined) payload.linked_goal_ids = [];
    if (input.linked_note_ids === undefined) payload.linked_note_ids = [];

    const { data, error } = await supabase
      .from("role_models")
      .insert(payload)
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  async update(id: string, input: UpdateRoleModelInput): Promise<RoleModel> {
    const supabase = createClient();
    const payload = buildPayload(input);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("role_models")
      .update(payload)
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("role_models").delete().eq("id", id);
    if (error) throw error;
  },
};
