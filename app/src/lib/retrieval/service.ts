import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  getKnowledgeConnectionsForUser,
  getKnowledgeItems,
  getSmartCollections,
} from "@/lib/knowledge/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { KnowledgeConnection, KnowledgeItem, SmartCollection } from "@/types/knowledge";
import type { LifeAgentPermission } from "@/types/life-agent";
import { embedRetrievalQueryText } from "@/lib/retrieval/embeddings";
import {
  buildKeywordRetrievalResults,
  connectionScore,
  hybridScore,
  mergeRetrievalResults,
  recencyScore,
} from "@/lib/retrieval/rank";
import {
  parseRetrievalSourceDomains,
  parseSessionGrantedDomains,
  resolveAskKbRetrievalScope,
  sourceChipsForScope,
} from "@/lib/retrieval/scope";
import type {
  RetrievalMode,
  RetrievalResult,
  RetrievalRun,
  RetrievalScope,
  RetrievalSourceDomain,
} from "@/lib/retrieval/types";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type MatchRow = {
  id: string;
  source_domain: string;
  source_table: string;
  source_id: string;
  knowledge_item_id: string | null;
  document_kind: string;
  chunk_index: number;
  title: string | null;
  body_preview: string | null;
  source_url: string | null;
  source_metadata: Record<string, unknown> | null;
  page_number: number | null;
  section_path: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  similarity: number;
};

export type AskKbRetrievalInput = {
  supabase: ServerSupabaseClient;
  userId: string;
  query: string;
  mode?: RetrievalMode;
  limit?: number;
  sourceDomains?: RetrievalSourceDomain[];
  sessionGrantedDomains?: unknown;
  knowledgeItemIds?: string[];
  referenceDateIso?: string;
  persistRun?: boolean;
  items?: KnowledgeItem[];
  smartCollections?: SmartCollection[];
  connections?: KnowledgeConnection[];
};

function normalizeMode(value: unknown): RetrievalMode {
  return value === "semantic" ||
    value === "keyword" ||
    value === "recent" ||
    value === "hybrid"
    ? value
    : "hybrid";
}

export function parseRetrievalMode(value: unknown): RetrievalMode {
  return normalizeMode(value);
}

function clampLimit(value: unknown): number {
  const n = Number(value ?? 12);
  if (!Number.isFinite(n)) return 12;
  return Math.min(Math.max(Math.round(n), 1), 30);
}

async function fetchPermissionRows(
  supabase: ServerSupabaseClient,
  userId: string,
  warnings: string[],
): Promise<LifeAgentPermission[]> {
  const { data, error } = await supabase
    .from("life_agent_permissions")
    .select("id,user_id,domain,access_level,created_at,updated_at")
    .eq("user_id", userId);
  if (error) {
    warnings.push(`permission_scope_unavailable:${error.message}`);
    return [];
  }
  return (data ?? []) as LifeAgentPermission[];
}

function safeReferenceDate(referenceDateIso?: string): Date {
  const d = referenceDateIso ? new Date(referenceDateIso) : new Date();
  return Number.isFinite(d.getTime()) ? d : new Date();
}

function semanticRowsToResults(params: {
  rows: MatchRow[];
  keywordResults: RetrievalResult[];
  itemsById: Map<string, KnowledgeItem>;
  connections: KnowledgeConnection[];
  referenceDate: Date;
}): RetrievalResult[] {
  const keywordByItemId = new Map(
    params.keywordResults
      .filter((result) => result.knowledgeItemId)
      .map((result) => [result.knowledgeItemId as string, result]),
  );

  return params.rows.map((row, index) => {
    const item =
      row.knowledge_item_id ? params.itemsById.get(row.knowledge_item_id) : undefined;
    const keyword = row.knowledge_item_id
      ? keywordByItemId.get(row.knowledge_item_id)
      : undefined;
    const updatedAt = row.updated_at ?? item?.dateModified ?? item?.dateAdded ?? null;
    const scores = hybridScore({
      semanticScore: row.similarity,
      metadataScore: keyword ? keyword.scores.metadata * 100 : 0,
      recencyScore: recencyScore(updatedAt, params.referenceDate),
      connectionScore: connectionScore(row.knowledge_item_id, params.connections),
    });
    const semanticPct = Math.round(Math.max(0, Math.min(1, row.similarity)) * 100);
    const whyMatched = [
      `Semantic similarity ${semanticPct}%.`,
      ...(keyword?.whyMatched ?? []),
    ].slice(0, 4);

    return {
      id: `semantic:${row.id}:${index}`,
      retrievalDocumentId: row.id,
      knowledgeItemId: row.knowledge_item_id,
      sourceDomain: row.source_domain as RetrievalSourceDomain,
      sourceTable: row.source_table,
      sourceId: row.source_id,
      documentKind: row.document_kind,
      chunkIndex: row.chunk_index,
      title: row.title ?? item?.title ?? "Untitled source",
      snippet: row.body_preview || keyword?.snippet || "Retrieved indexed evidence.",
      bodyPreview: row.body_preview ?? "",
      sourceUrl: row.source_url ?? item?.sourceUrl ?? null,
      sourceMetadata: row.source_metadata ?? {},
      pageNumber: row.page_number,
      sectionPath: row.section_path,
      tags: row.tags ?? [],
      scores,
      whyMatched,
      createdAt: row.created_at ?? item?.dateAdded ?? null,
      updatedAt,
    };
  });
}

