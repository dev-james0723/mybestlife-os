"use client";

import Image from "next/image";
import { useEffect, Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { mapRowToItem, type KnowledgeItem, type SmartCollection } from "@/types/knowledge";
import { mapRowToDocumentBrainJob } from "@/lib/document-brain/map-extraction-job-row";
import { notifyKnowledgeItemProgressCompared } from "@/lib/knowledge/knowledge-completion-notify";
import { KnowledgeSidebar } from "./KnowledgeSidebar";
import { KnowledgeTopControlBar } from "./KnowledgeTopControlBar";
import { KnowledgeActiveFiltersBar } from "./KnowledgeActiveFiltersBar";
import { KnowledgeContent } from "./KnowledgeContent";
import { KnowledgeInquiryAgent } from "./KnowledgeInquiryAgent";
import { KnowledgeAIPanel } from "./KnowledgeAIPanel";
import { KnowledgeDetailSheet } from "./KnowledgeDetailSheet";
import { AddKnowledgeModal } from "./AddKnowledgeModal";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, FileText, Link2, Type, UploadCloud, X } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { useProfile } from "@/hooks/use-settings";
import { useCommandLightInteraction } from "@/hooks/use-command-light-interaction";
import { normalizeKnowledgeQuickFilters } from "@/lib/knowledge/quick-filters";
import { cn } from "@/lib/utils";

interface KnowledgeLayoutProps {
  initialItems: KnowledgeItem[];
  initialCollections: SmartCollection[];
  userId: string;
}

function KnowledgeDeepLinkSync() {
  const searchParams = useSearchParams();
  const items = useKnowledgeStore((s) => s.items);
  const selectItem = useKnowledgeStore((s) => s.selectItem);
  useEffect(() => {
    const id = searchParams.get("item")?.trim();
    if (!id) return;
    if (items.some((i) => i.id === id)) selectItem(id);
  }, [searchParams, items, selectItem]);
  return null;
}

function firstUrlFromDroppedText(value: string): string | null {
  const candidates = value
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {
      /* keep scanning */
    }
  }
  return null;
}

