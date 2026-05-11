/**
 * The Constellation Relationship Engine.
 *
 * Transforms the user's existing Knowledge Base into a typed graph of
 * nodes + edges that the Constellation View renders. Every node and
 * edge is scoped by `userId`. Pollution-control is built in:
 *
 *   - generic tags ("note", "article", "saved", …) never become nodes
 *   - shared-tag edges are off by default and require >=2 meaningful tags
 *   - semantic-similarity edges are off by default and gated by confidence
 *   - AI suggestions appear as `suggested` (not `confirmed`) until the user
 *     promotes them; only confirmed/explicit relations are emitted as
 *     `confirmed` edges
 *   - duplicate edges between the same source/target/relation are dropped
 *
 * The function is pure — pass in data, get back nodes and edges. No I/O,
 * no Supabase calls. Database fetching is done one layer up.
 */

import type {
  KnowledgeConnection,
  KnowledgeItem,
  SmartCollection,
} from "@/types/knowledge";
import type {
  BuildConstellationOptions,
  ConstellationEdge,
  ConstellationEdgeType,
  ConstellationGraphData,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";
import {
  DEFAULT_BUILD_OPTIONS,
  isGenericTag,
} from "./constants";

/**
 * Optional shape for "future" entity / relation inputs that the build
 * function understands. They are intentionally minimal — concrete schemas
 * can extend them later without breaking callers.
 */
export type ConstellationProjectInput = {
  id: string;
  name: string;
  description?: string;
  knowledgeIds?: string[];
};

export type ConstellationEntityInput = {
  id: string;
  name: string;
  type: "person" | "organization" | "concept";
  knowledgeIds?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * A persisted relation row, e.g. from a future `knowledge_relations` table.
 * The shape mirrors what we'd store in Supabase.
 */
export type ConstellationRelationInput = {
  id: string;
  userId: string;
  sourceId: string;
  targetId: string;
  sourceType?: ConstellationNodeType;
  targetType?: ConstellationNodeType;
  type: ConstellationEdgeType;
  status?: "confirmed" | "suggested" | "hidden" | "dismissed";
  weight?: number;
  confidence?: number;
  isManual?: boolean;
  isAISuggested?: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type BuildConstellationInput = {
  userId: string;
  knowledgeItems: KnowledgeItem[];
  collections?: SmartCollection[];
  /**
   * Existing AI/derived connections from the `knowledge_connections`
   * table. These are treated as `ai_suggested_link` (default) or
   * `explicit_link` if the score is very high.
   */
  connections?: KnowledgeConnection[];
  /** Future: persisted relations (`knowledge_relations`). */
  relations?: ConstellationRelationInput[];
  projects?: ConstellationProjectInput[];
  entities?: ConstellationEntityInput[];
  options?: BuildConstellationOptions;
};

const CATEGORY_NODE_PREFIX = "cat:";
const TAG_NODE_PREFIX = "tag:";
const COLLECTION_NODE_PREFIX = "col:";
const SOURCE_NODE_PREFIX = "src:";
const PROJECT_NODE_PREFIX = "proj:";
const ENTITY_NODE_PREFIX = "ent:";

function categoryNodeId(key: string) {
  return `${CATEGORY_NODE_PREFIX}${key}`;
}
function tagNodeId(tag: string) {
  return `${TAG_NODE_PREFIX}${tag.toLowerCase()}`;
}
function collectionNodeId(id: string) {
  return `${COLLECTION_NODE_PREFIX}${id}`;
}
function sourceNodeId(key: string) {
  return `${SOURCE_NODE_PREFIX}${key}`;
}
function projectNodeId(id: string) {
  return `${PROJECT_NODE_PREFIX}${id}`;
}
function entityNodeId(type: "person" | "organization" | "concept", id: string) {
  return `${ENTITY_NODE_PREFIX}${type}:${id}`;
}

/**
 * Pretty-print a `KnowledgeCategory` slug for display in the graph.
 * Mirrors `getCategoryLabel` (which lives outside `lib/knowledge` to avoid
 * a wider import here) but stays a stand-alone fn so the engine remains
 * pure.
 */
function categoryLabel(slug: string): string {
  const map: Record<string, string> = {
    article: "Articles",
    video: "Videos",
    social_media: "Social Media",
    repository: "Repositories",
    code: "Code",
    markup: "Markup",
    audio: "Audio",
    image: "Images",
    note: "Notes",
    file: "Files",
  };
  return map[slug] ?? slug.replace(/_/g, " ");
}

/**
 * Normalize, dedupe, and strip generics from a knowledge item's tags.
 */
function meaningfulTagsFor(
  item: KnowledgeItem,
  hideGeneric: boolean,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const all = [...(item.aiTags ?? []), ...(item.manualTags ?? [])];
  for (const raw of all) {
    if (!raw) continue;
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    if (hideGeneric && isGenericTag(t)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * Build a stable, dedup-friendly edge id. Same key → same id, regardless
 * of how many times the same relation was generated.
 */
function makeEdgeId(
  source: string,
  target: string,
  type: ConstellationEdgeType,
): string {
  return `${type}::${source}::${target}`;
}

/**
 * Sort node-pair so undirected edges (e.g. shared_tag) get a stable id
 * irrespective of input order.
 */
function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function buildConstellationData(
  input: BuildConstellationInput,
): ConstellationGraphData {
  const opts: Required<BuildConstellationOptions> = {
    ...DEFAULT_BUILD_OPTIONS,
    ...(input.options ?? {}),
  };

  const userId = input.userId;
  const items = input.knowledgeItems.filter((i) => i.userId === userId);
  const collections = (input.collections ?? []).filter(
    (c) => c.userId === userId,
  );
  const connections = input.connections ?? [];
  const relations = (input.relations ?? []).filter((r) => r.userId === userId);
  const projects = input.projects ?? [];
  const entities = input.entities ?? [];

  const nodes = new Map<string, ConstellationNode>();
  const edges = new Map<string, ConstellationEdge>();
  const connectionCount = new Map<string, number>();

  function bumpConnection(id: string) {
    connectionCount.set(id, (connectionCount.get(id) ?? 0) + 1);
  }

  function addEdge(edge: Omit<ConstellationEdge, "userId">) {
    const id = edge.id;
    if (edges.has(id)) return;
    edges.set(id, { ...edge, userId });
    bumpConnection(edge.source);
    bumpConnection(edge.target);
  }

  function addNode(node: ConstellationNode) {
    if (nodes.has(node.id)) {
      // Merge metadata when a node was added from multiple sources.
      const existing = nodes.get(node.id)!;
      nodes.set(node.id, {
        ...existing,
        ...node,
        metadata: { ...(existing.metadata ?? {}), ...(node.metadata ?? {}) },
      });
      return;
    }
    nodes.set(node.id, node);
  }

  // ── 1. Knowledge nodes ─────────────────────────────────────────────
  const knowledgeIds = new Set<string>();
  for (const item of items) {
    knowledgeIds.add(item.id);
    addNode({
      id: item.id,
      userId,
      label: item.title || "Untitled",
      type: "knowledge",
      knowledgeId: item.id,
      category: item.category ?? item.contentType,
      description: item.aiTldr || item.aiSummary || undefined,
      tags: meaningfulTagsFor(item, opts.hideGenericTags),
      collectionName: undefined,
      sourceType: item.sourceType,
      createdAt: item.dateAdded,
      updatedAt: item.dateModified,
      metadata: {
        contentType: item.contentType,
        sourceUrl: item.sourceUrl,
        sourceDomain: item.sourceDomain,
        provider: item.provider,
      },
    });
  }

  // ── 2. Category nodes + edges ──────────────────────────────────────
  // Categories are first-class anchors in the constellation. They tend
  // to act as gravity wells for their associated knowledge cards, which
  // helps clusters separate visually instead of melting into one blob.
  if (opts.includeCategoryNodes) {
    const catToItems = new Map<string, Set<string>>();
    for (const item of items) {
      const slug = item.category ?? item.contentType;
      if (!slug) continue;
      const id = categoryNodeId(String(slug).toLowerCase());
      if (!catToItems.has(id)) catToItems.set(id, new Set());
      catToItems.get(id)!.add(item.id);
    }
    for (const [id, itemSet] of catToItems) {
      if (itemSet.size === 0) continue;
      const slug = id.slice(CATEGORY_NODE_PREFIX.length);
      addNode({
        id,
        userId,
        label: categoryLabel(slug),
        type: "category",
        categoryId: slug,
        usageCount: itemSet.size,
      });
      for (const itemId of itemSet) {
        addEdge({
          id: makeEdgeId(itemId, id, "category_reference"),
          source: itemId,
          target: id,
          sourceType: "knowledge",
          targetType: "category",
          type: "category_reference",
          status: "confirmed",
          weight: 0.85,
        });
      }
    }
  }

  // ── 3. Tag nodes + edges ───────────────────────────────────────────
  if (opts.includeTagNodes) {
    const tagToItems = new Map<string, Set<string>>();
    for (const item of items) {
      const tags = meaningfulTagsFor(item, opts.hideGenericTags);
      for (const tag of tags) {
        const id = tagNodeId(tag);
        if (!tagToItems.has(id)) tagToItems.set(id, new Set());
        tagToItems.get(id)!.add(item.id);
      }
    }
    const minTagPop = Math.max(1, opts.minTagPopularity ?? 1);
    for (const [id, itemSet] of tagToItems) {
      const tagLabel = id.slice(TAG_NODE_PREFIX.length);
      // Skip tag nodes that connect to nothing meaningful, and drop
      // singleton (or below-threshold) tags that would just clutter the
      // canvas with isolated violet dots.
      if (itemSet.size < minTagPop) continue;
      addNode({
        id,
        userId,
        label: tagLabel,
        type: "tag",
        tagId: tagLabel,
        usageCount: itemSet.size,
      });
      for (const itemId of itemSet) {
        addEdge({
          id: makeEdgeId(itemId, id, "shared_tag"),
          source: itemId,
          target: id,
          sourceType: "knowledge",
          targetType: "tag",
          type: "shared_tag",
          status: "confirmed",
          weight: 0.5,
        });
      }
    }
  }

  // ── 3. Collection nodes + edges ────────────────────────────────────
  if (opts.includeCollectionNodes) {
    for (const col of collections) {
      const id = collectionNodeId(col.id);
      const itemIds = (col.itemIds ?? []).filter((iid) => knowledgeIds.has(iid));
      if (itemIds.length === 0) continue;
      addNode({
        id,
        userId,
        label: col.name,
        type: "collection",
        collectionId: col.id,
        description: col.description,
        usageCount: itemIds.length,
      });
      for (const itemId of itemIds) {
        addEdge({
          id: makeEdgeId(itemId, id, "same_collection"),
          source: itemId,
          target: id,
          sourceType: "knowledge",
          targetType: "collection",
          type: "same_collection",
          status: "confirmed",
          weight: 0.7,
        });
      }
    }
  }

  // ── 4. Source nodes + edges ────────────────────────────────────────
  if (opts.includeSourceNodes) {
    const sourceToItems = new Map<
      string,
      { label: string; type: string; itemIds: Set<string> }
    >();
    for (const item of items) {
      // Prefer source domain when available; fall back to provider, then sourceType.
      const sourceKey =
        item.sourceDomain ||
        item.provider ||
        item.sourceType ||
        item.contentType;
      if (!sourceKey) continue;
      const id = sourceNodeId(String(sourceKey).toLowerCase());
      if (!sourceToItems.has(id)) {
        sourceToItems.set(id, {
          label: String(sourceKey),
          type: item.sourceType ?? item.contentType ?? "source",
          itemIds: new Set(),
        });
      }
      sourceToItems.get(id)!.itemIds.add(item.id);
    }
    for (const [id, info] of sourceToItems) {
      if (info.itemIds.size === 0) continue;
      addNode({
        id,
        userId,
        label: info.label,
        type: "source",
        sourceType: info.type,
        usageCount: info.itemIds.size,
      });
      for (const itemId of info.itemIds) {
        addEdge({
          id: makeEdgeId(itemId, id, "same_source"),
          source: itemId,
          target: id,
          sourceType: "knowledge",
          targetType: "source",
          type: "same_source",
          status: "confirmed",
          weight: 0.4,
        });
      }
    }
  }

  // ── 5. Project nodes + edges ───────────────────────────────────────
  if (opts.includeProjectNodes && projects.length > 0) {
    for (const project of projects) {
      const id = projectNodeId(project.id);
      const linkedIds = (project.knowledgeIds ?? []).filter((iid) =>
        knowledgeIds.has(iid),
      );
      if (linkedIds.length === 0) continue;
      addNode({
        id,
        userId,
        label: project.name,
        type: "project",
        projectId: project.id,
        description: project.description,
        usageCount: linkedIds.length,
      });
      for (const itemId of linkedIds) {
        addEdge({
          id: makeEdgeId(itemId, id, "project_reference"),
          source: itemId,
          target: id,
          sourceType: "knowledge",
          targetType: "project",
          type: "project_reference",
          status: "confirmed",
          weight: 0.8,
        });
      }
    }
  }

  // ── 6/7/8. Entity nodes + edges (people, orgs, concepts) ───────────
  if (opts.includeEntityNodes && entities.length > 0) {
    for (const ent of entities) {
      const id = entityNodeId(ent.type, ent.id);
      const linkedIds = (ent.knowledgeIds ?? []).filter((iid) =>
        knowledgeIds.has(iid),
      );
      if (linkedIds.length === 0) continue;
      addNode({
        id,
        userId,
        label: ent.name,
        type: ent.type,
        usageCount: linkedIds.length,
        metadata: ent.metadata,
      });
      const edgeType: ConstellationEdgeType =
        ent.type === "person"
          ? "person_reference"
          : ent.type === "organization"
            ? "organization_reference"
            : "concept_reference";
      for (const itemId of linkedIds) {
        addEdge({
          id: makeEdgeId(itemId, id, edgeType),
          source: itemId,
          target: id,
          sourceType: "knowledge",
          targetType: ent.type,
          type: edgeType,
          status: "confirmed",
          weight: 0.6,
        });
      }
    }
  }

  // ── 9/10/11. Knowledge ↔ knowledge edges from existing connections ─
  if (opts.includeAISuggestedEdges || opts.includeManualEdges) {
    for (const conn of connections) {
      if (
        !knowledgeIds.has(conn.sourceItemId) ||
        !knowledgeIds.has(conn.targetItemId)
      )
        continue;
      const [a, b] = pair(conn.sourceItemId, conn.targetItemId);
      const score = conn.relevanceScore ?? 0;
      // Treat as explicit when score is very high; otherwise AI-suggested.
      const type: ConstellationEdgeType =
        score >= 0.9 ? "explicit_link" : "ai_suggested_link";
      if (type === "ai_suggested_link" && !opts.includeAISuggestedEdges) continue;
      if (type === "ai_suggested_link" && score < opts.minSemanticConfidence)
        continue;
      addEdge({
        id: makeEdgeId(a, b, type),
        source: a,
        target: b,
        sourceType: "knowledge",
        targetType: "knowledge",
        type,
        status: type === "explicit_link" ? "confirmed" : "suggested",
        confidence: score,
        weight: score,
        isAISuggested: type === "ai_suggested_link",
        reason: conn.reason,
      });
    }
  }

  // ── Persisted relations (future-ready) ─────────────────────────────
  for (const rel of relations) {
    if (rel.status === "hidden" || rel.status === "dismissed") continue;
    if (rel.type === "manual_link" && !opts.includeManualEdges) continue;
    if (
      rel.type === "ai_suggested_link" &&
      !opts.includeAISuggestedEdges
    )
      continue;
    if (
      rel.type === "semantic_similarity" &&
      !opts.includeSemanticEdges
    )
      continue;
    if (
      (rel.type === "ai_suggested_link" || rel.type === "semantic_similarity") &&
      (rel.confidence ?? 0) < opts.minSemanticConfidence
    )
      continue;
    const [a, b] = pair(rel.sourceId, rel.targetId);
    addEdge({
      id: makeEdgeId(a, b, rel.type),
      source: a,
      target: b,
      sourceType: rel.sourceType,
      targetType: rel.targetType,
      type: rel.type,
      status: rel.status ?? "confirmed",
      weight: rel.weight,
      confidence: rel.confidence,
      isManual: rel.isManual,
      isAISuggested: rel.isAISuggested,
      isConfirmed: rel.status === "confirmed",
      reason: rel.reason,
      createdAt: rel.createdAt,
      updatedAt: rel.updatedAt,
      metadata: rel.metadata,
    });
  }

  // ── 16. Shared-tag edges between knowledge items (optional) ────────
  if (opts.includeSharedTagEdges) {
    const tagToItems = new Map<string, string[]>();
    for (const item of items) {
      const tags = meaningfulTagsFor(item, opts.hideGenericTags);
      for (const tag of tags) {
        const t = tag.toLowerCase();
        if (!tagToItems.has(t)) tagToItems.set(t, []);
        tagToItems.get(t)!.push(item.id);
      }
    }
    // Build pair → shared count.
    const pairCount = new Map<string, { count: number; tags: string[] }>();
    for (const [tag, ids] of tagToItems) {
      if (ids.length < 2) continue;
      // To avoid n^2 explosions on hub tags, cap fan-out.
      const cappedIds = ids.slice(0, 80);
      for (let i = 0; i < cappedIds.length; i++) {
        for (let j = i + 1; j < cappedIds.length; j++) {
          const [a, b] = pair(cappedIds[i], cappedIds[j]);
          const key = `${a}::${b}`;
          const cur = pairCount.get(key);
          if (cur) {
            cur.count += 1;
            cur.tags.push(tag);
          } else {
            pairCount.set(key, { count: 1, tags: [tag] });
          }
        }
      }
    }
    for (const [key, info] of pairCount) {
      if (info.count < opts.minSharedTagCount) continue;
      const [a, b] = key.split("::");
      addEdge({
        id: makeEdgeId(a, b, "shared_tag"),
        source: a,
        target: b,
        sourceType: "knowledge",
        targetType: "knowledge",
        type: "shared_tag",
        status: "confirmed",
        weight: Math.min(1, info.count / 5),
        reason: `Shared tags: ${info.tags.slice(0, 5).join(", ")}`,
      });
    }
  }

  // ── Final shaping: connection counts, orphan removal, max-nodes cap ─
  let outNodes: ConstellationNode[] = [...nodes.values()].map((n) => ({
    ...n,
    connectionCount: connectionCount.get(n.id) ?? 0,
  }));

  if (opts.hideOrphanNodes) {
    outNodes = outNodes.filter((n) => (n.connectionCount ?? 0) > 0);
  }

  if (outNodes.length > opts.maxNodes) {
    outNodes = [...outNodes]
      .sort((a, b) => (b.connectionCount ?? 0) - (a.connectionCount ?? 0))
      .slice(0, opts.maxNodes);
  }

  // Edges that reference dropped nodes must also be dropped.
  const keptIds = new Set(outNodes.map((n) => n.id));
  const outEdges: ConstellationEdge[] = [...edges.values()].filter(
    (e) => keptIds.has(e.source) && keptIds.has(e.target),
  );

  return { nodes: outNodes, edges: outEdges };
}
