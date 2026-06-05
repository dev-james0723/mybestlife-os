"use client";

import { ChevronDown, MessageCircle, Sparkles } from "lucide-react";
import type { MindMapDbEdge, MindMapDbNode } from "@/lib/document-brain/mind-map/mindMapTypes";
import type { DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import { cn } from "@/lib/utils";

const primaryBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground shadow-sm transition hover:brightness-[1.03] disabled:opacity-45";

const ghostBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-medium text-white/85 transition hover:bg-white/10";

type Evidence = { page: number; quote: string };

function readEvidence(meta: unknown): Evidence[] {
  if (!meta || typeof meta !== "object") return [];
  const ev = (meta as { evidence?: unknown }).evidence;
  if (!Array.isArray(ev)) return [];
  const out: Evidence[] = [];
  for (const x of ev) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const page = typeof o.page === "number" && Number.isFinite(o.page) ? Math.floor(o.page) : null;
    const quote = typeof o.quote === "string" ? o.quote : "";
    if (page != null && quote) out.push({ page, quote: quote.slice(0, 280) });
  }
  return out;
}

export function MindMapDetailPanel(props: {
  node: MindMapDbNode | null;
  edges: MindMapDbEdge[];
  allNodes: MindMapDbNode[];
  sections: DocOracleSectionRow[];
  glossary: DocOracleGlossaryRow[];
  visuals: DocOracleVisualRow[];
  onClose?: () => void;
  onAskAi: (node: MindMapDbNode) => void;
  onOpenPage: (page: number) => void;
  onOpenVisual: (v: DocOracleVisualRow) => void;
  onFocusGlossary: (g: DocOracleGlossaryRow) => void;
  onFocusSection: (s: DocOracleSectionRow) => void;
  onFocusConnected: () => void;
  onBranchToggleRequest: () => void;
  variant: "desktop" | "sheet";
}) {
  const {
    node,
    edges,
    allNodes,
    sections,
    glossary,
    visuals,
    onClose,
    onAskAi,
    onOpenPage,
    onOpenVisual,
    onFocusGlossary,
    onFocusSection,
    onFocusConnected,
    onBranchToggleRequest,
    variant,
  } = props;

  if (!node) return null;

  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const relatedEdges = edges.filter((e) => e.source_node_id === node.id || e.target_node_id === node.id);
  const neighbors = relatedEdges
    .map((e) => {
      const other = e.source_node_id === node.id ? e.target_node_id : e.source_node_id;
      const n = byId.get(other);
      if (!n) return null;
      return { edge: e, node: n };
    })
    .filter((x): x is { edge: MindMapDbEdge; node: MindMapDbNode } => x != null);

  const sectionRows = (node.section_ids ?? [])
    .map((id) => sections.find((s) => s.id === id))
    .filter((x): x is DocOracleSectionRow => x != null);
  const glossRows = (node.glossary_term_ids ?? [])
    .map((id) => glossary.find((g) => g.id === id))
    .filter((x): x is DocOracleGlossaryRow => x != null);
  const visualRows = (node.visual_asset_ids ?? [])
    .map((id) => visuals.find((v) => v.id === id))
    .filter((x): x is DocOracleVisualRow => x != null);

  const evidence = readEvidence(node.metadata);
  const kw = (node.keywords ?? []).slice(0, 16);

  const shell = cn(
    "flex flex-col gap-3 text-[12px] text-white/80",
    variant === "sheet"
      ? "max-h-[60dvh] overflow-y-auto rounded-t-2xl border border-white/10 border-b-0 bg-[#0a0a0e] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.55)]"
      : "h-full min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0e]/95 p-4",
  );

  return (
    <aside className={shell} aria-label="Mind map node details">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/90">{node.node_type.replace(/_/g, " ")}</p>
          <h2 className="mt-1 text-[15px] font-semibold leading-snug text-white">{node.label}</h2>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="shrink-0 rounded-md px-2 py-1 text-[11px] text-white/50 hover:bg-white/10 hover:text-white">
            Close
          </button>
        ) : null}
      </div>

      {node.description ? <p className="leading-relaxed text-white/70">{node.description}</p> : null}

      {node.importance_score != null ? (
        <p className="text-[11px] text-white/50">
          Importance: <span className="tabular-nums text-white/80">{node.importance_score.toFixed(2)}</span>
        </p>
      ) : null}

      {kw.length ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Keywords</p>
          <div className="flex flex-wrap gap-1">
            {kw.map((k) => (
              <span key={k} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
                {k}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {(node.page_numbers ?? []).length ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Pages</p>
          <div className="flex flex-wrap gap-1">
            {(node.page_numbers ?? []).slice(0, 24).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onOpenPage(p)}
                className="rounded-md border border-white/12 bg-white/5 px-2 py-1 text-[11px] text-primary hover:bg-white/10"
              >
                p.{p}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sectionRows.length ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Sections</p>
          <ul className="space-y-1">
            {sectionRows.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onFocusSection(s)} className="text-left text-[12px] text-sky-300/90 hover:underline">
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {glossRows.length ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Glossary</p>
          <ul className="space-y-1">
            {glossRows.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => onFocusGlossary(g)} className="text-left text-[12px] text-emerald-300/90 hover:underline">
                  {g.term}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {visualRows.length ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Visuals</p>
          <ul className="space-y-1">
            {visualRows.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => onOpenVisual(v)} className="text-left text-[12px] text-pink-300/90 hover:underline">
                  {v.title || "Visual"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {evidence.length ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Evidence</p>
          <ul className="space-y-2">
            {evidence.map((ev, i) => (
              <li key={`${ev.page}-${i}`}>
                <button type="button" onClick={() => onOpenPage(ev.page)} className="w-full rounded-lg border border-white/10 bg-black/40 p-2 text-left hover:border-primary/35">
                  <span className="text-[10px] font-semibold text-primary">p.{ev.page}</span>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/65">{ev.quote}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {neighbors.length ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Connections</p>
          <ul className="space-y-1.5">
            {neighbors.slice(0, 14).map(({ edge, node: n2 }) => (
              <li key={`${edge.id}-${n2.id}`} className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-1.5 text-[11px]">
                <span className="text-white/55">{edge.relationship_type ?? "link"}</span>
                {edge.label ? <span className="text-white/40"> · {edge.label}</span> : null}
                <div className="mt-0.5 font-medium text-white/85">{n2.label}</div>
                {edge.description ? <p className="mt-0.5 text-[10px] text-white/50">{edge.description}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-1 flex flex-col gap-2 border-t border-white/10 pt-3">
        <button type="button" className={primaryBtn} onClick={() => onAskAi(node)}>
          <MessageCircle className="size-4" aria-hidden />
          Ask Doc Oracle about this
        </button>
        <button type="button" className={ghostBtn} onClick={onFocusConnected}>
          <Sparkles className="size-3.5" aria-hidden />
          Focus connected nodes
        </button>
        <button type="button" className={ghostBtn} onClick={onBranchToggleRequest}>
          <ChevronDown className="size-3.5" aria-hidden />
          Expand / collapse branch
        </button>
      </div>
    </aside>
  );
}
