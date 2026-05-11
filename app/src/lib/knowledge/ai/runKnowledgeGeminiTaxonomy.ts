import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchGeminiStructured,
  getGeminiPlannerTextModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  DynamicTaxonomyResponseZ,
  KNOWLEDGE_DYNAMIC_TAXONOMY_SYSTEM_PROMPT,
  KnowledgeDynamicTaxonomyGeminiSchema,
  type DynamicTaxonomyResponse,
} from "@/lib/ai/schemas/knowledge/dynamic-taxonomy";
import { suggestTags } from "@/lib/knowledge/ai/suggestTags";
import { slugifyTagName } from "@/lib/knowledge/tags/normalize";

const MAX_EXCERPT = 4500;
const MAX_CATEGORIES = 60;
const MAX_TAGS = 120;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function shouldRunKnowledgeGeminiTaxonomy(): boolean {
  if (process.env.KNOWLEDGE_DISABLE_GEMINI_TAXONOMY === "1") return false;
  return Boolean(getGeminiServerApiKey());
}

function asciiSlug(input: string): string {
  const fromHint = slugifyTagName(input.replace(/_/g, "-"));
  if (fromHint) return fromHint.slice(0, 80);
  return `tag-${Date.now().toString(36)}`.slice(0, 80);
}

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
};

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

async function loadTaxonomySnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ categories: CategoryRow[]; tags: TagRow[] }> {
  const { data: cats, error: cErr } = await supabase
    .from("knowledge_tag_categories")
    .select("id, name, slug, description, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .limit(MAX_CATEGORIES);
  if (cErr) throw cErr;

  const { data: tagRows, error: tErr } = await supabase
    .from("knowledge_tags")
    .select("id, name, slug, description, category_id")
    .eq("user_id", userId)
    .order("name", { ascending: true })
    .limit(MAX_TAGS);
  if (tErr) throw tErr;

  return {
    categories: (cats ?? []) as CategoryRow[],
    tags: (tagRows ?? []) as TagRow[],
  };
}

async function nextCategorySortOrder(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("knowledge_tag_categories")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return 0;
  const n = data && typeof (data as { sort_order?: unknown }).sort_order === "number"
    ? (data as { sort_order: number }).sort_order
    : 0;
  return n + 10;
}

async function ensureUniqueTagSlug(
  supabase: SupabaseClient,
  userId: string,
  base: string,
): Promise<string> {
  let slug = asciiSlug(base).slice(0, 80) || `tag-${crypto.randomUUID().slice(0, 8)}`;
  for (let i = 0; i < 12; i++) {
    const { data } = await supabase
      .from("knowledge_tags")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${asciiSlug(base)}-${i + 2}`.slice(0, 80);
  }
  return `${asciiSlug(base)}-${crypto.randomUUID().slice(0, 6)}`.slice(0, 80);
}

async function ensureUniqueCategorySlug(
  supabase: SupabaseClient,
  userId: string,
  base: string,
): Promise<string> {
  let slug = asciiSlug(base).slice(0, 80) || `cat-${crypto.randomUUID().slice(0, 8)}`;
  for (let i = 0; i < 12; i++) {
    const { data } = await supabase
      .from("knowledge_tag_categories")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${asciiSlug(base)}-${i + 2}`.slice(0, 80);
  }
  return `${asciiSlug(base)}-${crypto.randomUUID().slice(0, 6)}`.slice(0, 80);
}

async function callGeminiClassify(params: {
  userId: string;
  itemId: string;
  title: string;
  contentType: string;
  excerpt: string;
  categories: CategoryRow[];
  tags: TagRow[];
}): Promise<unknown> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const userText = `Classify this knowledge item for user_id=${params.userId}.

=== Existing taxonomy (reuse these IDs when possible) ===
Categories (JSON array):
${JSON.stringify(
  params.categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
  })),
)}

Tags (JSON array):
${JSON.stringify(
  params.tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    category_id: t.category_id,
  })),
)}

=== Knowledge item ===
id: ${params.itemId}
title: ${params.title}
content_type: ${params.contentType}
summary_or_excerpt:
${params.excerpt}

Return JSON matching the schema (all fields required; use "" for unused strings).`;

  const { data } = await fetchGeminiStructured<unknown>({
    apiKey,
    model: getGeminiPlannerTextModel(),
    systemInstruction: KNOWLEDGE_DYNAMIC_TAXONOMY_SYSTEM_PROMPT,
    userText,
    responseSchema: KnowledgeDynamicTaxonomyGeminiSchema,
    temperature: 0.35,
    maxOutputTokens: 2048,
    timeoutMs: 55_000,
  });

  return data;
}

