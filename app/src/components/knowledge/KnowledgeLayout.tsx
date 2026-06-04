"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { mapRowToItem, type KnowledgeItem, type SmartCollection } from "@/types/knowledge";
import { mapRowToDocumentBrainJob } from "@/lib/document-brain/map-extraction-job-row";
import { notifyKnowledgeItemProgressCompared } from "@/lib/knowledge/knowledge-completion-notify";
import { KnowledgeSidebar } from "./KnowledgeSidebar";
import { KnowledgePageActions } from "./KnowledgePageActions";
import { KnowledgeTopControlBar } from "./KnowledgeTopControlBar";
import { KnowledgeActiveFiltersBar } from "./KnowledgeActiveFiltersBar";
import { KnowledgeContent } from "./KnowledgeContent";
import { KnowledgeInquiryAgent } from "./KnowledgeInquiryAgent";
import { KnowledgeAIPanel } from "./KnowledgeAIPanel";
import { KnowledgeDetailSheet } from "./KnowledgeDetailSheet";
import { AddKnowledgeModal } from "./AddKnowledgeModal";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OSControl, OSIconControl } from "@/components/ui/os-primitives";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";

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

export function KnowledgeLayout({
  initialItems,
  initialCollections,
  userId,
}: KnowledgeLayoutProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const isAIPanelOpen = useKnowledgeStore((s) => s.isAIPanelOpen);
  const isAddModalOpen = useKnowledgeStore((s) => s.isAddModalOpen);
  const selectedItemId = useKnowledgeStore((s) => s.selectedItemId);
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);
  const openAIPanel = useKnowledgeStore((s) => s.openAIPanel);
  const closeAIPanel = useKnowledgeStore((s) => s.closeAIPanel);
  const toggleMobileSidebar = useKnowledgeStore((s) => s.toggleMobileSidebar);
  const currentView = useKnowledgeStore((s) => s.currentView);

  useEffect(() => {
    hydrate(initialItems, initialCollections);
  }, [hydrate, initialItems, initialCollections]);

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
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <OSIconControl
            size="icon-sm"
            className="lg:hidden shrink-0"
            onClick={toggleMobileSidebar}
            aria-label={ui.openKnowledgeMenu}
          >
            <Menu className="h-4 w-4" />
          </OSIconControl>
          <OSControl size="sm" onClick={() => openAIPanel()} className="gap-1.5">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{ui.askAi}</span>
          </OSControl>
          <KnowledgePageActions />
        </div>
      }
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
            className={`flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6 ${
              currentView === "constellation"
                ? "lg:min-h-[min(82dvh,820px)]"
                : "lg:min-h-[min(70vh,640px)]"
            }`}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
              {currentView !== "constellation" && <KnowledgeInquiryAgent />}

              <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-border/70 shadow-sm lg:h-full">
                <CardContent className="flex flex-1 flex-col gap-0 p-0">
                  {currentView !== "constellation" && (
                    <>
                      <KnowledgeTopControlBar />
                      <KnowledgeActiveFiltersBar />
                      <Separator />
                    </>
                  )}
                  <KnowledgeContent userId={userId} />
                </CardContent>
              </Card>
            </div>

            <AnimatePresence>
              {isAIPanelOpen && (
                <motion.div
                  initial={{ x: 24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 24, opacity: 0 }}
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                  className="hidden min-h-0 w-[min(100%,320px)] shrink-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm lg:flex lg:h-full"
                >
                  <KnowledgeAIPanel userId={userId} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {isAIPanelOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-card lg:hidden"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <KnowledgeAIPanel userId={userId} />
          </div>
        )}

        {selectedItemId && <KnowledgeDetailSheet />}
        {isAddModalOpen && <AddKnowledgeModal />}
      </div>
    </PageShell>
  );
}
