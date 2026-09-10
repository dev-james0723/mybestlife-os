"use client";

import { useCallback, useId, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { OSSegmentedControl } from "@/components/ui/os-primitives";
import { AssetsView } from "@/components/resources/assets/AssetsView";
import { DocumentsView } from "@/components/resources/documents/DocumentsView";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/lib/theme-context";
import { getThemedItemLabel } from "@/lib/theme-labels";

const TAB_VALUES = ["assets", "documents"] as const;
type ResourcesTabValue = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: ResourcesTabValue = "assets";

function parseTab(value: string | null): ResourcesTabValue {
  return (TAB_VALUES as readonly string[]).includes(value ?? "")
    ? (value as ResourcesTabValue)
    : DEFAULT_TAB;
}

export function ResourcesTabs() {
  const tabId = useId();
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
  const tabItems = [
    { id: "assets" as const, label: assetsLabel },
    { id: "documents" as const, label: documentsLabel },
  ];

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <OSSegmentedControl
        items={tabItems}
        value={activeTab}
        onValueChange={handleTabChange}
        ariaLabel={`${assetsLabel} / ${documentsLabel}`}
        getTabId={(value) => `${tabId}-${value}-tab`}
        getPanelId={(value) => `${tabId}-${value}-panel`}
        className="mb-4 w-full max-w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
        layoutId="resources-tab-active-pill"
      />

      <p className="mb-4 text-sm text-muted-foreground">{language.startsWith("zh") ? "物品與保養：記錄電腦、樂器等實物。文件與到期：保存收據、保單及合約。" : "Assets tracks physical items and maintenance, such as a laptop or instrument. Documents keeps receipts, policies, and contracts with expiry dates."}</p>
      <TabsContent value="assets" id={`${tabId}-assets-panel`} aria-labelledby={`${tabId}-assets-tab`}>
        <AssetsView />
      </TabsContent>
      <TabsContent value="documents" id={`${tabId}-documents-panel`} aria-labelledby={`${tabId}-documents-tab`}>
        <DocumentsView />
      </TabsContent>
    </Tabs>
  );
}
