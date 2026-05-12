"use client";

import { useCallback, useEffect, useState } from "react";
import type { MindMapDbEdge, MindMapDbNode } from "@/lib/document-brain/mind-map/mindMapTypes";
import { MindMapCanvas } from "@/components/document-oracle/mind-map/MindMapCanvas";
import { MindMapDetailPanel } from "@/components/document-oracle/mind-map/MindMapDetailPanel";
import type { MindMapTypeFilterId } from "@/components/document-oracle/mind-map/MindMapToolbar";
import type { DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import type { DocOracleChatRetrievalFocus } from "@/components/document-oracle/DocOracleChatPanel";

type MindMapApiResponse = {
  nodes: MindMapDbNode[];
  edges: MindMapDbEdge[];
  generated_at: string | null;
  status: "ready" | "missing" | string;
};

function sectionTitles(sections: DocOracleSectionRow[], ids: string[]): string {
  return ids
    .map((id) => sections.find((s) => s.id === id)?.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, 8)
    .join(", ");
}

function visualTitles(visuals: DocOracleVisualRow[], ids: string[]): string {
  return ids
    .map((id) => visuals.find((v) => v.id === id)?.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, 8)
    .join(", ");
}

function buildMindMapChatPrompt(
  node: MindMapDbNode,
  sections: DocOracleSectionRow[],
  visuals: DocOracleVisualRow[],
): string {
  const pages = (node.page_numbers ?? []).slice(0, 24).join(", ");
  const secTitles = sectionTitles(sections, node.section_ids ?? []);
  const visTitles = visualTitles(visuals, node.visual_asset_ids ?? []);

  if (node.node_type === "visual") {
    return `Explain this visual and how it relates to the document.\nVisual: ${node.label}\nRelated pages: ${pages || "unknown"}\nRelated sections: ${secTitles || "n/a"}\nPlease stay document-grounded and cite source pages.`;
  }
  if (node.node_type === "glossary") {
    return `Define this term and explain where it appears in the document.\nTerm: ${node.label}\nType: ${node.node_type}\nRelated pages: ${pages || "unknown"}\nRelated sections: ${secTitles || "n/a"}\nCite pages where this term is supported.`;
  }
  return [
    "Please explain this concept from the document:",
    `Concept: ${node.label}`,
    `Type: ${node.node_type}`,
    `Related pages: ${pages || "n/a"}`,
    `Related sections: ${secTitles || "n/a"}`,
    `Related visuals: ${visTitles || "n/a"}`,
    "Please explain how it connects to the rest of the document and cite the source pages.",
  ].join("\n");
}

function retrievalForNode(node: MindMapDbNode): DocOracleChatRetrievalFocus | null {
  const pages = node.page_numbers ?? [];
  if (pages.length === 0) return null;
  const lo = Math.min(...pages);
  const hi = Math.max(...pages);
  return { pageStart: lo, pageEnd: hi, sectionTitle: null };
}

export function DocOracleMindMapPanel(props: {
  documentId: string;
  sections: DocOracleSectionRow[];
  glossary: DocOracleGlossaryRow[];
  visuals: DocOracleVisualRow[];
  onOpenSourcePage: (page: number) => void;
  onOpenVisual: (v: DocOracleVisualRow) => void;
  onFocusGlossary: (g: DocOracleGlossaryRow) => void;
  onFocusSection: (s: DocOracleSectionRow) => void;
  onAskMindMapNode: (prompt: string, retrieval: DocOracleChatRetrievalFocus | null) => void;
}) {
  const { documentId, sections, glossary, visuals, onOpenSourcePage, onOpenVisual, onFocusGlossary, onFocusSection, onAskMindMapNode } =
    props;

  const [status, setStatus] = useState<string>("loading");
  const [nodes, setNodes] = useState<MindMapDbNode[]>([]);
  const [edges, setEdges] = useState<MindMapDbEdge[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<MindMapDbNode | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MindMapTypeFilterId>("all");
  const [regenBusy, setRegenBusy] = useState(false);
  const [branchNudge, setBranchNudge] = useState(0);
  const [unlockNudge, setUnlockNudge] = useState(0);
  const [mobileSheet, setMobileSheet] = useState(false);

  const load = useCallback(async () => {
    setLoadErr(null);
    setStatus("loading");
    try {
      const res = await fetch(`/api/document-brain/${encodeURIComponent(documentId)}/mind-map`);
      const data = (await res.json()) as MindMapApiResponse & { error?: string };
      if (!res.ok) {
        setLoadErr(typeof data.error === "string" ? data.error : "load_failed");
        setStatus("missing");
        setNodes([]);
        setEdges([]);
        return;
      }
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
      setStatus(data.status || "missing");
    } catch {
      setLoadErr("network");
      setStatus("missing");
      setNodes([]);
      setEdges([]);
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected) setMobileSheet(true);
  }, [selected]);

  const onRegenerate = useCallback(async () => {
    setRegenBusy(true);
    setLoadErr(null);
    try {
      const res = await fetch(`/api/document-brain/${encodeURIComponent(documentId)}/mind-map/generate`, {
        method: "POST",
      });
      const data = (await res.json()) as MindMapApiResponse & { error?: string; detail?: string };
      if (!res.ok) {
        setLoadErr(typeof data.error === "string" ? data.error : "generate_failed");
        await load();
        return;
      }
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
      setStatus(data.status || "ready");
    } catch {
      setLoadErr("network");
      await load();
    } finally {
      setRegenBusy(false);
    }
  }, [documentId, load]);

  const noopExpand = useCallback(() => {}, []);
  const noopCollapse = useCallback(() => {}, []);

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-stretch">
      <div className="min-w-0 flex-1">
        {loadErr ? <p className="mb-2 text-[12px] text-amber-200/90">Mind map: {loadErr}</p> : null}
        {status === "missing" && !regenBusy ? (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] text-white/70">
            <p>No mind map yet. Generate one from your normalized sections, pages, glossary, and visuals.</p>
            <button
              type="button"
              onClick={() => void onRegenerate()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#C8E53A] px-4 py-2 text-[12px] font-semibold text-black disabled:opacity-50"
              disabled={regenBusy}
            >
              Generate mind map
            </button>
          </div>
        ) : null}
        {status === "loading" && nodes.length === 0 ? (
          <p className="text-[12px] text-white/55">Loading mind map…</p>
        ) : null}
        {nodes.length > 0 ? (
          <MindMapCanvas
            dbNodes={nodes}
            dbEdges={edges}
            selectedId={selected?.id ?? null}
            onSelect={(n) => {
              setSelected(n);
              if (n && typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
                setMobileSheet(true);
              }
            }}
            search={search}
            typeFilter={typeFilter}
            onSearchChange={setSearch}
            onTypeFilterChange={setTypeFilter}
            onExpandAll={noopExpand}
            onCollapseAll={noopCollapse}
            onRegenerate={() => void onRegenerate()}
            regenerateBusy={regenBusy}
            branchNudge={branchNudge}
            unlockNeighborsNudge={unlockNudge}
          />
        ) : null}
      </div>

      <div className="hidden w-full shrink-0 lg:block lg:w-[300px] xl:w-[320px]">
        <MindMapDetailPanel
          variant="desktop"
          node={selected}
          edges={edges}
          allNodes={nodes}
          sections={sections}
          glossary={glossary}
          visuals={visuals}
          onAskAi={(n) => {
            onAskMindMapNode(buildMindMapChatPrompt(n, sections, visuals), retrievalForNode(n));
          }}
          onOpenPage={onOpenSourcePage}
          onOpenVisual={onOpenVisual}
          onFocusGlossary={onFocusGlossary}
          onFocusSection={onFocusSection}
          onFocusConnected={() => setUnlockNudge((x) => x + 1)}
          onBranchToggleRequest={() => setBranchNudge((x) => x + 1)}
        />
      </div>

      {mobileSheet && selected ? (
        <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Close detail"
            onClick={() => {
              setMobileSheet(false);
              setSelected(null);
            }}
          />
          <MindMapDetailPanel
            variant="sheet"
            node={selected}
            edges={edges}
            allNodes={nodes}
            sections={sections}
            glossary={glossary}
            visuals={visuals}
            onClose={() => {
              setMobileSheet(false);
              setSelected(null);
            }}
            onAskAi={(n) => {
              onAskMindMapNode(buildMindMapChatPrompt(n, sections, visuals), retrievalForNode(n));
              setMobileSheet(false);
            }}
            onOpenPage={onOpenSourcePage}
            onOpenVisual={onOpenVisual}
            onFocusGlossary={onFocusGlossary}
            onFocusSection={onFocusSection}
            onFocusConnected={() => setUnlockNudge((x) => x + 1)}
            onBranchToggleRequest={() => setBranchNudge((x) => x + 1)}
          />
        </div>
      ) : null}
    </div>
  );
}
