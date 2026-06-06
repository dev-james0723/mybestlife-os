import { NextResponse } from "next/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  requireKnowledgeUser,
  unauthorizedPayload,
} from "@/lib/knowledge/auth-guard";
import { getKnowledgeItems } from "@/lib/knowledge/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildDocOracleChunkRetrievalDocuments,
  buildGenericRetrievalDocuments,
  buildKnowledgeRetrievalDocuments,
  buildLifeAgentContextRetrievalDocuments,
  type DocOracleChunkRow,
} from "@/lib/retrieval/documents";
import {
  composeRetrievalEmbeddingText,
  embedRetrievalDocumentText,
} from "@/lib/retrieval/embeddings";
import { fetchLifeAgentContextSources } from "@/lib/life-agent/context-fetchers";
import {
  canReadDomain,
  resolveLifeAgentPermissions,
} from "@/lib/life-agent/permission-policy";
import {
  LIFE_AGENT_PERMISSION_DOMAINS,
  type LifeAgentPermission,
  type LifeAgentPermissionDomain,
} from "@/types/life-agent";
import type {
  RetrievalDocumentInput,
  RetrievalSourceDomain,
} from "@/lib/retrieval/types";

export const runtime = "nodejs";

const MAX_ITEMS = 25;
const MAX_DOCS = 160;
const MAX_CROSS_OS_ROWS = 24;

function parseBody(body: unknown): {
  itemIds: string[];
  limit: number;
  includeDocOracle: boolean;
  includeCrossOs: boolean;
  dryRun: boolean;
} {
  const obj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const itemIds = Array.isArray(obj.itemIds)
    ? obj.itemIds.filter((id): id is string => typeof id === "string")
    : [];
  const limitRaw = Number(obj.limit ?? MAX_ITEMS);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.round(limitRaw), 1), MAX_ITEMS)
    : MAX_ITEMS;
  return {
    itemIds,
    limit,
    includeDocOracle: obj.includeDocOracle !== false,
    includeCrossOs: obj.includeCrossOs !== false,
    dryRun: obj.dryRun === true,
  };
}

function valueText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function localizedText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return valueText(record.en) ?? valueText(Object.values(record)[0]);
}

function arrayStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function isMissingTableError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const message = String(e.message ?? "").toLowerCase();
  return message.includes("does not exist") || message.includes("could not find the table");
}

async function loadPermissionRows(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
}): Promise<LifeAgentPermission[]> {
  const { data, error } = await params.supabase
    .from("life_agent_permissions")
    .select("id,user_id,domain,access_level,created_at,updated_at")
    .eq("user_id", params.userId);
  if (error) return [];
  return (data ?? []) as LifeAgentPermission[];
}

async function loadOptionalRows(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  table: string;
  userId: string;
  orderBy?: string;
  limit?: number;
  warnings: string[];
}): Promise<Record<string, unknown>[]> {
  let query = params.supabase
    .from(params.table)
    .select("*")
    .eq("user_id", params.userId)
    .limit(params.limit ?? MAX_CROSS_OS_ROWS);
  if (params.orderBy) {
    query = query.order(params.orderBy, { ascending: false });
  }
  const { data, error } = await query;
  if (error) {
    if (!isMissingTableError(error)) {
      params.warnings.push(`${params.table}_unavailable:${error.message}`);
    }
    return [];
  }
  return (data ?? []) as Record<string, unknown>[];
}

async function loadDocOracleChunks(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
  itemIds: string[];
}): Promise<{ chunksByItemId: Map<string, DocOracleChunkRow[]>; warning?: string }> {
  const chunksByItemId = new Map<string, DocOracleChunkRow[]>();
  if (params.itemIds.length === 0) return { chunksByItemId };

  const { data, error } = await params.supabase
    .from("document_chunks")
    .select(
      "id,document_id,analysis_id,chunk_text,chunk_type,page_number,section_path,keywords,has_visual,related_visual_asset_ids,created_at,updated_at",
    )
    .eq("user_id", params.userId)
    .in("document_id", params.itemIds)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) {
    return {
      chunksByItemId,
      warning: `doc_oracle_chunks_unavailable:${error.message}`,
    };
  }

  for (const row of (data ?? []) as DocOracleChunkRow[]) {
    const list = chunksByItemId.get(row.document_id) ?? [];
    list.push(row);
    chunksByItemId.set(row.document_id, list);
  }

  return { chunksByItemId };
}

