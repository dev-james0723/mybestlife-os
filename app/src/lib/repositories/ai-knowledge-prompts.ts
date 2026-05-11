/**
 * Repository for the AI Knowledge prompt tables.
 *
 * Domain types live in `@/types/prompt`; DB row types (snake_case mirrors of
 * the SQL schema) live in `@/types/database` so the narrowing happens here at
 * the boundary.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  LibraryPromptRow,
  PromptCategoryRow,
  PromptFavoriteRow,
  PromptLocalizedJson,
  PromptRunRow,
  PromptRunStatusRow,
  PromptVariableJson,
  UserPromptRow,
} from "@/types/database";
import type {
  CustomPrompt,
  LibraryPrompt,
  LocalizedText,
  PromptCategory,
  PromptProvider,
  PromptRun,
  PromptTopCategory,
  PromptVariable,
} from "@/types/prompt";

// ---------------------------------------------------------------------------
// Row ↔ domain conversion
// ---------------------------------------------------------------------------

function toLocalizedText(row: PromptLocalizedJson): LocalizedText {
  // `en` is required by the DB check constraint; spread preserves whatever
  // locales the row actually has.
  return { ...row, en: row.en } as LocalizedText;
}

function toVariables(rows: PromptVariableJson[]): PromptVariable[] {
  return rows.map((r) => ({
    name: r.name,
    label: r.label ?? null,
    description: r.description ?? null,
    required: r.required,
    example: r.example ?? null,
  }));
}

function toPromptCategory(row: PromptCategoryRow): PromptCategory {
  return {
    id: row.id,
    slug: row.slug,
    parent_slug: row.parent_slug,
    top_category: row.top_category as PromptTopCategory,
    name_i18n: toLocalizedText(row.name_i18n),
    description_i18n: row.description_i18n
      ? toLocalizedText(row.description_i18n)
      : null,
    icon: row.icon,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

function toLibraryPrompt(row: LibraryPromptRow): LibraryPrompt {
  return {
    id: row.id,
    source: "library",
    slug: row.slug,
    title_i18n: toLocalizedText(row.title_i18n),
    description_i18n: toLocalizedText(row.description_i18n),
    body: row.body,
    body_locale: (row.body_locale as LibraryPrompt["body_locale"]) ?? "en",
    top_category: row.top_category as PromptTopCategory,
    sub_category_slug: row.sub_category_slug,
    tags: row.tags,
    variables: toVariables(row.variables),
    icon: row.icon,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_featured: row.is_featured,
    sort_order: row.sort_order,
    provenance: {
      source_repo: row.source_repo,
      source_url: row.source_url,
      source_path: row.source_path,
      license: row.license,
      attribution: row.attribution,
    },
  };
}

function toCustomPrompt(row: UserPromptRow): CustomPrompt {
  return {
    id: row.id,
    source: "custom",
    user_id: row.user_id,
    slug: row.slug,
    title_i18n: toLocalizedText(row.title_i18n),
    description_i18n: toLocalizedText(row.description_i18n),
    body: row.body,
    body_locale: (row.body_locale as CustomPrompt["body_locale"]) ?? "en",
    top_category: row.top_category as PromptTopCategory,
    sub_category_slug: row.sub_category_slug,
    tags: row.tags,
    variables: toVariables(row.variables),
    icon: row.icon,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_favorite: row.is_favorite,
    usage_count: row.usage_count,
    last_used_at: row.last_used_at,
    forked_from_prompt_slug: row.forked_from_prompt_slug,
  };
}

function toPromptRun(row: PromptRunRow): PromptRun {
  return {
    id: row.id,
    user_id: row.user_id,
    library_prompt_id: row.library_prompt_id,
    custom_prompt_id: row.custom_prompt_id,
    provider: row.provider as PromptProvider,
    model: row.model,
    variables: row.variables,
    status: row.status,
    result_snippet: row.result_snippet,
    error_message: row.error_message,
    started_at: row.started_at,
    completed_at: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type NewUserPromptInput = {
  title: string;
  description?: string;
  body: string;
  body_locale?: string;
  top_category: PromptTopCategory;
  sub_category_slug?: string | null;
  tags?: string[];
  variables?: PromptVariable[];
  icon?: string | null;
  is_favorite?: boolean;
  /** Slug of the library prompt this was forked from (null for scratch). */
  forked_from_prompt_slug?: string | null;
  /** Stable, user-unique slug. Auto-generated from title when omitted. */
  slug?: string;
};

export type UpdateUserPromptInput = Partial<NewUserPromptInput>;

export type NewPromptRunInput = {
  library_prompt_id?: string | null;
  custom_prompt_id?: string | null;
  provider?: PromptProvider;
  model?: string | null;
  variables?: Record<string, string>;
  status?: PromptRunStatusRow;
  result_snippet?: string | null;
  error_message?: string | null;
  started_at?: string;
  completed_at?: string | null;
};