function KnowledgeAddDropZone({ ui }: { ui: ReturnType<typeof getKnowledgeUiCopy> }) {
  const reduceMotion = useReducedMotion();
  const {
    ref: commandLightRef,
    style: commandLightStyle,
    handlers: commandLightHandlers,
  } = useCommandLightInteraction(reduceMotion);
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);
  const [isDragOver, setIsDragOver] = useState(false);
  const lastDropAtRef = useRef(0);

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    lastDropAtRef.current = Date.now();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      openAddModal({ tab: "file", files });
      return;
    }

    const uriList = event.dataTransfer
      .getData("text/uri-list")
      .split(/\n+/)
      .find((line) => line.trim() && !line.trim().startsWith("#"));
    const plainText = event.dataTransfer.getData("text/plain").trim();
    const url = firstUrlFromDroppedText(uriList || plainText);
    if (url) {
      openAddModal({ tab: "url", url });
      return;
    }
    if (plainText) {
      openAddModal({ tab: "text", text: plainText });
      return;
    }
    openAddModal();
  };

  const handleClick = () => {
    if (Date.now() - lastDropAtRef.current < 700) return;
    openAddModal();
  };

  return (
    <button
      ref={commandLightRef}
      type="button"
      onClick={handleClick}
      {...commandLightHandlers}
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
      className={cn(
        "knowledge-command-light-button knowledge-command-light-button--capture group relative flex min-h-[86px] w-full touch-pan-y isolate overflow-hidden rounded-xl border p-3 text-left text-slate-900 outline-none transition-[border-color,box-shadow,filter,transform] focus-visible:ring-2 focus-visible:ring-amber-300/55 sm:p-3.5",
        "border-amber-200/70 bg-[linear-gradient(135deg,#fffdf7_0%,#fff7dd_52%,#f6dfad_100%)] shadow-[0_14px_34px_rgba(146,104,21,0.13)] hover:-translate-y-0.5 hover:border-amber-300/80 hover:shadow-[0_18px_42px_rgba(146,104,21,0.18)]",
        "dark:border-amber-200/24 dark:bg-[linear-gradient(135deg,#12100d_0%,#2b2414_52%,#765a24_100%)] dark:text-amber-50 dark:shadow-[0_18px_46px_rgba(118,87,30,0.25)] dark:hover:border-amber-100/45 dark:hover:shadow-[0_22px_56px_rgba(130,96,31,0.34)]",
        isDragOver &&
          "border-amber-400/85 shadow-[0_20px_52px_rgba(217,119,6,0.2)] dark:border-amber-100/70 dark:shadow-[0_24px_68px_rgba(245,158,11,0.34)]",
      )}
      style={commandLightStyle}
      aria-label="Add knowledge. Drop files, links, or text here."
    >
      <span
        className="knowledge-command-light-aurora"
        data-high-stimulus="true"
        data-reduced-during-focus="true"
        aria-hidden
      />
      <span
        className="knowledge-command-light-cursor"
        data-high-stimulus="true"
        data-reduced-during-focus="true"
        aria-hidden
      />
      <span className="relative z-10 flex w-full min-w-0 items-start">
        <span className="flex min-w-0 items-start gap-3 pr-20 sm:pr-36">
          <span className="mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-amber-200/80 bg-white/72 shadow-inner dark:border-amber-100/20 dark:bg-black/28">
            <Image
              src="/images/knowledge/add-knowledge-mark.png"
              alt=""
              width={88}
              height={88}
              className="h-full w-full object-cover"
              aria-hidden
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-amber-700/85 dark:text-amber-100/72">
              Capture
            </span>
            <span className="mt-0.5 block text-base font-semibold leading-tight text-slate-950 dark:text-amber-50">
              {ui.addKnowledge}
            </span>
            <span className="mt-1 block max-w-2xl text-xs leading-5 text-slate-600 dark:text-amber-50/76 sm:text-sm">
              Drop files here ✨ PDFs, notes, images, audio, video
            </span>
          </span>
        </span>
        <span className="absolute right-0 top-0 flex max-w-[46%] shrink-0 flex-col items-end gap-1.5">
          <span className="inline-flex h-8 max-w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200/80 bg-white/65 px-2.5 text-[11px] font-semibold text-amber-800 shadow-sm dark:border-amber-100/24 dark:bg-black/20 dark:text-amber-50/92 sm:h-9 sm:px-3 sm:text-xs">
            <UploadCloud className="h-3.5 w-3.5" aria-hidden />
            <span className="truncate">or click to add</span>
          </span>
          <span className="hidden justify-end gap-1.5 text-amber-700/55 dark:text-amber-50/60 md:flex" aria-hidden>
            <FileText className="h-3.5 w-3.5" />
            <Link2 className="h-3.5 w-3.5" />
            <Type className="h-3.5 w-3.5" />
          </span>
        </span>
      </span>
    </button>
  );
}

