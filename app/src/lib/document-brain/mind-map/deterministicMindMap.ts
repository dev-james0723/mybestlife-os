import type { DraftMindMapEdge, DraftMindMapNode, MindMapNodeMetadata } from "@/lib/document-brain/mind-map/mindMapTypes";
import { MIND_MAP_MAX_NODES } from "@/lib/document-brain/mind-map/mindMapTypes";

type SectionRow = {
  id: string;
  title: string;
  level: number;
  parent_id: string | null;
  page_start: number | null;
  page_end: number | null;
  summary: string | null;
};

type PageRow = {
  id: string;
  page_number: number;
};

type GlossaryRow = {
  id: string;
  term: string;
  definition: string | null;
  pages: unknown;
};

type VisualRow = {
  id: string;
  title: string | null;
  source_page_number: number | null;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function numArr(v: unknown, cap: number): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const x of v) {
    if (typeof x === "number" && Number.isFinite(x)) out.push(Math.floor(x));
    if (out.length >= cap) break;
  }
  return out;
}

function pagesInSectionRange(section: SectionRow, allPageNumbers: number[]): number[] {
  const a = section.page_start;
  const b = section.page_end ?? section.page_start;
  if (a == null) return [];
  const end = b ?? a;
  const lo = Math.min(a, end);
  const hi = Math.max(a, end);
  return allPageNumbers.filter((p) => p >= lo && p <= hi);
}

