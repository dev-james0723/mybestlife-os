import { createHash } from "node:crypto";
import type { LifeAgentContextSources } from "@/lib/life-agent/context-types";
import type { KnowledgeItem } from "@/types/knowledge";
import type {
  RetrievalDocumentInput,
  RetrievalSourceDomain,
} from "@/lib/retrieval/types";

const DEFAULT_MAX_CHARS = 3200;
const DEFAULT_OVERLAP_CHARS = 240;
const PREVIEW_CHARS = 520;

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanBody(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function uniq(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function stripUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

export function bodyPreview(body: string, maxChars = PREVIEW_CHARS): string {
  const compact = compactWhitespace(body);
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars - 3).trimEnd()}...`;
}

export function stableContentHash(input: {
  sourceDomain: string;
  sourceId: string;
  documentKind: string;
  chunkIndex: number;
  body: string;
  metadata?: Record<string, unknown>;
}): string {
  const hash = createHash("sha256");
  hash.update(input.sourceDomain);
  hash.update("\0");
  hash.update(input.sourceId);
  hash.update("\0");
  hash.update(input.documentKind);
  hash.update("\0");
  hash.update(String(input.chunkIndex));
  hash.update("\0");
  hash.update(cleanBody(input.body));
  if (input.metadata) {
    hash.update("\0");
    hash.update(JSON.stringify(input.metadata, Object.keys(input.metadata).sort()));
  }
  return hash.digest("hex");
}

export function chunkText(
  value: string,
  options: { maxChars?: number; overlapChars?: number } = {},
): string[] {
  const text = cleanBody(value);
  if (!text) return [];

  const maxChars = Math.max(800, options.maxChars ?? DEFAULT_MAX_CHARS);
  const overlapChars = Math.max(0, Math.min(options.overlapChars ?? DEFAULT_OVERLAP_CHARS, 600));
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(text.length, start + maxChars);
    if (end < text.length) {
      const window = text.slice(start, end);
      const breakpoints = [
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("? "),
        window.lastIndexOf("! "),
        window.lastIndexOf(" "),
      ].filter((idx) => idx >= maxChars * 0.55);
      const best = Math.max(...breakpoints);
      if (best > 0) end = start + best + 1;
    }

    const chunk = cleanBody(text.slice(start, end));
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

function metadataForKnowledgeItem(item: KnowledgeItem): Record<string, unknown> {
  return stripUndefined({
    contentType: item.contentType,
    sourceType: item.sourceType,
    provider: item.provider,
    label: item.label,
    category: item.category,
    sourceDomain: item.sourceDomain,
    dateAdded: item.dateAdded,
    dateModified: item.dateModified,
    askEnabled: item.askEnabled,
    documentBrainStatus: item.documentBrainJob?.status,
  });
}

function makeKnowledgeDocument(params: {
  userId: string;
  item: KnowledgeItem;
  documentKind: string;
  chunkIndex: number;
  body: string;
  sourceId?: string;
  sourceTable?: string;
  pageNumber?: number | null;
  sectionPath?: string | null;
  sourceMetadata?: Record<string, unknown>;
}): RetrievalDocumentInput | null {
  const body = cleanBody(params.body);
  if (!body) return null;

  const metadata = {
    ...metadataForKnowledgeItem(params.item),
    ...(params.sourceMetadata ?? {}),
  };
  const sourceId = params.sourceId ?? params.item.id;

  return {
    user_id: params.userId,
    source_domain: params.documentKind.startsWith("doc_oracle")
      ? "doc_oracle"
      : "knowledge",
    source_table: params.sourceTable ?? "knowledge_items",
    source_id: sourceId,
    knowledge_item_id: params.item.id,
    document_kind: params.documentKind,
    chunk_index: params.chunkIndex,
    title: params.item.title,
    body,
    body_preview: bodyPreview(body),
    source_url: params.item.sourceUrl ?? null,
    source_metadata: metadata,
    page_number: params.pageNumber ?? null,
    section_path: params.sectionPath ?? null,
    tags: uniq([...params.item.aiTags, ...params.item.manualTags]),
    content_hash: stableContentHash({
      sourceDomain: params.documentKind.startsWith("doc_oracle")
        ? "doc_oracle"
        : "knowledge",
      sourceId,
      documentKind: params.documentKind,
      chunkIndex: params.chunkIndex,
      body,
      metadata,
    }),
    embedding_model: "text-embedding-004",
  };
}

export function buildKnowledgeRetrievalDocuments(params: {
  userId: string;
  item: KnowledgeItem;
}): RetrievalDocumentInput[] {
  const { userId, item } = params;
  const docs: RetrievalDocumentInput[] = [];

  const summaryParts: string[] = [];
  if (item.aiTldr) summaryParts.push(`TLDR:\n${item.aiTldr}`);
  if (item.aiSummary) summaryParts.push(`Summary:\n${item.aiSummary}`);
  if (item.aiContentOverview) summaryParts.push(`Overview:\n${item.aiContentOverview}`);
  if (item.aiKeyInsights.length) {
    summaryParts.push(`Key insights:\n${item.aiKeyInsights.map((x) => `- ${x}`).join("\n")}`);
  }
  if (item.aiKeyQuotes.length) {
    summaryParts.push(`Key quotes:\n${item.aiKeyQuotes.map((x) => `- ${x}`).join("\n")}`);
  }
  if (item.aiQuestionsAnswered.length) {
    summaryParts.push(
      `Questions answered:\n${item.aiQuestionsAnswered.map((x) => `- ${x}`).join("\n")}`,
    );
  }
  if (item.aiActionItems.length) {
    summaryParts.push(`Action items:\n${item.aiActionItems.map((x) => `- ${x}`).join("\n")}`);
  }

  const summaryDoc = makeKnowledgeDocument({
    userId,
    item,
    documentKind: "knowledge_summary",
    chunkIndex: 0,
    body: summaryParts.join("\n\n"),
  });
  if (summaryDoc) docs.push(summaryDoc);

  for (const [index, body] of chunkText(item.rawContent ?? "").entries()) {
    const doc = makeKnowledgeDocument({
      userId,
      item,
      documentKind: "knowledge_raw_content",
      chunkIndex: index,
      body,
    });
    if (doc) docs.push(doc);
  }

  for (const [index, body] of chunkText(item.youtubeTranscript ?? "").entries()) {
    const doc = makeKnowledgeDocument({
      userId,
      item,
      documentKind: "youtube_transcript",
      chunkIndex: index,
      body,
    });
    if (doc) docs.push(doc);
  }

  return docs;
}

export type DocOracleChunkRow = {
  id: string;
  document_id: string;
  analysis_id: string;
  chunk_text: string;
  chunk_type?: string | null;
  page_number?: number | null;
  section_path?: string | null;
  keywords?: unknown;
  has_visual?: boolean | null;
  related_visual_asset_ids?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniq(value.filter((x): x is string => typeof x === "string"));
}

export function buildDocOracleChunkRetrievalDocuments(params: {
  userId: string;
  item: KnowledgeItem;
  chunks: DocOracleChunkRow[];
}): RetrievalDocumentInput[] {
  return params.chunks
    .map((chunk, index) =>
      makeKnowledgeDocument({
        userId: params.userId,
        item: params.item,
        documentKind: "doc_oracle_chunk",
        chunkIndex: 0,
        sourceId: chunk.id,
        sourceTable: "document_chunks",
        body: chunk.chunk_text,
        pageNumber: chunk.page_number ?? null,
        sectionPath: chunk.section_path ?? null,
        sourceMetadata: {
          analysisId: chunk.analysis_id,
          documentId: chunk.document_id,
          chunkType: chunk.chunk_type ?? "text",
          hasVisual: Boolean(chunk.has_visual),
          relatedVisualAssetIds: jsonStringArray(chunk.related_visual_asset_ids),
          keywords: jsonStringArray(chunk.keywords),
          sourceChunkIndex: index,
          createdAt: chunk.created_at ?? null,
          updatedAt: chunk.updated_at ?? null,
        },
      }),
    )
    .filter((doc): doc is RetrievalDocumentInput => Boolean(doc));
}

export type GenericRetrievalDocumentSource = {
  userId: string;
  sourceDomain: RetrievalSourceDomain;
  sourceTable: string;
  sourceId: string;
  documentKind: string;
  title: string;
  body: string;
  sourceUrl?: string | null;
  sourceMetadata?: Record<string, unknown>;
  pageNumber?: number | null;
  sectionPath?: string | null;
  tags?: string[];
};

type RowLike = Record<string, unknown>;

function asRow(value: unknown): RowLike {
  return typeof value === "object" && value !== null ? (value as RowLike) : {};
}

function valueText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const text = value.map(valueText).filter(Boolean).join(", ");
    return text || null;
  }
  try {
    const text = JSON.stringify(value);
    return text.length > 900 ? `${text.slice(0, 897)}...` : text;
  } catch {
    return null;
  }
}

function fieldText(row: RowLike, key: string): string | null {
  return valueText(row[key]);
}

function firstFieldText(row: RowLike, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = fieldText(row, key);
    if (value) return value;
  }
  return fallback;
}

function rowTags(row: RowLike, keys: string[] = ["tags"]): string[] {
  const tags: string[] = [];
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      tags.push(...value.filter((entry): entry is string => typeof entry === "string"));
    } else if (typeof value === "string") {
      tags.push(...value.split(","));
    }
  }
  return uniq(tags);
}

function line(row: RowLike, label: string, key: string): string | null {
  const text = fieldText(row, key);
  return text ? `${label}: ${text}` : null;
}

function bodyFromFields(row: RowLike, fields: Array<[string, string]>): string {
  return fields
    .map(([label, key]) => line(row, label, key))
    .filter((entry): entry is string => Boolean(entry))
    .join("\n");
}

function dateMetadata(row: RowLike): Record<string, unknown> {
  return stripUndefined({
    createdAt: fieldText(row, "created_at"),
    updatedAt: fieldText(row, "updated_at"),
  });
}

export function buildGenericRetrievalDocuments(
  params: GenericRetrievalDocumentSource,
): RetrievalDocumentInput[] {
  const body = cleanBody(params.body);
  if (!body) return [];

  return chunkText(body, { maxChars: 2800, overlapChars: 180 }).map((chunk, chunkIndex) => {
    const metadata = {
      ...(params.sourceMetadata ?? {}),
      ...dateMetadata({
        created_at: params.sourceMetadata?.createdAt,
        updated_at: params.sourceMetadata?.updatedAt,
      }),
    };
    return {
      user_id: params.userId,
      source_domain: params.sourceDomain,
      source_table: params.sourceTable,
      source_id: params.sourceId,
      knowledge_item_id: null,
      document_kind: params.documentKind,
      chunk_index: chunkIndex,
      title: params.title,
      body: chunk,
      body_preview: bodyPreview(chunk),
      source_url: params.sourceUrl ?? null,
      source_metadata: metadata,
      page_number: params.pageNumber ?? null,
      section_path: params.sectionPath ?? null,
      tags: uniq(params.tags ?? []),
      content_hash: stableContentHash({
        sourceDomain: params.sourceDomain,
        sourceId: params.sourceId,
        documentKind: params.documentKind,
        chunkIndex,
        body: chunk,
        metadata,
      }),
      embedding_model: "text-embedding-004",
    };
  });
}

function addRowDocuments(params: {
  docs: RetrievalDocumentInput[];
  userId: string;
  rows: unknown[];
  sourceDomain: RetrievalSourceDomain;
  sourceTable: string;
  documentKind: string;
  titleKeys: string[];
  fields: Array<[string, string]>;
  tagsKeys?: string[];
  sourceUrlKey?: string;
}) {
  for (const raw of params.rows) {
    const row = asRow(raw);
    const sourceId = fieldText(row, "id");
    if (!sourceId) continue;
    const title = firstFieldText(row, params.titleKeys, "Untitled source");
    const body = bodyFromFields(row, params.fields);
    params.docs.push(
      ...buildGenericRetrievalDocuments({
        userId: params.userId,
        sourceDomain: params.sourceDomain,
        sourceTable: params.sourceTable,
        sourceId,
        documentKind: params.documentKind,
        title,
        body,
        sourceUrl: params.sourceUrlKey ? fieldText(row, params.sourceUrlKey) : null,
        sourceMetadata: {
          ...dateMetadata(row),
          status: fieldText(row, "status"),
          priority: fieldText(row, "priority"),
          category: fieldText(row, "category") ?? fieldText(row, "category_key"),
        },
        tags: rowTags(row, params.tagsKeys),
      }),
    );
  }
}

export function buildLifeAgentContextRetrievalDocuments(params: {
  userId: string;
  sources: LifeAgentContextSources;
  sourceDomains: Set<RetrievalSourceDomain>;
}): RetrievalDocumentInput[] {
  const docs: RetrievalDocumentInput[] = [];
  const wants = (domain: RetrievalSourceDomain) => params.sourceDomains.has(domain);

  if (wants("projects")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.projects,
      sourceDomain: "projects",
      sourceTable: "projects",
      documentKind: "project_summary",
      titleKeys: ["name"],
      fields: [
        ["Project", "name"],
        ["Description", "description"],
        ["Status", "status"],
        ["Priority", "priority"],
        ["Start date", "start_date"],
        ["End date", "end_date"],
        ["Tags", "tags"],
      ],
    });
  }

  if (wants("tasks")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.tasks,
      sourceDomain: "tasks",
      sourceTable: "tasks",
      documentKind: "task_summary",
      titleKeys: ["title"],
      fields: [
        ["Task", "title"],
        ["Description", "description"],
        ["Status", "status"],
        ["Priority", "priority"],
        ["Due date", "due_date"],
        ["Scheduled date", "scheduled_date"],
        ["Category", "category"],
        ["Source", "source"],
        ["Tags", "tags"],
      ],
      sourceUrlKey: "source_url",
    });
  }

  if (wants("goals")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.goals,
      sourceDomain: "goals",
      sourceTable: "goals",
      documentKind: "goal_summary",
      titleKeys: ["name"],
      fields: [
        ["Goal", "name"],
        ["Description", "description"],
        ["Status", "status"],
        ["Target date", "target_date"],
        ["Category", "category"],
      ],
    });
  }

  if (wants("habits")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.habits,
      sourceDomain: "habits",
      sourceTable: "habits",
      documentKind: "habit_summary",
      titleKeys: ["name"],
      fields: [
        ["Habit", "name"],
        ["Description", "description"],
        ["Type", "type"],
        ["Frequency", "frequency"],
        ["Time of day", "time_of_day"],
        ["Target value", "target_value"],
      ],
    });
  }

  if (wants("relationships")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.relationships,
      sourceDomain: "relationships",
      sourceTable: "relationships",
      documentKind: "relationship_summary",
      titleKeys: ["person_name"],
      fields: [
        ["Person", "person_name"],
        ["Category", "category"],
        ["Strength", "relationship_strength"],
        ["Last contact", "last_contact_date"],
        ["Last notes", "last_interaction_notes"],
        ["Next action", "next_action"],
        ["Commitments", "commitments_made"],
        ["Preferences", "preferences_and_details"],
        ["Notes", "general_notes"],
        ["Tags", "tags"],
      ],
      tagsKeys: ["tags"],
    });
  }

  if (wants("role_models")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.roleModels,
      sourceDomain: "role_models",
      sourceTable: "role_models",
      documentKind: "role_model_summary",
      titleKeys: ["name"],
      fields: [
        ["Role model", "name"],
        ["Admiration", "admiration_blurb"],
        ["Bio", "bio"],
        ["Legacy description", "description"],
        ["Category", "category"],
        ["Quotes", "quotes"],
        ["Key lessons", "key_lessons"],
        ["Notes", "notes"],
        ["Tags", "tags"],
      ],
    });
  }

  if (wants("assets")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.assets,
      sourceDomain: "assets",
      sourceTable: "assets",
      documentKind: "asset_summary",
      titleKeys: ["name"],
      fields: [
        ["Asset", "name"],
        ["Category", "category"],
        ["Category key", "category_key"],
        ["Location", "location"],
        ["Purchase date", "purchase_date"],
        ["Value", "value"],
        ["Current value", "current_value"],
        ["Notes", "notes"],
      ],
    });
  }

  if (wants("documents")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.documents,
      sourceDomain: "documents",
      sourceTable: "documents",
      documentKind: "document_summary",
      titleKeys: ["name"],
      fields: [
        ["Document", "name"],
        ["Type", "document_type"],
        ["Expiration date", "expiration_date"],
        ["Notes", "notes"],
        ["File URL", "file_url"],
      ],
      sourceUrlKey: "file_url",
    });
  }

  if (wants("notes")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.notes,
      sourceDomain: "notes",
      sourceTable: "notes",
      documentKind: "note_summary",
      titleKeys: ["title"],
      fields: [
        ["Note", "title"],
        ["Content", "content"],
        ["Category", "category"],
        ["Tags", "tags"],
      ],
    });
  }

  if (wants("journal")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.journalEntries,
      sourceDomain: "journal",
      sourceTable: "journal_entries",
      documentKind: "journal_summary",
      titleKeys: ["topic", "entryDate"],
      fields: [
        ["Topic", "topic"],
        ["Entry date", "entryDate"],
        ["Primary emotion", "primaryEmotion"],
        ["Self story", "selfStory"],
        ["Needs", "needs"],
        ["Next tiny step", "nextTinyStep"],
        ["Appreciation", "appreciation"],
      ],
    });
  }

  if (wants("bucket_list")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.bucketItems,
      sourceDomain: "bucket_list",
      sourceTable: "bucket_items",
      documentKind: "bucket_item_summary",
      titleKeys: ["title", "name"],
      fields: [
        ["Dream", "title"],
        ["Name", "name"],
        ["Description", "description"],
        ["Status", "status"],
        ["Type", "type"],
        ["Priority", "priority"],
        ["Why", "why"],
        ["Location", "location"],
        ["Tags", "tags"],
      ],
    });
  }

  if (wants("health")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.healthDailyLogs,
      sourceDomain: "health",
      sourceTable: "health_daily_logs",
      documentKind: "health_daily_summary",
      titleKeys: ["log_date", "date"],
      fields: [
        ["Log date", "log_date"],
        ["Sleep", "sleep"],
        ["Mood", "mood"],
        ["Energy", "energy"],
        ["Notes", "notes"],
      ],
    });
  }

  if (wants("finance")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.financeTransactions,
      sourceDomain: "finance",
      sourceTable: "finance_transactions",
      documentKind: "finance_transaction_summary",
      titleKeys: ["description", "transaction_date"],
      fields: [
        ["Description", "description"],
        ["Type", "type"],
        ["Amount", "amount"],
        ["Transaction date", "transaction_date"],
      ],
    });
  }

  if (wants("brain_graph")) {
    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.brainEdges,
      sourceDomain: "brain_graph",
      sourceTable: "brain_edges",
      documentKind: "brain_edge_summary",
      titleKeys: ["relationship_type", "source_node_id"],
      fields: [
        ["Source node", "source_node_id"],
        ["Source type", "source_node_type"],
        ["Target node", "target_node_id"],
        ["Target type", "target_node_type"],
        ["Relationship", "relationship_type"],
        ["Strength", "strength"],
        ["Reason", "reason"],
        ["Status", "status"],
      ],
    });
  }

  if (wants("about_me")) {
    if (params.sources.aboutMe) {
      addRowDocuments({
        docs,
        userId: params.userId,
        rows: [params.sources.aboutMe],
        sourceDomain: "about_me",
        sourceTable: "about_me",
        documentKind: "about_me_summary",
        titleKeys: ["display_name", "name", "id"],
        fields: [
          ["Profile", "display_name"],
          ["Bio", "bio"],
          ["Core values", "core_values"],
          ["Long term goals", "long_term_goals"],
          ["Preferences", "preferences"],
          ["Notes", "notes"],
        ],
      });
    }

    addRowDocuments({
      docs,
      userId: params.userId,
      rows: params.sources.memories,
      sourceDomain: "about_me",
      sourceTable: "life_agent_memories",
      documentKind: "life_agent_memory",
      titleKeys: ["title", "memory_type", "id"],
      fields: [
        ["Memory", "content"],
        ["Type", "memory_type"],
        ["Confidence", "confidence"],
      ],
    });
  }

  return docs;
}