function KnowledgeAskCommandSection({ userId }: { userId: string }) {
  const reduceMotion = useReducedMotion();
  const {
    ref: commandLightRef,
    style: commandLightStyle,
    handlers: commandLightHandlers,
  } = useCommandLightInteraction(reduceMotion);
  const isAIPanelOpen = useKnowledgeStore((s) => s.isAIPanelOpen);
  const openAIPanel = useKnowledgeStore((s) => s.openAIPanel);
  const closeAIPanel = useKnowledgeStore((s) => s.closeAIPanel);
  const items = useKnowledgeStore((s) => s.items);
  const aiPanelRetrievalRunId = useKnowledgeStore((s) => s.aiPanelRetrievalRunId);
  const aiPanelHandoffId = useKnowledgeStore((s) => s.aiPanelHandoffId);
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language).aiPanel;
  const panelId = "knowledge-ask-my-kb-panel";

  useEffect(() => {
    if (!isAIPanelOpen || aiPanelHandoffId === 0) return;
    const timer = window.setTimeout(() => {
      window.document
        .getElementById(panelId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [aiPanelHandoffId, isAIPanelOpen, panelId]);

  return (
    <section className="max-w-full" aria-label={ui.title}>
      <button
        ref={commandLightRef}
        type="button"
        onClick={() => (isAIPanelOpen ? closeAIPanel() : openAIPanel())}
        {...commandLightHandlers}
        className="knowledge-command-light-button knowledge-command-light-button--ask group relative flex min-h-[86px] w-full touch-pan-y isolate overflow-hidden rounded-xl border border-cyan-200/80 bg-[linear-gradient(135deg,#fbfdff_0%,#edf8ff_50%,#d8eff8_100%)] p-3 text-left text-slate-900 shadow-[0_14px_34px_rgba(14,116,144,0.12)] outline-none transition-[border-color,box-shadow,filter,transform] hover:-translate-y-0.5 hover:border-cyan-300/85 hover:shadow-[0_18px_44px_rgba(14,116,144,0.17)] focus-visible:ring-2 focus-visible:ring-cyan-300/55 dark:border-cyan-200/22 dark:bg-[linear-gradient(135deg,#0b1118_0%,#102033_50%,#16516a_100%)] dark:text-cyan-50 dark:shadow-[0_18px_48px_rgba(21,88,116,0.24)] dark:hover:border-cyan-100/42 dark:hover:shadow-[0_22px_58px_rgba(22,104,136,0.33)] sm:p-3.5"
        style={commandLightStyle}
        aria-expanded={isAIPanelOpen}
        aria-controls={panelId}
      >
        <span
          className="knowledge-command-light-aurora"
          data-high-stimulus="true"
          data-reduced-during-focus="true"
          aria-hidden
        />
        <span
          className="knowledge-command-light-cursor"
          data-high-stimulus="true"
          data-reduced-during-focus="true"
          aria-hidden
        />
        <span className="relative z-10 flex w-full min-w-0 items-start">
          <span className="flex min-w-0 items-start gap-3 pr-20 sm:pr-36">
            <span className="mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-cyan-200/80 bg-white/72 shadow-inner dark:border-cyan-100/20 dark:bg-black/28">
              <Image
                src="/images/knowledge/ask-my-kb-mark.png"
                alt=""
                width={88}
                height={88}
                className="h-full w-full object-cover"
                aria-hidden
              />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-cyan-700/85 dark:text-cyan-100/72">
                Reason over memory
              </span>
              <span className="mt-0.5 block text-base font-semibold leading-tight text-slate-950 dark:text-cyan-50">
                Ask My Knowledge Base
              </span>
              <span className="mt-1 block max-w-2xl text-xs leading-5 text-slate-600 dark:text-cyan-50/76 sm:text-sm">
                Chat with saved knowledge, history, projects, and citations.
              </span>
            </span>
          </span>
          <span className="absolute right-0 top-0 inline-flex h-8 max-w-24 shrink-0 items-center justify-center gap-1 rounded-lg border border-cyan-200/80 bg-white/65 px-2 text-[11px] font-semibold text-cyan-800 shadow-sm dark:border-cyan-100/24 dark:bg-black/20 dark:text-cyan-50/92 sm:h-9 sm:max-w-[46%] sm:gap-1.5 sm:px-3 sm:text-xs">
            <span className="truncate sm:hidden">
              {isAIPanelOpen
                ? "Close"
                : aiPanelRetrievalRunId
                  ? "Attached"
                  : `${items.length} items`}
            </span>
            <span className="hidden truncate sm:inline">
              {isAIPanelOpen
                ? "Close"
                : aiPanelRetrievalRunId
                  ? "Knowledge attached"
                  : `${items.length} items`}
            </span>
            {isAIPanelOpen ? (
              <X className="h-3.5 w-3.5 opacity-75" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 -rotate-90 opacity-75" aria-hidden />
            )}
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isAIPanelOpen ? (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="min-w-0 overflow-hidden"
          >
            <div className="mt-2 rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex h-[calc(100dvh-1rem)] min-h-[760px] min-w-0 flex-col overflow-hidden rounded-[1rem] border border-border/70 bg-card shadow-sm sm:h-[min(90dvh,840px)] sm:min-h-[640px] lg:h-[min(72dvh,680px)] lg:min-h-[460px]">
                <KnowledgeAIPanel userId={userId} layout="top" hideHeader />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export function KnowledgeLayout({
  initialItems,
  initialCollections,
  userId,
}: KnowledgeLayoutProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const setQuickFilterDefinitions = useKnowledgeStore(
    (s) => s.setQuickFilterDefinitions,
  );
  const isAIPanelOpen = useKnowledgeStore((s) => s.isAIPanelOpen);
  const isAddModalOpen = useKnowledgeStore((s) => s.isAddModalOpen);
  const selectedItemId = useKnowledgeStore((s) => s.selectedItemId);
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);
  const openAIPanel = useKnowledgeStore((s) => s.openAIPanel);
  const closeAIPanel = useKnowledgeStore((s) => s.closeAIPanel);
  const currentView = useKnowledgeStore((s) => s.currentView);
  const profile = useProfile();

  useEffect(() => {
    hydrate(initialItems, initialCollections);
  }, [hydrate, initialItems, initialCollections]);

  useEffect(() => {
    setQuickFilterDefinitions(
      normalizeKnowledgeQuickFilters(profile.data?.knowledge_quick_filters),
    );
  }, [profile.data?.knowledge_quick_filters, setQuickFilterDefinitions]);

  useEffect(() => {
    // Constellation View has manual node dragging / firework layout.
    // Realtime updates can rebuild graph data and disturb positions, so
    // keep Constellation stable until the user explicitly hits Refresh
    // in the graph toolbar.
    if (currentView === "constellation") return;
    const supabase = createClient();
    const channel = supabase
      .channel("knowledge_items_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "knowledge_items",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string } | null)?.id;
            if (deletedId) useKnowledgeStore.getState().removeItem(deletedId);
          } else if (payload.new) {
            const newItem = mapRowToItem(payload.new as Record<string, unknown>);
            if (payload.eventType === "UPDATE") {
              const prev =
                useKnowledgeStore.getState().items.find((i) => i.id === newItem.id) ?? null;
              void notifyKnowledgeItemProgressCompared(prev, newItem);
            }
            useKnowledgeStore.getState().upsertItem(newItem);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentView]);

  useEffect(() => {
    if (currentView === "constellation") return;
    const supabase = createClient();
    const channel = supabase
      .channel("document_extraction_jobs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "document_extraction_jobs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const docId = (payload.old as { document_id?: string } | null)?.document_id;
            if (!docId) return;
            const store = useKnowledgeStore.getState();
            const prev = store.items.find((i) => i.id === docId);
            if (prev) store.upsertItem({ ...prev, documentBrainJob: undefined });
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row || typeof row.document_id !== "string") return;
          const docId = row.document_id as string;
          const job = mapRowToDocumentBrainJob(row);
          const store = useKnowledgeStore.getState();
          const prev = store.items.find((i) => i.id === docId);
          if (!prev) return;
          store.upsertItem({ ...prev, documentBrainJob: job });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentView]);

  // Polling backup: even if Supabase Realtime is misconfigured (publication
  // missing, RLS replica identity off, channel drops), the user still sees
  // their newly-added items light up after AI processing finishes. We only
  // hit the database while at least one item is in `processing`, so this is
  // free when the page is idle.
  useEffect(() => {
    // Disable the 20s polling heartbeat while Constellation is active.
    // The graph must not refresh itself and destroy manual layout work;
    // Constellation has its own explicit Refresh button.
    if (currentView === "constellation") return;
    const supabase = createClient();
    let cancelled = false;

    const refreshProcessingItems = async () => {
      const itemsNow = useKnowledgeStore.getState().items;
      const processingIds = itemsNow
        .filter((i) => i.status === "processing")
        .map((i) => i.id);

      // Always also refetch the most-recent rows so brand new items
      // (inserted from another tab / device) appear quickly even when the
      // current store has nothing in `processing`.
      const baseQuery = supabase
        .from("knowledge_items")
        .select("*")
        .eq("user_id", userId)
        .order("date_added", { ascending: false })
        .limit(processingIds.length > 0 ? 50 : 6);

      const { data, error } = await baseQuery;
      if (cancelled || error || !data) return;

      const store = useKnowledgeStore.getState();
      const itemIds = (data as { id: string }[]).map((r) => r.id);
      let jobRows: Record<string, unknown>[] = [];
      if (itemIds.length > 0) {
        const chunkSize = 120;
        for (let i = 0; i < itemIds.length; i += chunkSize) {
          const chunk = itemIds.slice(i, i + chunkSize);
          const { data: jobs, error: jobErr } = await supabase
            .from("document_extraction_jobs")
            .select("*")
            .eq("user_id", userId)
            .in("document_id", chunk)
            .order("created_at", { ascending: false });
          if (!jobErr && jobs) jobRows = jobRows.concat(jobs as Record<string, unknown>[]);
        }
      }
      const latestJobByDoc = new Map<string, ReturnType<typeof mapRowToDocumentBrainJob>>();
      for (const row of jobRows) {
        const docId = row.document_id as string;
        if (!latestJobByDoc.has(docId)) {
          latestJobByDoc.set(docId, mapRowToDocumentBrainJob(row));
        }
      }

      for (const row of data) {
        const newItem = mapRowToItem(row as Record<string, unknown>);
        const job = latestJobByDoc.get(newItem.id);
        const merged = job ? { ...newItem, documentBrainJob: job } : newItem;
        const prev = store.items.find((i) => i.id === merged.id) ?? null;
        if (prev) {
          void notifyKnowledgeItemProgressCompared(prev, merged);
        }
        store.upsertItem(merged);
      }
    };

    // Tight loop while something is actively processing (~3.5s); slower
    // background heartbeat otherwise (~20s) just to catch missed events.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (cancelled) return;
      const hasProcessing = useKnowledgeStore
        .getState()
        .items.some((i) => i.status === "processing");
      const hasActiveBrainJob = useKnowledgeStore.getState().items.some((i) => {
        const s = i.documentBrainJob?.status;
        return (
          s &&
          s !== "completed" &&
          s !== "failed" &&
          s !== "cancelled"
        );
      });
      const delay = hasProcessing || hasActiveBrainJob ? 3500 : 20_000;
      timer = setTimeout(async () => {
        await refreshProcessingItems().catch(() => {});
        schedule();
      }, delay);
    };

    // Kick off after a short delay so we don't hammer the DB on first paint.
    timer = setTimeout(schedule, 800);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [userId, currentView]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openAddModal();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        if (isAIPanelOpen) closeAIPanel();
        else openAIPanel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openAddModal, openAIPanel, closeAIPanel, isAIPanelOpen]);

  return (
    <PageShell
      title={ui.pageTitle}
      description={ui.pageDescription}
    >
      <Suspense fallback={null}>
        <KnowledgeDeepLinkSync />
      </Suspense>
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
          <KnowledgeSidebar />

          {/* When the user picks Constellation View, give the graph
              significantly more vertical room. Other views (gallery /
              board / table) keep their original min-height so card
              grids don't stretch awkwardly tall on huge screens. */}
          <div
            className={`flex min-w-0 flex-1 flex-col gap-4 ${
              currentView === "constellation"
                ? "lg:min-h-[min(82dvh,820px)]"
                : "lg:min-h-[min(70vh,640px)]"
            }`}
          >
            <KnowledgeAddDropZone ui={ui} />
            <KnowledgeAskCommandSection userId={userId} />
            <KnowledgeInquiryAgent />

            <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-border/70 shadow-sm lg:h-full">
              <CardContent className="flex flex-1 flex-col gap-0 p-0">
                {currentView !== "constellation" && (
                  <>
                    <KnowledgeTopControlBar />
                    <KnowledgeActiveFiltersBar />
                  </>
                )}
                <KnowledgeContent userId={userId} />
              </CardContent>
            </Card>
          </div>
        </div>

        {selectedItemId && <KnowledgeDetailSheet />}
        {isAddModalOpen && <AddKnowledgeModal />}
      </div>
    </PageShell>
  );
}
