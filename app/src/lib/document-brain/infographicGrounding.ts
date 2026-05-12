import type { LoadedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";

export type FocusSelectionInput = {
  id: string;
  label: string;
  description: string;
  source_pages?: number[];
  source_sections?: string[];
};

export function unionPagesFromFocusSelections(selections: FocusSelectionInput[]): Set<number> | null {
  const s = new Set<number>();
  for (const x of selections) {
    for (const p of x.source_pages ?? []) {
      if (typeof p === "number" && Number.isFinite(p)) {
        s.add(Math.floor(p));
      }
    }
  }
  return s.size > 0 ? s : null;
}

function sectionOverlapsPages(
  pageStart: number | null,
  pageEnd: number | null,
  pages: Set<number>,
): boolean {
  if (pages.size === 0) return false;
  const a = pageStart ?? pageEnd;
  const b = pageEnd ?? pageStart;
  if (a == null) return false;
  const lo = Math.min(a, b ?? a);
  const hi = Math.max(a, b ?? a);
  for (let p = lo; p <= hi; p++) {
    if (pages.has(p)) return true;
  }
  return false;
}

function glossaryPagesArray(pages: unknown): number[] {
  if (!Array.isArray(pages)) return [];
  const out: number[] = [];
  for (const x of pages) {
    if (typeof x === "number" && Number.isFinite(x)) out.push(Math.floor(x));
  }
  return out;
}

export function buildGroundedFactsBlock(
  ctx: LoadedDocumentOracleContext,
  pageFilter: Set<number> | null,
): string {
  const blocks: string[] = [];

  if (ctx.summary?.trim()) {
    blocks.push(`DOCUMENT ANALYSIS SUMMARY:\n${ctx.summary.trim().slice(0, 4000)}`);
  }

  const sections = ctx.sections.filter((s) => {
    if (!pageFilter) return true;
    return sectionOverlapsPages(s.page_start, s.page_end, pageFilter);
  });
  if (sections.length) {
    const lines = sections.slice(0, 80).map((s) => {
      const pg =
        s.page_start != null
          ? `p.${s.page_start}${s.page_end != null && s.page_end !== s.page_start ? `–${s.page_end}` : ""}`
          : "p.?";
      const sum = (s.summary || "").trim().slice(0, 420);
      return `- [${pg}] ${s.title}: ${sum || "(no section summary)"}`;
    });
    blocks.push(`SECTIONS (grounded):\n${lines.join("\n")}`);
  }

  let chunks = ctx.chunks;
  if (pageFilter && pageFilter.size > 0) {
    chunks = chunks.filter((c) => c.page_number != null && pageFilter.has(Math.floor(c.page_number)));
  }
  const maxChunks = pageFilter && pageFilter.size > 0 ? 140 : 90;
  const chunkLines = chunks.slice(0, maxChunks).map((c) => {
    const pg = c.page_number != null ? `p.${Math.floor(c.page_number)}` : "p.?";
    const path = (c.section_path || "").trim();
    const t = (c.chunk_text || "").trim().replace(/\s+/g, " ").slice(0, 520);
    return `- [${pg}]${path ? ` (${path})` : ""} ${t}`;
  });
  if (chunkLines.length) {
    blocks.push(`TEXT CHUNKS (grounded excerpts):\n${chunkLines.join("\n")}`);
  }

  const gloss = ctx.glossary.filter((g) => {
    if (!pageFilter || pageFilter.size === 0) return true;
    const gp = glossaryPagesArray(g.pages);
    return gp.some((p) => pageFilter.has(p));
  });
  if (gloss.length) {
    const lines = gloss.slice(0, 60).map((g) => {
      const gp = glossaryPagesArray(g.pages)
        .slice(0, 6)
        .map((p) => `p.${p}`)
        .join(", ");
      return `- ${g.term}${gp ? ` (${gp})` : ""}: ${(g.definition || "").trim().slice(0, 320)}`;
    });
    blocks.push(`GLOSSARY:\n${lines.join("\n")}`);
  }

  const pages = ctx.pages.filter((p) => {
    if (!pageFilter || pageFilter.size === 0) return true;
    return pageFilter.has(Math.floor(p.page_number));
  });
  if (pages.length) {
    const lines = pages.slice(0, 80).map((p) => {
      const sum = (p.page_summary || "").trim().slice(0, 360);
      const md = (p.markdown || "").trim().replace(/\s+/g, " ").slice(0, 520);
      return `- p.${Math.floor(p.page_number)} summary: ${sum || "(none)"}\n  excerpt: ${md || "(none)"}`;
    });
    blocks.push(`PAGE SUMMARIES + SHORT EXCERPTS:\n${lines.join("\n")}`);
  }

  const visuals = ctx.visuals.filter((v) => {
    if (!pageFilter || pageFilter.size === 0) return true;
    return v.source_page_number != null && pageFilter.has(Math.floor(v.source_page_number));
  });
  if (visuals.length) {
    const lines = visuals.slice(0, 40).map((v) => {
      const pg = v.source_page_number != null ? `p.${Math.floor(v.source_page_number)}` : "p.?";
      return `- [${pg}] ${(v.title || "visual").trim()}: ${(v.description || "").trim().slice(0, 240)}`;
    });
    blocks.push(`VISUAL ASSETS (describe only — do not copy):\n${lines.join("\n")}`);
  }

  if (ctx.mindMapNodes.length) {
    const nodeLines = ctx.mindMapNodes.slice(0, 80).map((n) => {
      const pgs = (n.page_numbers ?? [])
        .filter((x) => typeof x === "number")
        .slice(0, 6)
        .map((p) => `p.${p}`)
        .join(", ");
      return `- [${pgs || "p.?"}] (${n.node_type}) ${n.label}: ${(n.description || "").trim().slice(0, 200)}`;
    });
    const edgeLines = ctx.mindMapEdges.slice(0, 120).map((e) => {
      const a = ctx.mindMapNodes.find((n) => n.id === e.source_node_id)?.label ?? "?";
      const b = ctx.mindMapNodes.find((n) => n.id === e.target_node_id)?.label ?? "?";
      const lab = (e.label || e.relationship_type || "rel").trim();
      return `- ${a} —[${lab}]→ ${b}`;
    });
    blocks.push(`MIND MAP (structure hints only):\n${nodeLines.join("\n")}\nEDGES:\n${edgeLines.join("\n")}`);
  }

  return blocks.join("\n\n").slice(0, 28_000);
}

export function matchSectionsByTitles(ctx: LoadedDocumentOracleContext, titles: string[]): Set<number> {
  const pages = new Set<number>();
  const tset = titles.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tset.length === 0) return pages;
  for (const s of ctx.sections) {
    const low = s.title.trim().toLowerCase();
    if (tset.some((t) => low.includes(t) || t.includes(low))) {
      const a = s.page_start ?? s.page_end;
      const b = s.page_end ?? s.page_start;
      if (a != null) {
        const lo = Math.min(a, b ?? a);
        const hi = Math.max(a, b ?? a);
        for (let p = lo; p <= Math.min(hi, lo + 40); p++) pages.add(p);
      }
    }
  }
  return pages;
}

export function expandFocusPages(
  ctx: LoadedDocumentOracleContext,
  selections: FocusSelectionInput[],
): Set<number> | null {
  const direct = unionPagesFromFocusSelections(selections);
  const extra = new Set<number>();
  for (const s of selections) {
    const titles = s.source_sections ?? [];
    for (const p of matchSectionsByTitles(ctx, titles)) {
      extra.add(p);
    }
  }
  if (direct && extra.size) {
    const merged = new Set([...direct, ...extra]);
    return merged;
  }
  if (direct) return direct;
  if (extra.size) return extra;
  return null;
}