function assignCitationIds(results: RetrievalResult[]): RetrievalResult[] {
  return results.map((result, index) => ({
    ...result,
    id: `R${index + 1}`,
  }));
}

async function createRetrievalRun(params: {
  supabase: ServerSupabaseClient;
  userId: string;
  query: string;
  mode: RetrievalMode;
  scope: RetrievalScope;
  warnings: string[];
}): Promise<string | null> {
  const { data, error } = await params.supabase
    .from("os_retrieval_runs")
    .insert({
      user_id: params.userId,
      query: params.query,
      mode: params.mode,
      scope: params.scope,
      source_domains: params.scope.sourceDomains,
      warnings: params.warnings,
    })
    .select("id")
    .single();
  if (error || !data) {
    params.warnings.push(`retrieval_run_not_persisted:${error?.message ?? "unknown"}`);
    return null;
  }
  return (data as { id: string }).id;
}

async function updateRetrievalRunWarnings(params: {
  supabase: ServerSupabaseClient;
  userId: string;
  runId: string | null;
  warnings: string[];
}) {
  if (!params.runId) return;
  await params.supabase
    .from("os_retrieval_runs")
    .update({ warnings: params.warnings })
    .eq("id", params.runId)
    .eq("user_id", params.userId);
}

async function persistRunResults(params: {
  supabase: ServerSupabaseClient;
  userId: string;
  runId: string | null;
  results: RetrievalResult[];
}) {
  if (!params.runId || params.results.length === 0) return;
  const rows = params.results.map((result, index) => ({
    user_id: params.userId,
    run_id: params.runId,
    retrieval_document_id: result.retrievalDocumentId,
    rank: index + 1,
    combined_score: result.scores.combined,
    semantic_score: result.scores.semantic,
    metadata_score: result.scores.metadata,
    recency_score: result.scores.recency,
    connection_score: result.scores.connection,
    snippet: result.snippet,
    why: result.whyMatched,
    result_metadata: { result },
  }));
  await params.supabase.from("os_retrieval_run_results").insert(rows);
}