async function buildCrossOsDocuments(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
  warnings: string[];
}): Promise<RetrievalDocumentInput[]> {
  const permissionRows = await loadPermissionRows({
    supabase: params.supabase,
    userId: params.userId,
  });
  const permissions = resolveLifeAgentPermissions(params.userId, permissionRows, []);
  const readableLifeAgentDomains = LIFE_AGENT_PERMISSION_DOMAINS.filter((domain) =>
    canReadDomain(permissions, domain),
  );
  const sourceDomains = new Set<RetrievalSourceDomain>(readableLifeAgentDomains);
  const lifeSources = await fetchLifeAgentContextSources({
    supabase: params.supabase,
    userId: params.userId,
    permissions,
    intent: "general_chat",
    mode: "companion",
    domainOverride: new Set<LifeAgentPermissionDomain>(readableLifeAgentDomains),
  });

  const docs = buildLifeAgentContextRetrievalDocuments({
    userId: params.userId,
    sources: lifeSources,
    sourceDomains,
  });

  if (sourceDomains.has("brain_graph")) {
    const quoteRows = await loadOptionalRows({
      supabase: params.supabase,
      table: "quotes",
      userId: params.userId,
      orderBy: "created_at",
      warnings: params.warnings,
    });
    for (const row of quoteRows) {
      const sourceId = valueText(row.id);
      const quoteText = valueText(row.quote_text);
      if (!sourceId || !quoteText) continue;
      docs.push(
        ...buildGenericRetrievalDocuments({
          userId: params.userId,
          sourceDomain: "quote_library",
          sourceTable: "quotes",
          sourceId,
          documentKind: "quote_summary",
          title: valueText(row.source_author) ?? quoteText.slice(0, 80),
          body: [
            `Quote: ${quoteText}`,
            valueText(row.source_author) ? `Author: ${valueText(row.source_author)}` : null,
            valueText(row.source_context) ? `Context: ${valueText(row.source_context)}` : null,
            valueText(row.personal_note) ? `Personal note: ${valueText(row.personal_note)}` : null,
            valueText(row.category) ? `Category: ${valueText(row.category)}` : null,
            valueText(row.emotion_tone) ? `Tone: ${valueText(row.emotion_tone)}` : null,
          ]
            .filter((line): line is string => Boolean(line))
            .join("\n"),
          sourceUrl: valueText(row.source_url),
          sourceMetadata: {
            createdAt: valueText(row.created_at),
            updatedAt: valueText(row.updated_at),
            sourceType: valueText(row.source_type),
            sourceModule: valueText(row.source_module),
            linkedGoalId: valueText(row.linked_goal_id),
            isFavorite: row.is_favorite === true,
          },
          tags: arrayStrings(row.tags),
        }),
      );
    }
  }

  if (sourceDomains.has("assets") || sourceDomains.has("documents")) {
    const softwareRows = await loadOptionalRows({
      supabase: params.supabase,
      table: "software_vault",
      userId: params.userId,
      orderBy: "updated_at",
      warnings: params.warnings,
    });
    for (const row of softwareRows) {
      const sourceId = valueText(row.id);
      const title = valueText(row.app_name);
      if (!sourceId || !title) continue;
      docs.push(
        ...buildGenericRetrievalDocuments({
          userId: params.userId,
          sourceDomain: "software_vault",
          sourceTable: "software_vault",
          sourceId,
          documentKind: "software_vault_summary",
          title,
          body: [
            `Tool: ${title}`,
            valueText(row.summary) ? `Summary: ${valueText(row.summary)}` : null,
            valueText(row.category) ? `Category: ${valueText(row.category)}` : null,
            valueText(row.platforms) ? `Platforms: ${valueText(row.platforms)}` : null,
            valueText(row.use_cases) ? `Use cases: ${valueText(row.use_cases)}` : null,
            valueText(row.why_i_use_it) ? `Why I use it: ${valueText(row.why_i_use_it)}` : null,
            valueText(row.best_feature) ? `Best feature: ${valueText(row.best_feature)}` : null,
            valueText(row.biggest_downside)
              ? `Biggest downside: ${valueText(row.biggest_downside)}`
              : null,
            valueText(row.default_tool_for)
              ? `Default tool for: ${valueText(row.default_tool_for)}`
              : null,
            valueText(row.tags) ? `Tags: ${valueText(row.tags)}` : null,
          ]
            .filter((line): line is string => Boolean(line))
            .join("\n"),
          sourceUrl: valueText(row.website_url),
          sourceMetadata: {
            createdAt: valueText(row.created_at),
            updatedAt: valueText(row.updated_at),
            status: valueText(row.status),
            priority: valueText(row.priority),
            costType: valueText(row.cost_type),
            replaces: valueText(row.replaces),
          },
          tags: valueText(row.tags)?.split(",") ?? [],
        }),
      );
    }
  }

  const promptRows = await loadOptionalRows({
    supabase: params.supabase,
    table: "ai_user_prompts",
    userId: params.userId,
    orderBy: "updated_at",
    warnings: params.warnings,
  });
  for (const row of promptRows) {
    const sourceId = valueText(row.id);
    const title = localizedText(row.title_i18n) ?? valueText(row.slug);
    if (!sourceId || !title) continue;
    docs.push(
      ...buildGenericRetrievalDocuments({
        userId: params.userId,
        sourceDomain: "ai_knowledge",
        sourceTable: "ai_user_prompts",
        sourceId,
        documentKind: "ai_user_prompt",
        title,
        body: [
          `Prompt: ${title}`,
          localizedText(row.description_i18n)
            ? `Description: ${localizedText(row.description_i18n)}`
            : null,
          valueText(row.body) ? `Body:\n${valueText(row.body)}` : null,
          valueText(row.top_category) ? `Category: ${valueText(row.top_category)}` : null,
          valueText(row.sub_category_slug)
            ? `Subcategory: ${valueText(row.sub_category_slug)}`
            : null,
          arrayStrings(row.tags).length ? `Tags: ${arrayStrings(row.tags).join(", ")}` : null,
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
        sourceMetadata: {
          createdAt: valueText(row.created_at),
          updatedAt: valueText(row.updated_at),
          slug: valueText(row.slug),
          isFavorite: row.is_favorite === true,
          usageCount: row.usage_count,
        },
        tags: arrayStrings(row.tags),
      }),
    );
  }

  return docs;
}

async function upsertRetrievalDocument(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  doc: RetrievalDocumentInput;
  apiKey: string | null;
}): Promise<{ ok: boolean; sourceId: string; documentKind: string; error?: string }> {
  try {
    let embedding: string | null = null;
    if (params.apiKey) {
      const values = await embedRetrievalDocumentText({
        apiKey: params.apiKey,
        title: params.doc.title,
        text: composeRetrievalEmbeddingText({
          title: params.doc.title,
          body: params.doc.body,
          tags: params.doc.tags,
        }),
      });
      embedding = values as unknown as string;
    }

    const row: Record<string, unknown> = {
      ...params.doc,
      embedding_model: "text-embedding-004",
    };
    delete row.embedding;
    if (embedding) row.embedding = embedding;

    const { error } = await params.supabase
      .from("os_retrieval_documents")
      .upsert(
        row,
        {
          onConflict:
            "user_id,source_domain,source_id,document_kind,chunk_index",
        },
      );
    if (error) throw error;
    return {
      ok: true,
      sourceId: params.doc.source_id,
      documentKind: params.doc.document_kind,
    };
  } catch (error) {
    return {
      ok: false,
      sourceId: params.doc.source_id,
      documentKind: params.doc.document_kind,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function POST(request: Request) {
  const auth = await requireKnowledgeUser();
  if (!auth.ok) {
    return NextResponse.json(unauthorizedPayload(auth), { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parseBody(json);
  const supabase = await createServerSupabaseClient();
  const warnings: string[] = [];
  const apiKey = getGeminiServerApiKey() ?? null;
  if (!apiKey) {
    warnings.push("embeddings_not_generated:missing_gemini_api_key");
  }

  const allItems = await getKnowledgeItems(auth.user.id);
  const items = (body.itemIds.length > 0
    ? allItems.filter((item) => body.itemIds.includes(item.id))
    : allItems
  ).slice(0, body.limit);
  const itemIds = items.map((item) => item.id);

  const chunks = body.includeDocOracle
    ? await loadDocOracleChunks({ supabase, userId: auth.user.id, itemIds })
    : { chunksByItemId: new Map<string, DocOracleChunkRow[]>() };
  if (chunks.warning) warnings.push(chunks.warning);

  const knowledgeDocs = items
    .flatMap((item) => [
      ...buildKnowledgeRetrievalDocuments({ userId: auth.user.id, item }),
      ...buildDocOracleChunkRetrievalDocuments({
        userId: auth.user.id,
        item,
        chunks: chunks.chunksByItemId.get(item.id) ?? [],
      }),
    ])
    .slice(0, MAX_DOCS);
  const crossOsDocs = body.includeCrossOs
    ? await buildCrossOsDocuments({ supabase, userId: auth.user.id, warnings })
    : [];
  const docs = [
    ...knowledgeDocs.slice(0, Math.floor(MAX_DOCS * 0.7)),
    ...crossOsDocs.slice(0, Math.ceil(MAX_DOCS * 0.3)),
  ].slice(0, MAX_DOCS);

  if (body.dryRun) {
    return NextResponse.json({
      dryRun: true,
      itemsConsidered: items.length,
      knowledgeDocumentsPrepared: knowledgeDocs.length,
      crossOsDocumentsPrepared: crossOsDocs.length,
      documentsPrepared: docs.length,
      warnings,
    });
  }

  const results = [];
  for (const doc of docs) {
    results.push(await upsertRetrievalDocument({ supabase, doc, apiKey }));
  }

  const succeeded = results.filter((r) => r.ok).length;
  return NextResponse.json({
    itemsConsidered: items.length,
    documentsPrepared: docs.length,
    processed: results.length,
    succeeded,
    failed: results.length - succeeded,
    warnings,
    results: results.slice(0, 80),
  });
}
