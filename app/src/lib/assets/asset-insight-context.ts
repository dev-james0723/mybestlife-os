/**
 * Compact, privacy-aware context builder for the Asset Intelligence analyze
 * route. Rather than shipping a user's entire workspace to the model, this
 * assembles a small payload: the asset itself, what evidence exists, a few
 * similar assets, and the most *relevant* projects / tasks / goals / notes
 * (ranked by keyword overlap with the asset, then recency).
 *
 * Pure + synchronous so it can run in the client off existing query caches.
 */

import type { Asset } from "@/types/assets";
import type { Project, Task, Goal, Note } from "@/types/database";
import type {
  AssetInsightContextPayload,
  AssetInsightContextItem,
  AssetDocumentRole,
  AssetImageType,
} from "@/types/asset-intelligence";

const MAX_PER_BUCKET = 6;
const MAX_SIMILAR = 5;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "with",
  "my", "your", "this", "that", "it", "is", "are", "pro", "max", "plus",
]);

function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9一-鿿\s]/gi, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  let score = 0;
  for (const tok of b) if (a.has(tok)) score += 1;
  return score;
}

type Ranked<T> = { item: T; score: number; recency: number };

function rankByRelevance<T>(
  items: T[],
  assetTokens: Set<string>,
  getText: (item: T) => string,
  getRecency: (item: T) => string,
): T[] {
  const ranked: Ranked<T>[] = items.map((item) => ({
    item,
    score: overlapScore(assetTokens, tokenize(getText(item))),
    recency: new Date(getRecency(item)).getTime() || 0,
  }));
  return ranked
    .sort((a, b) => b.score - a.score || b.recency - a.recency)
    .slice(0, MAX_PER_BUCKET)
    .filter((r, idx) => r.score > 0 || idx < 3) // keep top-3 even with no overlap
    .map((r) => r.item);
}

function truncate(text: string | null | undefined, max = 140): string | undefined {
  if (!text) return undefined;
  const t = text.trim();
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export type BuildAssetInsightContextArgs = {
  asset: Asset;
  allAssets: Asset[];
  documentRoles: AssetDocumentRole[];
  imageTypes: AssetImageType[];
  projects: Project[];
  tasks: Task[];
  goals: Goal[];
  notes: Note[];
};

export function buildAssetInsightContext(
  args: BuildAssetInsightContextArgs,
): AssetInsightContextPayload {
  const { asset } = args;
  const assetTokens = tokenize(`${asset.name} ${asset.notes ?? ""} ${asset.category ?? ""}`);

  const similarAssets: AssetInsightContextItem[] = rankByRelevance(
    args.allAssets.filter((a) => a.id !== asset.id),
    assetTokens,
    (a) => `${a.name} ${a.category ?? ""} ${a.notes ?? ""}`,
    (a) => a.created_at,
  )
    .slice(0, MAX_SIMILAR)
    .map((a) => ({
      id: a.id,
      title: a.name,
      kind: a.category_key ?? "asset",
      detail: truncate(a.notes) ?? null,
    }));

  const projects: AssetInsightContextItem[] = rankByRelevance(
    args.projects,
    assetTokens,
    (p) => `${p.name} ${p.description ?? ""} ${p.tags.join(" ")}`,
    (p) => p.updated_at,
  ).map((p) => ({
    id: p.id,
    title: p.name,
    kind: p.status,
    detail: truncate(p.description) ?? null,
  }));

  const tasks: AssetInsightContextItem[] = rankByRelevance(
    args.tasks,
    assetTokens,
    (t) => `${t.title} ${t.description ?? ""} ${t.tags.join(" ")}`,
    (t) => t.updated_at,
  ).map((t) => ({
    id: t.id,
    title: t.title,
    kind: t.status,
    detail: truncate(t.description) ?? null,
  }));

  const goals: AssetInsightContextItem[] = rankByRelevance(
    args.goals,
    assetTokens,
    (g) => `${g.name} ${g.description ?? ""} ${g.category ?? ""}`,
    (g) => g.updated_at,
  ).map((g) => ({
    id: g.id,
    title: g.name,
    kind: g.status,
    detail: truncate(g.description) ?? null,
  }));

  const notes: AssetInsightContextItem[] = rankByRelevance(
    args.notes,
    assetTokens,
    (n) => `${n.title} ${n.content ?? ""} ${n.tags.join(" ")}`,
    (n) => n.updated_at,
  ).map((n) => ({
    id: n.id,
    title: n.title,
    kind: n.category ?? "note",
    detail: truncate(n.content) ?? null,
  }));

  return {
    asset: {
      name: asset.name,
      categoryKey: asset.category_key,
      category: asset.category,
      value: asset.value,
      currentValue: asset.current_value,
      location: asset.location,
      purchaseDate: asset.purchase_date,
      serialNumber: asset.serial_number,
      notes: truncate(asset.notes, 400) ?? null,
    },
    documentRoles: args.documentRoles,
    imageTypes: args.imageTypes,
    similarAssets,
    projects,
    tasks,
    goals,
    notes,
  };
}
