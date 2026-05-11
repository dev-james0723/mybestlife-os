"use client";

import { useCallback, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetsView } from "@/components/resources/assets/AssetsView";
import { DocumentsView } from "@/components/resources/documents/DocumentsView";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/lib/theme-context";
import { getThemedItemLabel } from "@/lib/theme-labels";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";

const TAB_VALUES = ["assets", "documents"] as const;
type ResourcesTabValue = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: ResourcesTabValue = "assets";

function parseTab(value: string | null): ResourcesTabValue {
  return (TAB_VALUES as readonly string[]).includes(value ?? "")
    ? (value as ResourcesTabValue)
    : DEFAULT_TAB;
}

export function ResourcesTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const language = useAppStore((s) => s.language);
  const { uiTheme } = useTheme();

  const activeTab = useMemo(
    () => parseTab(searchParams.get("tab")),
    [searchParams],
  );

  const handleTabChange = useCallback(
    (next: string | null) => {
      if (!next || !(TAB_VALUES as readonly string[]).includes(next)) return;
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (next === DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const assetsLabel = getThemedItemLabel("assets", uiTheme, language);
  const documentsLabel = getThemedItemLabel("documents", uiTheme, language);
  const prefersReduced = useReducedMotion();

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList variant="line" className="mb-4 border-b border-border">
        <TabsTrigger value="assets">{assetsLabel}</TabsTrigger>
        <TabsTrigger value="documents">{documentsLabel}</TabsTrigger>
      </TabsList>

      {/*
       * Base UI unmounts the inactive panel, so a simple fade-in on the
       * remounting child is enough — no AnimatePresence exit needed. The
       * motion.div key rekeys on tab change to replay the entrance.
       */}
      <TabsContent value="assets">
        <motion.div
          key="assets-panel"
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
        >
          <AssetsView />
        </motion.div>
      </TabsContent>
      <TabsContent value="documents">
        <motion.div
          key="documents-panel"
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
        >
          <DocumentsView />
        </motion.div>
      </TabsContent>
    </Tabs>
  );
}