/**
 * After AI derivatives are saved: classify into per-user DB taxonomy, link
 * the item, and refresh `ai_tags` on `knowledge_items` for the sidebar.
 */
export async function runKnowledgeGeminiTaxonomyForItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
): Promise<void> {
  if (!shouldRunKnowledgeGeminiTaxonomy()) return;

  const { data: row, error: rowErr } = await supabase
    .from("knowledge_items")
    .select("id, user_id, title, content_type, ai_tldr, ai_summary, raw_content")
    .eq("id", itemId)
    .maybeSingle();
  if (rowErr || !row) return;
  if ((row as { user_id: string }).user_id !== userId) return;

  const r = row as {
    title: string;
    content_type: string;
    ai_tldr: string | null;
    ai_summary: string | null;
    raw_content: string | null;
  };

  const excerpt =
    [r.ai_tldr, r.ai_summary, r.raw_content].find((s) => s && String(s).trim()) ?? "";
  const excerptTrim = String(excerpt).trim().slice(0, MAX_EXCERPT);
  if (!excerptTrim) {
    return;
  }

  const { categories, tags } = await loadTaxonomySnapshot(supabase, userId);
  const allowedTagIds = new Set(tags.map((t) => t.id));

  let parsed: DynamicTaxonomyResponse;
  try {
    const raw = await callGeminiClassify({
      userId,
      itemId,
      title: r.title || "Untitled",
      contentType: r.content_type || "note",
      excerpt: excerptTrim,
      categories,
      tags,
    });
    const checked = DynamicTaxonomyResponseZ.safeParse(raw);
    if (!checked.success) {
      console.error("[knowledge-gemini-taxonomy] zod:", checked.error.flatten());
      await fallbackLegacyTags(supabase, userId, itemId, r.title, excerptTrim);
      return;
    }
    parsed = checked.data;
  } catch (e) {
    console.error("[knowledge-gemini-taxonomy] classify failed:", e);
    await fallbackLegacyTags(supabase, userId, itemId, r.title, excerptTrim);
    return;
  }

  let categoryId: string | null = null;
  const primaryId = parsed.primaryCategoryId?.trim() ?? "";
  if (primaryId && isUuid(primaryId)) {
    const exists = categories.some((c) => c.id === primaryId);
    if (exists) categoryId = primaryId;
  }

  if (!categoryId) {
    const hasNewHint =
      Boolean(parsed.newCategoryName?.trim()) ||
      Boolean(parsed.primaryCategoryNameIfNew?.trim()) ||
      Boolean(parsed.newCategorySlugHint?.trim());

    if (!hasNewHint && categories.length > 0) {
      categoryId = categories[0].id;
    } else {
      const name =
        (parsed.newCategoryName?.trim() ||
          parsed.primaryCategoryNameIfNew?.trim() ||
          r.title ||
          "General")
          .slice(0, 80);
      const desc =
        parsed.newCategoryDescription?.trim() ||
        parsed.rationaleBrief?.trim() ||
        null;
      const slug = await ensureUniqueCategorySlug(
        supabase,
        userId,
        parsed.newCategorySlugHint || name,
      );
      const sortOrder = await nextCategorySortOrder(supabase, userId);
      const { data: inserted, error: insErr } = await supabase
        .from("knowledge_tag_categories")
        .insert({
          user_id: userId,
          name,
          slug,
          description: desc,
          accent: "violet",
          sort_order: sortOrder,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        console.error("[knowledge-gemini-taxonomy] category insert failed:", insErr);
        await fallbackLegacyTags(supabase, userId, itemId, r.title, excerptTrim);
        return;
      }
      categoryId = (inserted as { id: string }).id;
    }
  }

  const resolvedTagIds: string[] = [];
  for (const id of parsed.tagIds ?? []) {
    const tid = id?.trim();
    if (!tid || !isUuid(tid)) continue;
    if (!allowedTagIds.has(tid)) continue;
    resolvedTagIds.push(tid);
  }

  for (const nt of parsed.newTags ?? []) {
    const nm = nt.name?.trim();
    if (!nm) continue;
    const slug = await ensureUniqueTagSlug(supabase, userId, nt.slugHint || nm);
    const { data: tagIns, error: tagErr } = await supabase
      .from("knowledge_tags")
      .insert({
        user_id: userId,
        name: nm.slice(0, 120),
        slug,
        description: null,
        parent_id: null,
        category_id: categoryId,
        aliases: [],
        type: "topic",
      })
      .select("id")
      .single();
    if (tagErr || !tagIns) {
      console.warn("[knowledge-gemini-taxonomy] tag insert skipped:", tagErr);
      continue;
    }
    const newId = (tagIns as { id: string }).id;
    resolvedTagIds.push(newId);
    allowedTagIds.add(newId);
  }

  const dedup = [...new Set(resolvedTagIds)];

  if (dedup.length === 0 && categoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    const nm = cat?.name ?? parsed.newCategoryName?.trim() ?? "Topic";
    const slug = await ensureUniqueTagSlug(supabase, userId, nm);
    const { data: tagIns, error: tagErr } = await supabase
      .from("knowledge_tags")
      .insert({
        user_id: userId,
        name: nm.slice(0, 120),
        slug,
        description: null,
        parent_id: null,
        category_id: categoryId,
        aliases: [],
        type: "topic",
      })
      .select("id")
      .single();
    if (!tagErr && tagIns) {
      dedup.push((tagIns as { id: string }).id);
    }
  }

  if (dedup.length === 0) {
    await fallbackLegacyTags(supabase, userId, itemId, r.title, excerptTrim);
    return;
  }

  await supabase.from("knowledge_item_tags").delete().eq("knowledge_item_id", itemId).eq("source", "ai");

  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7));
  const rows = dedup.map((tag_id) => ({
    knowledge_item_id: itemId,
    tag_id,
    user_id: userId,
    confidence: parsed.needsReview ? Math.min(confidence, 0.54) : confidence,
    source: "ai" as const,
  }));

  const { error: joinErr } = await supabase.from("knowledge_item_tags").insert(rows);
  if (joinErr) {
    console.error("[knowledge-gemini-taxonomy] join insert failed:", joinErr);
    await fallbackLegacyTags(supabase, userId, itemId, r.title, excerptTrim);
    return;
  }

  const { data: tagNames, error: nameErr } = await supabase
    .from("knowledge_tags")
    .select("name")
    .in("id", dedup)
    .eq("user_id", userId);
  if (nameErr) {
    console.error("[knowledge-gemini-taxonomy] tag name fetch failed:", nameErr);
    return;
  }
  const names = [...new Set((tagNames ?? []).map((t: { name: string }) => t.name).filter(Boolean))];
  if (names.length) {
    await supabase
      .from("knowledge_items")
      .update({ ai_tags: names, date_modified: new Date().toISOString() })
      .eq("id", itemId)
      .eq("user_id", userId);
  }
}

async function fallbackLegacyTags(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  title: string,
  excerpt: string,
): Promise<void> {
  if (!getGeminiServerApiKey()) return;
  try {
    const tags = await suggestTags(excerpt, title, {}).catch(() => [] as string[]);
    if (!tags.length) return;
    await supabase
      .from("knowledge_items")
      .update({ ai_tags: tags, date_modified: new Date().toISOString() })
      .eq("id", itemId)
      .eq("user_id", userId);
  } catch (e) {
    console.error("[knowledge-gemini-taxonomy] legacy suggestTags fallback failed:", e);
  }
}