function bestSectionForPages(sections: SectionRow[], pages: number[]): SectionRow | null {
  if (sections.length === 0 || pages.length === 0) return null;
  const p0 = pages[0]!;
  let best: SectionRow | null = null;
  let bestScore = -1;
  for (const s of sections) {
    const a = s.page_start;
    const b = s.page_end ?? s.page_start;
    if (a == null) continue;
    const lo = Math.min(a, b ?? a);
    const hi = Math.max(a, b ?? a);
    if (p0 >= lo && p0 <= hi) {
      const span = hi - lo + 1;
      const score = 10_000 - span;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
  }
  return best;
}

function chunkPages(pages: number[], bucket: number): { from: number; to: number }[] {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const out: { from: number; to: number }[] = [];
  for (let i = 0; i < sorted.length; i += bucket) {
    const slice = sorted.slice(i, i + bucket);
    if (slice.length === 0) continue;
    out.push({ from: slice[0]!, to: slice[slice.length - 1]! });
  }
  return out;
}

export function buildDeterministicMindMap(params: {
  documentTitle: string | null;
  sections: SectionRow[];
  pages: PageRow[];
  glossary: GlossaryRow[];
  visuals: VisualRow[];
  rootCollapsed?: boolean;
}): { nodes: DraftMindMapNode[]; edges: DraftMindMapEdge[] } {
  const title = (params.documentTitle || "Document").trim() || "Document";
  const rootId = newId();
  const nodes: DraftMindMapNode[] = [];
  const edges: DraftMindMapEdge[] = [];

  const rootMeta: MindMapNodeMetadata = {};
  nodes.push({
    id: rootId,
    node_key: "document:root",
    label: title,
    node_type: "document_root",
    description: null,
    importance_score: 1,
    page_numbers: [],
    section_ids: [],
    visual_asset_ids: [],
    glossary_term_ids: [],
    source_chunk_ids: [],
    keywords: [],
    position_x: null,
    position_y: null,
    collapsed: params.rootCollapsed ?? false,
    metadata: rootMeta,
  });

  const pageNumbers = params.pages
    .map((p) => p.page_number)
    .filter((n) => typeof n === "number" && Number.isFinite(n))
    .map((n) => Math.floor(n));

  const sections = [...params.sections].sort((a, b) => {
    const pa = a.page_start ?? 99999;
    const pb = b.page_start ?? 99999;
    return pa - pb;
  });

  const topSections = sections.filter((s) => s.parent_id == null).slice(0, 12);
  const primarySections = topSections.length > 0 ? topSections : sections.slice(0, 12);

  for (const sec of primarySections) {
    if (nodes.length >= MIND_MAP_MAX_NODES - 24) break;
    const sid = newId();
    const secPages = pagesInSectionRange(sec, pageNumbers);
    nodes.push({
      id: sid,
      node_key: `section:${sec.id}`,
      label: sec.title.slice(0, 120),
      node_type: "section",
      description: sec.summary?.slice(0, 400) ?? null,
      importance_score: 0.75,
      page_numbers: secPages.slice(0, 40),
      section_ids: [sec.id],
      visual_asset_ids: [],
      glossary_term_ids: [],
      source_chunk_ids: [],
      keywords: [],
      position_x: null,
      position_y: null,
      collapsed: true,
      metadata: { section_title: sec.title, default_hidden: true },
    });
    edges.push({
      id: newId(),
      source_node_id: rootId,
      target_node_id: sid,
      relationship_type: "contains",
      label: "section",
      description: null,
      confidence: 1,
      metadata: {},
    });

    const children = sections.filter((s) => s.parent_id === sec.id).slice(0, 8);
    for (const sub of children) {
      if (nodes.length >= MIND_MAP_MAX_NODES - 8) break;
      const subId = newId();
      const subPages = pagesInSectionRange(sub, pageNumbers);
      nodes.push({
        id: subId,
        node_key: `subsection:${sub.id}`,
        label: sub.title.slice(0, 120),
        node_type: "subsection",
        description: sub.summary?.slice(0, 320) ?? null,
        importance_score: 0.55,
        page_numbers: subPages.slice(0, 24),
        section_ids: [sub.id],
        visual_asset_ids: [],
        glossary_term_ids: [],
        source_chunk_ids: [],
        keywords: [],
        position_x: null,
        position_y: null,
        collapsed: true,
        metadata: { section_title: sub.title, default_hidden: true },
      });
      edges.push({
        id: newId(),
        source_node_id: sid,
        target_node_id: subId,
        relationship_type: "part_of",
        label: "subsection",
        description: null,
        confidence: 1,
        metadata: {},
      });
    }

    const buckets = chunkPages(secPages.length ? secPages : pageNumbers.slice(0, 60), 20).slice(0, 4);

    for (const b of buckets) {
      if (nodes.length >= MIND_MAP_MAX_NODES - 4) break;
      const pid = newId();
      const label = b.from === b.to ? `Page ${b.from}` : `Pages ${b.from}–${b.to}`;
      nodes.push({
        id: pid,
        node_key: `pages:${sec.id}:${b.from}-${b.to}`,
        label,
        node_type: "page",
        description: null,
        importance_score: 0.4,
        page_numbers: secPages.filter((p) => p >= b.from && p <= b.to).slice(0, 24),
        section_ids: [sec.id],
        visual_asset_ids: [],
        glossary_term_ids: [],
        source_chunk_ids: [],
        keywords: [],
        position_x: null,
        position_y: null,
        collapsed: true,
        metadata: {
          page_group: true,
          page_from: b.from,
          page_to: b.to,
          default_hidden: true,
        },
      });
      edges.push({
        id: newId(),
        source_node_id: sid,
        target_node_id: pid,
        relationship_type: "appears_on_page",
        label: "pages",
        description: null,
        confidence: 0.95,
        metadata: {},
      });
    }
  }

  const glossUsed = params.glossary.slice(0, 36);
  for (const g of glossUsed) {
    if (nodes.length >= MIND_MAP_MAX_NODES - 2) break;
    const gid = newId();
    const gp = numArr(g.pages, 24);
    const linkSec = bestSectionForPages(sections, gp);
    nodes.push({
      id: gid,
      node_key: `glossary:${g.id}`,
      label: g.term.slice(0, 160),
      node_type: "glossary",
      description: g.definition?.slice(0, 500) ?? null,
      importance_score: 0.5,
      page_numbers: gp,
      section_ids: linkSec ? [linkSec.id] : [],
      visual_asset_ids: [],
      glossary_term_ids: [g.id],
      source_chunk_ids: [],
      keywords: [],
      position_x: null,
      position_y: null,
      collapsed: true,
      metadata: { glossary_term: g.term, default_hidden: true },
    });
    const src = linkSec
      ? nodes.find((n) => n.node_key === `section:${linkSec.id}`)?.id ?? rootId
      : rootId;
    edges.push({
      id: newId(),
      source_node_id: src,
      target_node_id: gid,
      relationship_type: "defines",
      label: "glossary",
      description: null,
      confidence: 0.7,
      metadata: {},
    });
  }

  const visualsUsed = params.visuals.slice(0, 36);
  for (const v of visualsUsed) {
    if (nodes.length >= MIND_MAP_MAX_NODES) break;
    const vid = newId();
    const pg = v.source_page_number != null && Number.isFinite(v.source_page_number) ? [Math.floor(v.source_page_number)] : [];
    const linkSec = bestSectionForPages(sections, pg);
    const pageSrc =
      pg.length > 0 && linkSec
        ? nodes.find(
            (n) =>
              n.node_type === "page" &&
              n.metadata.page_group &&
              n.section_ids[0] === linkSec.id &&
              typeof n.metadata.page_from === "number" &&
              typeof n.metadata.page_to === "number" &&
              pg[0]! >= n.metadata.page_from &&
              pg[0]! <= n.metadata.page_to,
          )
        : undefined;

    nodes.push({
      id: vid,
      node_key: `visual:${v.id}`,
      label: (v.title || "Visual").slice(0, 160),
      node_type: "visual",
      description: null,
      importance_score: 0.45,
      page_numbers: pg,
      section_ids: linkSec ? [linkSec.id] : [],
      visual_asset_ids: [v.id],
      glossary_term_ids: [],
      source_chunk_ids: [],
      keywords: [],
      position_x: null,
      position_y: null,
      collapsed: true,
      metadata: { visual_title: v.title ?? undefined, default_hidden: true },
    });
    const vsrc = pageSrc?.id ?? (linkSec ? nodes.find((n) => n.node_key === `section:${linkSec.id}`)?.id : null) ?? rootId;
    edges.push({
      id: newId(),
      source_node_id: vsrc,
      target_node_id: vid,
      relationship_type: "related_to_visual",
      label: "visual",
      description: null,
      confidence: 0.75,
      metadata: {},
    });
  }

  return { nodes, edges };
}
