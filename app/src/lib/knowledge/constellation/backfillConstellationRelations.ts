/**
 * Backfill helper for the Constellation Relationship System.
 *
 * Goal: given a user's existing knowledge items, *propose* the initial
 * set of constellation relationships (knowledge↔tag, knowledge↔collection,
 * knowledge↔source, knowledge↔knowledge via shared tags, etc.).
 *
 * Why this is a "candidates" function rather than a Supabase writer:
 *   - The dedicated `knowledge_relations` table does not yet exist in
 *     this project's migrations. The existing `knowledge_connections`
 *     table only stores knowledge↔knowledge AI links.
 *   - Writing structural edges (knowledge↔tag/collection/source) into
 *     `knowledge_connections` would corrupt the existing AI-suggestion
 *     surface used by the detail panel.
 *
 * So today we return *candidate* relations. When a `knowledge_relations`
 * table is added (see PHASE 20 of the spec), this same function can
 * persist them in a single batch, scoped by `userId`. The expected new
 * Supabase schema is documented in `RELATIONS_TABLE_PROPOSAL` below.
 */

import type { KnowledgeItem, SmartCollection } from "@/types/knowledge";
import type { ConstellationRelationInput } from "./buildConstellationData";
import { isGenericTag } from "./constants";

// TODO(persistence): When `knowledge_relations` is added, switch this
// helper from "return candidates" to "upsert candidates into Supabase
// scoped by user_id" using the schema proposed in PHASE 20.
export const RELATIONS_TABLE_PROPOSAL = `
create table if not exists public.knowledge_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null,
  target_id text not null,
  source_type text,
  target_type text,
  relation_type text not null,
  status text not null default 'confirmed',
  weight numeric,
  confidence numeric,
  is_manual boolean not null default false,
  is_ai_suggested boolean not null default false,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_id, target_id, relation_type)
);

-- Always scope by user.
create index if not exists knowledge_relations_user_idx
  on public.knowledge_relations (user_id);
create index if not exists knowledge_relations_source_idx
  on public.knowledge_relations (user_id, source_id);
create index if not exists knowledge_relations_target_idx
  on public.knowledge_relations (user_id, target_id);
create index if not exists knowledge_relations_type_idx
  on public.knowledge_relations (user_id, relation_type);

alter table public.knowledge_relations enable row level security;

create policy "knowledge_relations_select_own"
  on public.knowledge_relations for select using (auth.uid() = user_id);
create policy "knowledge_relations_insert_own"
  on public.knowledge_relations for insert with check (auth.uid() = user_id);
create policy "knowledge_relations_update_own"
  on public.knowledge_relations for update using (auth.uid() = user_id);
create policy "knowledge_relations_delete_own"
  on public.knowledge_relations for delete using (auth.uid() = user_id);
`;

export type BackfillInput = {
  userId: string;
  knowledgeItems: KnowledgeItem[];
  collections?: SmartCollection[];
  options?: {
    /** Skip generic tags ("note", "article", …). */
    hideGenericTags?: boolean;
    /** Minimum shared tag count for a knowledge↔knowledge edge. */
    minSharedTagCount?: number;
    /** Skip knowledge↔knowledge shared-tag edges entirely. */
    includeSharedTagEdges?: boolean;
  };
};