export async function runAskKbRetrieval(input: AskKbRetrievalInput): Promise<RetrievalRun> {
  const warnings: string[] = [];
  const query = input.query.trim();
  const mode = normalizeMode(input.mode);
  const limit = clampLimit(input.limit);
  const referenceDate = safeReferenceDate(input.referenceDateIso);

  const permissionRows = await fetchPermissionRows(input.supabase, input.userId, warnings);
  const requestedSourceDomains = input.sourceDomains ?? [];
  const sessionGrantedDomains = parseSessionGrantedDomains(input.sessionGrantedDomains);
  const scope = resolveAskKbRetrievalScope({
    userId: input.userId,
    permissionRows,
    requestedSourceDomains,
    sessionGrantedDomains,
  });
  if (scope.excludedSourceDomains.length > 0) {
    warnings.push(
      `source_domains_excluded:${scope.excludedSourceDomains.join(",")}`,
    );
  }

  const runId = input.persistRun
    ? await createRetrievalRun({
        supabase: input.supabase,
        userId: input.userId,
        query,
        mode,
        scope,
        warnings,
      })
    : null;

  const [items, smartCollections, connections] = await Promise.all([
    input.items ? Promise.resolve(input.items) : getKnowledgeItems(input.userId),
    input.smartCollections
      ? Promise.resolve(input.smartCollections)
      : getSmartCollections(input.userId),
    input.connections
      ? Promise.resolve(input.connections)
      : getKnowledgeConnectionsForUser(input.userId),
  ]);
  const itemsById = new Map(items.map((item) => [item.id, item]));

  const scopedKnowledgeItems =
    input.knowledgeItemIds && input.knowledgeItemIds.length > 0
      ? items.filter((item) => input.knowledgeItemIds?.includes(item.id))
      : items;
  const canUseKnowledgeKeywordFallback = scope.sourceDomains.includes("knowledge");
  const keywordResults = canUseKnowledgeKeywordFallback
    ? buildKeywordRetrievalResults({
        query,
        items: scopedKnowledgeItems,
        smartCollections,
        connections,
        limit: Math.max(limit, 24),
        referenceDate,
      })
    : [];
  if (!canUseKnowledgeKeywordFallback && mode === "keyword") {
    warnings.push("keyword_retrieval_scope_excludes_knowledge");
  }

  let semanticResults: RetrievalResult[] = [];
  const apiKey = getGeminiServerApiKey();
  if (mode !== "keyword") {
    if (!apiKey) {
      warnings.push("semantic_retrieval_unavailable:missing_gemini_api_key");
    } else {
      try {
        const queryEmbedding = await embedRetrievalQueryText({ apiKey, text: query });
        const { data, error } = await input.supabase.rpc(
          "match_os_retrieval_documents",
          {
            query_embedding: queryEmbedding as unknown as string,
            match_count: Math.max(limit * 2, 24),
            match_threshold: 0.15,
            filter_source_domains: scope.sourceDomains,
            filter_knowledge_item_ids: input.knowledgeItemIds ?? null,
          },
        );
        if (error) throw error;
        semanticResults = semanticRowsToResults({
          rows: (data ?? []) as MatchRow[],
          keywordResults,
          itemsById,
          connections,
          referenceDate,
        });
        if (semanticResults.length === 0) {
          warnings.push("semantic_index_empty_or_no_matches");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`semantic_retrieval_unavailable:${message.slice(0, 180)}`);
      }
    }
  }

  const merged = assignCitationIds(
    mergeRetrievalResults({
      semanticResults,
      keywordResults,
      mode,
      limit,
    }),
  );

  await persistRunResults({
    supabase: input.supabase,
    userId: input.userId,
    runId,
    results: merged,
  });
  await updateRetrievalRunWarnings({
    supabase: input.supabase,
    userId: input.userId,
    runId,
    warnings,
  });

  return {
    id: runId,
    query,
    mode,
    scope,
    sourceChips: sourceChipsForScope(scope),
    results: merged,
    warnings,
  };
}

export function parseRetrieveRequestBody(body: unknown): {
  query: string;
  mode: RetrievalMode;
  limit: number;
  sourceDomains: RetrievalSourceDomain[];
  sessionGrantedDomains: unknown;
  knowledgeItemIds: string[];
  referenceDateIso?: string;
} {
  const obj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  return {
    query: typeof obj.query === "string" ? obj.query.trim() : "",
    mode: normalizeMode(obj.mode),
    limit: clampLimit(obj.limit),
    sourceDomains: parseRetrievalSourceDomains(obj.sourceDomains),
    sessionGrantedDomains: obj.sessionGrantedDomains,
    knowledgeItemIds: Array.isArray(obj.knowledgeItemIds)
      ? obj.knowledgeItemIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [],
    referenceDateIso:
      typeof obj.referenceDateIso === "string" ? obj.referenceDateIso : undefined,
  };
}

export async function loadRetrievalRunEvidence(params: {
  supabase: ServerSupabaseClient;
  userId: string;
  retrievalRunId: string;
  limit?: number;
}): Promise<{ results: RetrievalResult[]; query: string | null; warnings: string[] }> {
  const { data: runData } = await params.supabase
    .from("os_retrieval_runs")
    .select("query,warnings")
    .eq("id", params.retrievalRunId)
    .eq("user_id", params.userId)
    .maybeSingle();
  const { data, error } = await params.supabase
    .from("os_retrieval_run_results")
    .select("rank,result_metadata")
    .eq("run_id", params.retrievalRunId)
    .eq("user_id", params.userId)
    .order("rank", { ascending: true })
    .limit(params.limit ?? 16);
  if (error) {
    return {
      results: [],
      query: (runData as { query?: string } | null)?.query ?? null,
      warnings: [`retrieval_evidence_unavailable:${error.message}`],
    };
  }

  const results = (data ?? [])
    .map((row) => {
      const meta = (row as { result_metadata?: unknown }).result_metadata;
      if (!meta || typeof meta !== "object") return null;
      const result = (meta as { result?: unknown }).result;
      return result && typeof result === "object" ? (result as RetrievalResult) : null;
    })
    .filter((result): result is RetrievalResult => Boolean(result));

  return {
    results,
    query: (runData as { query?: string } | null)?.query ?? null,
    warnings: (runData as { warnings?: string[] } | null)?.warnings ?? [],
  };
}
