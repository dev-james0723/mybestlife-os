"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  can_generate?: boolean;
  detail?: string;
  skipped?: string;
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

function MindMapCanvasSkeleton(props: { title: string; subtitle: string }) {
  return (
    <div
      className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#050508] h-[72dvh] min-h-[520px] md:h-[70dvh] md:min-h-[620px] xl:h-[min(76vh,760px)] xl:min-h-[620px]"
      role="status"
      aria-live="polite"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[13px] font-semibold text-white/90">{props.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55">{props.subtitle}</p>
      </div>
      <div className="relative min-h-0 flex-1 p-4">
        <div className="absolute inset-4 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="absolute left-[12%] top-[18%] h-16 w-[38%] max-w-[220px] animate-pulse rounded-lg bg-white/[0.09]" />
        <div className="absolute right-[10%] top-[28%] h-14 w-[32%] max-w-[200px] animate-pulse rounded-lg bg-white/[0.07]" />
        <div className="absolute bottom-[22%] left-[20%] h-12 w-[40%] max-w-[240px] animate-pulse rounded-lg bg-white/[0.08]" />
      </div>
    </div>
  );
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
  const [canGenerate, setCanGenerate] = useState<boolean | null>(null);
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<MindMapDbNode | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MindMapTypeFilterId>("all");
  const [regenBusy, setRegenBusy] = useState(false);
  const [autoGenBusy, setAutoGenBusy] = useState(false);
  const [genFailed, setGenFailed] = useState(false);
  const [failureKind, setFailureKind] = useState<"load" | "generate" | null>(null);
  const [branchNudge, setBranchNudge] = useState(0);
  const [unlockNudge, setUnlockNudge] = useState(0);
  const [mobileSheet, setMobileSheet] = useState(false);
  const [viewportResetKey, setViewportResetKey] = useState(0);

  const autoGenStartedRef = useRef(false);
  const genInFlightRef = useRef(false);
  const runGenerateRef = useRef<(force: boolean) => Promise<void>>(async () => {});

  const bumpViewport = useCallback(() => {
    setViewportResetKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setViewportResetKey(0);
    autoGenStartedRef.current = false;
    setGenFailed(false);
    setFailureKind(null);
    setDetail(undefined);
    setCanGenerate(null);
  }, [documentId]);

  const runGenerate = useCallback(
    async (force: boolean) => {
      if (genInFlightRef.current) return;
      genInFlightRef.current = true;
      setLoadErr(null);
      setGenFailed(false);
      setFailureKind(null);
      setRegenBusy(true);
      if (!force) setAutoGenBusy(true);
      try {
        const res = await fetch(`/api/document-brain/${encodeURIComponent(documentId)}/mind-map/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        const data = (await res.json()) as MindMapApiResponse & { error?: string; detail?: string };
        if (!res.ok) {
          const errBody = data as { error?: string; detail?: string };
          if (
            errBody.detail === "mind_map_tables_unavailable" ||
            errBody.error === "mind_map_tables_unavailable"
          ) {
            setDetail("mind_map_tables_unavailable");
            setLoadErr(null);
            setGenFailed(false);
            setFailureKind(null);
            return;
          }
          setLoadErr(typeof errBody.error === "string" ? errBody.error : "generate_failed");
          setGenFailed(true);
          setFailureKind("generate");
          return;
        }
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
        setStatus(data.status || "ready");
        setCanGenerate(false);
        if ((data.nodes?.length ?? 0) > 0) {
          bumpViewport();
        }
      } catch {
        setLoadErr("network");
        setGenFailed(true);
        setFailureKind("generate");
      } finally {
        setRegenBusy(false);
        setAutoGenBusy(false);
        genInFlightRef.current = false;
      }
    },
    [documentId, bumpViewport],
  );

  useEffect(() => {
    runGenerateRef.current = runGenerate;
  }, [runGenerate]);

  const load = useCallback(async () => {
    setLoadErr(null);
    setGenFailed(false);
    setFailureKind(null);
    setStatus("loading");
    try {
      const res = await fetch(`/api/document-brain/${encodeURIComponent(documentId)}/mind-map`);
      const data = (await res.json()) as MindMapApiResponse & { error?: string };
      if (!res.ok) {
        setLoadErr(typeof data.error === "string" ? data.error : "load_failed");
        setStatus("missing");
        setNodes([]);
        setEdges([]);
        setCanGenerate(false);
        setGenFailed(true);
        setFailureKind("load");
        return;
      }
      const detailStr = typeof data.detail === "string" ? data.detail : undefined;
      const canGen = typeof data.can_generate === "boolean" ? data.can_generate : false;
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
      setStatus(data.status || "missing");
      setCanGenerate(typeof data.can_generate === "boolean" ? data.can_generate : null);
      setDetail(detailStr);
      if ((data.nodes?.length ?? 0) > 0 && data.status === "ready") {
        bumpViewport();
      }
      const tablesUnavail =
        detailStr === "mind_map_tables_unavailable" ||
        (typeof data.error === "string" && data.error === "mind_map_tables_unavailable");
      if (data.status === "missing" && canGen === true && !tablesUnavail && !autoGenStartedRef.current) {
        autoGenStartedRef.current = true;
        void runGenerateRef.current(false);
      }
    } catch {
      setLoadErr("network");
      setStatus("missing");
      setNodes([]);
      setEdges([]);
      setCanGenerate(false);
      setGenFailed(true);
      setFailureKind("load");
    }
  }, [documentId, bumpViewport]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected) setMobileSheet(true);
  }, [selected]);

  const handleRetry = useCallback(async () => {
    if (failureKind === "load") {
      setGenFailed(false);
      setFailureKind(null);
      await load();
      return;
    }
    await runGenerate(true);
  }, [failureKind, load, runGenerate]);

  const noopExpand = useCallback(() => {}, []);
  const noopCollapse = useCallback(() => {}, []);

  const tablesUnavailable = detail === "mind_map_tables_unavailable";
  const showCanvas = nodes.length > 0;
  const showGeneratingSkeleton =
    !tablesUnavailable && !genFailed && !showCanvas && (autoGenBusy || regenBusy);
  const showLoadingSkeleton =
    !tablesUnavailable && !genFailed && !showCanvas && status === "loading" && !showGeneratingSkeleton;
  const showWaitingSkeleton =
    !tablesUnavailable &&
    !genFailed &&
    !showCanvas &&
    !showGeneratingSkeleton &&
    !showLoadingSkeleton &&
    status === "missing" &&
    canGenerate === false;

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-stretch">
      <div className="min-w-0 flex-1">
        {tablesUnavailable ? (
          <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-50/95">
            <p className="font-semibold">Mind Map database tables are not configured.</p>
            <p className="mt-1 text-white/70">
              Apply the Doc Oracle migration that creates `document_mind_map_nodes` and `document_mind_map_edges`, then reload.
            </p>
          </div>
        ) : null}

        {!tablesUnavailable && genFailed ? (
          <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-white/85">
            <p className="font-semibold">
              {failureKind === "load" ? "Could not load the Mind Map." : "Could not generate the Mind Map."}
            </p>
            {loadErr ? <p className="mt-1 text-white/60">{loadErr}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleRetry()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C8E53A] px-4 py-2 text-[12px] font-semibold text-black disabled:opacity-50"
                disabled={regenBusy}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {showLoadingSkeleton ? (
          <MindMapCanvasSkeleton
            title="Loading Mind Map…"
            subtitle="Fetching the saved mind map for this document."
          />
        ) : null}

        {showGeneratingSkeleton ? (
          <MindMapCanvasSkeleton
            title="Generating Mind Map…"
            subtitle="Doc Oracle is organizing concepts, sections, pages, glossary, and visuals into an interactive canvas."
          />
        ) : null}

        {showWaitingSkeleton ? (
          <MindMapCanvasSkeleton
            title="Loading Mind Map…"
            subtitle="The mind map will generate automatically as soon as document analysis finishes."
          />
        ) : null}

        {showCanvas ? (
          <MindMapCanvas
            dbNodes={nodes}
            dbEdges={edges}
            selectedId={selected?.id ?? null}
            viewportResetKey={viewportResetKey}
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
            onRegenerate={() => void runGenerate(true)}
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