function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 64) || `prompt-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const aiKnowledgeRepository = {
  // ---------- categories ----------
  async listCategories(): Promise<PromptCategory[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_prompt_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => toPromptCategory(row as PromptCategoryRow));
  },

  // ---------- library ----------
  async listLibrary(): Promise<LibraryPrompt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_prompt_library")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => toLibraryPrompt(row as LibraryPromptRow));
  },

  async getLibraryPromptBySlug(slug: string): Promise<LibraryPrompt> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_prompt_library")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) throw error;
    return toLibraryPrompt(data as LibraryPromptRow);
  },

  async getLibraryPromptById(id: string): Promise<LibraryPrompt> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_prompt_library")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return toLibraryPrompt(data as LibraryPromptRow);
  },

  // ---------- user prompts ----------
  async listUserPrompts(): Promise<CustomPrompt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_user_prompts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => toCustomPrompt(row as UserPromptRow));
  },

  async getUserPromptById(id: string): Promise<CustomPrompt> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_user_prompts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return toCustomPrompt(data as UserPromptRow);
  },

  async createUserPrompt(input: NewUserPromptInput): Promise<CustomPrompt> {
    const supabase = createClient();
    const slug = input.slug ?? slugifyTitle(input.title);
    const payload = {
      slug,
      title_i18n: { en: input.title },
      description_i18n: { en: input.description ?? "" },
      body: input.body,
      body_locale: input.body_locale ?? "en",
      top_category: input.top_category,
      sub_category_slug: input.sub_category_slug ?? null,
      tags: input.tags ?? [],
      variables: input.variables ?? [],
      icon: input.icon ?? null,
      is_favorite: input.is_favorite ?? false,
      forked_from_prompt_slug: input.forked_from_prompt_slug ?? null,
    };
    const { data, error } = await supabase
      .from("ai_user_prompts")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return toCustomPrompt(data as UserPromptRow);
  },

  async updateUserPrompt(
    id: string,
    input: UpdateUserPromptInput,
  ): Promise<CustomPrompt> {
    const supabase = createClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.title !== undefined) patch.title_i18n = { en: input.title };
    if (input.description !== undefined) {
      patch.description_i18n = { en: input.description };
    }
    if (input.body !== undefined) patch.body = input.body;
    if (input.body_locale !== undefined) patch.body_locale = input.body_locale;
    if (input.top_category !== undefined) patch.top_category = input.top_category;
    if (input.sub_category_slug !== undefined) {
      patch.sub_category_slug = input.sub_category_slug;
    }
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.variables !== undefined) patch.variables = input.variables;
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.is_favorite !== undefined) patch.is_favorite = input.is_favorite;
    if (input.forked_from_prompt_slug !== undefined) {
      patch.forked_from_prompt_slug = input.forked_from_prompt_slug;
    }
    if (input.slug !== undefined) patch.slug = input.slug;

    const { data, error } = await supabase
      .from("ai_user_prompts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toCustomPrompt(data as UserPromptRow);
  },

  async deleteUserPrompt(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("ai_user_prompts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  /**
   * Fork a library prompt into the user's collection as an independent copy.
   * Snapshot semantics: we copy fields by value, so later edits to the source
   * library prompt do not bleed into the user's copy.
   */
  async forkLibraryPrompt(libraryPromptId: string): Promise<CustomPrompt> {
    const source = await this.getLibraryPromptById(libraryPromptId);
    return this.createUserPrompt({
      title: source.title_i18n.en,
      description: source.description_i18n.en,
      body: source.body,
      body_locale: source.body_locale,
      top_category: source.top_category,
      sub_category_slug: source.sub_category_slug,
      tags: source.tags,
      variables: source.variables,
      icon: source.icon,
      forked_from_prompt_slug: source.slug,
    });
  },

  // ---------- favorites ----------
  async listFavoriteIds(): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_prompt_favorites")
      .select("library_prompt_id")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Pick<PromptFavoriteRow, "library_prompt_id">[]).map(
      (r) => r.library_prompt_id,
    );
  },

  async addFavorite(libraryPromptId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("ai_prompt_favorites")
      .insert({ library_prompt_id: libraryPromptId });
    if (error) throw error;
  },

  async removeFavorite(libraryPromptId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("ai_prompt_favorites")
      .delete()
      .eq("library_prompt_id", libraryPromptId);
    if (error) throw error;
  },

  // ---------- runs ----------
  async listRecentRuns(limit = 50): Promise<PromptRun[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_prompt_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => toPromptRun(row as PromptRunRow));
  },

  async recordRun(input: NewPromptRunInput): Promise<PromptRun> {
    const supabase = createClient();
    if (input.library_prompt_id && input.custom_prompt_id) {
      throw new Error(
        "recordRun: must pass at most one of library_prompt_id / custom_prompt_id",
      );
    }
    const payload = {
      library_prompt_id: input.library_prompt_id ?? null,
      custom_prompt_id: input.custom_prompt_id ?? null,
      provider: input.provider ?? "gemini",
      model: input.model ?? null,
      variables: input.variables ?? {},
      status: input.status ?? "pending",
      result_snippet: input.result_snippet ?? null,
      error_message: input.error_message ?? null,
      started_at: input.started_at ?? new Date().toISOString(),
      completed_at: input.completed_at ?? null,
    };
    const { data, error } = await supabase
      .from("ai_prompt_runs")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return toPromptRun(data as PromptRunRow);
  },

  async updateRun(
    runId: string,
    patch: {
      status?: PromptRunStatusRow;
      result_snippet?: string | null;
      error_message?: string | null;
      completed_at?: string | null;
    },
  ): Promise<PromptRun> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_prompt_runs")
      .update(patch)
      .eq("id", runId)
      .select()
      .single();
    if (error) throw error;
    return toPromptRun(data as PromptRunRow);
  },

  /**
   * Atomic-ish increment of usage_count + last_used_at on a user prompt.
   * Read-modify-write; acceptable for Phase 1 because the field is lightly
   * contended (single user). Move to a Postgres function if that changes.
   */
  async incrementCustomPromptUsage(customPromptId: string): Promise<void> {
    const supabase = createClient();
    const { data: current, error: readErr } = await supabase
      .from("ai_user_prompts")
      .select("usage_count")
      .eq("id", customPromptId)
      .single();
    if (readErr) throw readErr;
    const next = ((current as { usage_count: number } | null)?.usage_count ?? 0) + 1;
    const { error } = await supabase
      .from("ai_user_prompts")
      .update({
        usage_count: next,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", customPromptId);
    if (error) throw error;
  },
};