export type BackfillResult = {
  /** Stats only — no DB writes happen here yet. */
  stats: {
    structuralRelations: number;
    sharedTagRelations: number;
    aiSuggestionsConsidered: number;
  };
  candidates: ConstellationRelationInput[];
  todo: string[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Generate the initial set of constellation relation candidates for a
 * given user. Returns the candidates plus a TODO list reminding the
 * caller what would happen once persistence lands.
 */
export async function backfillConstellationRelations(
  input: BackfillInput,
): Promise<BackfillResult> {
  const userId = input.userId;
  const items = input.knowledgeItems.filter((i) => i.userId === userId);
  const collections = (input.collections ?? []).filter(
    (c) => c.userId === userId,
  );
  const opts = {
    hideGenericTags: input.options?.hideGenericTags ?? true,
    minSharedTagCount: input.options?.minSharedTagCount ?? 2,
    includeSharedTagEdges: input.options?.includeSharedTagEdges ?? false,
  };

  const out: ConstellationRelationInput[] = [];
  const stamp = nowIso();
  const seen = new Set<string>();

  function push(rel: ConstellationRelationInput) {
    const key = `${rel.type}::${rel.sourceId}::${rel.targetId}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(rel);
  }

  let structuralRelations = 0;
  let sharedTagRelations = 0;

  // ── Knowledge → tag ────────────────────────────────────────────────
  for (const item of items) {
    const seenTags = new Set<string>();
    for (const raw of [...(item.aiTags ?? []), ...(item.manualTags ?? [])]) {
      if (!raw) continue;
      const tag = raw.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seenTags.has(key)) continue;
      if (opts.hideGenericTags && isGenericTag(tag)) continue;
      seenTags.add(key);
      structuralRelations++;
      push({
        id: `cand:tag:${item.id}:${key}`,
        userId,
        sourceId: item.id,
        targetId: `tag:${key}`,
        sourceType: "knowledge",
        targetType: "tag",
        type: "shared_tag",
        status: "confirmed",
        weight: 0.6,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }

  // ── Knowledge → collection ─────────────────────────────────────────
  for (const col of collections) {
    for (const itemId of col.itemIds ?? []) {
      structuralRelations++;
      push({
        id: `cand:col:${itemId}:${col.id}`,
        userId,
        sourceId: itemId,
        targetId: `col:${col.id}`,
        sourceType: "knowledge",
        targetType: "collection",
        type: "same_collection",
        status: "confirmed",
        weight: 0.7,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }

  // ── Knowledge → source ─────────────────────────────────────────────
  for (const item of items) {
    const sourceKey =
      item.sourceDomain || item.provider || item.sourceType || item.contentType;
    if (!sourceKey) continue;
    structuralRelations++;
    push({
      id: `cand:src:${item.id}:${sourceKey}`,
      userId,
      sourceId: item.id,
      targetId: `src:${String(sourceKey).toLowerCase()}`,
      sourceType: "knowledge",
      targetType: "source",
      type: "same_source",
      status: "confirmed",
      weight: 0.4,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  // ── Knowledge ↔ knowledge via shared tags (optional) ───────────────
  if (opts.includeSharedTagEdges) {
    const tagToItems = new Map<string, string[]>();
    for (const item of items) {
      const seenLocal = new Set<string>();
      for (const raw of [...(item.aiTags ?? []), ...(item.manualTags ?? [])]) {
        if (!raw) continue;
        const tag = raw.trim().toLowerCase();
        if (!tag) continue;
        if (opts.hideGenericTags && isGenericTag(tag)) continue;
        if (seenLocal.has(tag)) continue;
        seenLocal.add(tag);
        if (!tagToItems.has(tag)) tagToItems.set(tag, []);
        tagToItems.get(tag)!.push(item.id);
      }
    }
    const pairCount = new Map<string, { count: number; tags: string[] }>();
    for (const [tag, ids] of tagToItems) {
      if (ids.length < 2) continue;
      const capped = ids.slice(0, 80);
      for (let i = 0; i < capped.length; i++) {
        for (let j = i + 1; j < capped.length; j++) {
          const [a, b] = pair(capped[i], capped[j]);
          const key = `${a}::${b}`;
          const cur = pairCount.get(key);
          if (cur) {
            cur.count++;
            cur.tags.push(tag);
          } else pairCount.set(key, { count: 1, tags: [tag] });
        }
      }
    }
    for (const [key, info] of pairCount) {
      if (info.count < opts.minSharedTagCount) continue;
      const [a, b] = key.split("::");
      sharedTagRelations++;
      push({
        id: `cand:k2k:${a}:${b}`,
        userId,
        sourceId: a,
        targetId: b,
        sourceType: "knowledge",
        targetType: "knowledge",
        type: "shared_tag",
        status: "suggested",
        weight: Math.min(1, info.count / 5),
        reason: `Shared tags: ${info.tags.slice(0, 5).join(", ")}`,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }

  return {
    stats: {
      structuralRelations,
      sharedTagRelations,
      aiSuggestionsConsidered: 0,
    },
    candidates: out,
    todo: [
      "PHASE 20: persist these candidates into `knowledge_relations` once the table is added.",
      "Add a Supabase RPC that upserts in batches of ~500, scoped by user_id.",
      "Wire AI suggestions into ai_relation_suggestions (see PHASE 18).",
    ],
  };
}
