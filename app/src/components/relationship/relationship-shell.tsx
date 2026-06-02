"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { OSSegmentedControl } from "@/components/ui/os-primitives";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { useTheme } from "@/lib/theme-context";
import {
  getThemedCategoryDescription,
  getThemedCategoryLabel,
  getThemedItemLabel,
} from "@/lib/theme-labels";
import {
  DEFAULT_SUB_TAB,
  RELATIONSHIP_SUB_TABS,
  isRelationshipSubTab,
  resolveSubTab,
  type RelationshipSubTab,
} from "./sub-tabs";

const RelationshipTabPanel = dynamic(
  () => import("./tabs/relationship-tab-panel"),
  { ssr: false, loading: () => <LoadingPage /> },
);

const RoleModelTabPanel = dynamic(() => import("./tabs/role-model-tab-panel"), {
  ssr: false,
  loading: () => <LoadingPage />,
});

const PANEL_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;
const PANEL_TRANSITION_REDUCED = { duration: 0 } as const;

export function RelationshipShell() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const { uiTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  // Theme-aware page chrome. Default theme keeps hand-written copy from
  // relationship-ui ("People" / "Relationships" / "Role Model"); other themes
  // use themed category/item labels.
  const themedTitle = useMemo(() => {
    if (uiTheme === "default") return copy.containerTitle;
    return getThemedCategoryLabel("relationship", uiTheme, language);
  }, [uiTheme, language, copy.containerTitle]);

  const themedDescription = useMemo(() => {
    const themed = getThemedCategoryDescription("relationship", uiTheme, language);
    return themed ?? copy.containerDescription;
  }, [uiTheme, language, copy.containerDescription]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const containerHref = useLocalizedPath("/relationship");

  const rawTab = searchParams.get("tab");
  const activeTab: RelationshipSubTab = resolveSubTab(rawTab);

  // Normalize an invalid `?tab=` value without polluting browser history.
  useEffect(() => {
    if (rawTab !== null && !isRelationshipSubTab(rawTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", DEFAULT_SUB_TAB);
      router.replace(`${containerHref}?${params.toString()}`, { scroll: false });
    }
  }, [rawTab, searchParams, router, containerHref]);

  const handleValueChange = useCallback(
    (value: RelationshipSubTab) => {
      if (value === activeTab) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.push(`${containerHref}?${params.toString()}`, { scroll: false });
    },
    [activeTab, searchParams, router, containerHref],
  );

  const tabLabels = useMemo<Record<RelationshipSubTab, string>>(
    () => {
      if (uiTheme === "default") {
        return {
          relationship: copy.tabRelationship,
          "role-model": copy.tabRoleModel,
        };
      }
      return {
        relationship: getThemedItemLabel("relationship", uiTheme, language),
        "role-model": getThemedItemLabel("role-model", uiTheme, language),
      };
    },
    [uiTheme, language, copy.tabRelationship, copy.tabRoleModel],
  );

  return (
    <PageShell title={themedTitle} description={themedDescription}>
      <OSSegmentedControl
        items={RELATIONSHIP_SUB_TABS.map((id) => ({
          id,
          label: tabLabels[id],
        }))}
        value={activeTab}
        onValueChange={handleValueChange}
        ariaLabel={copy.tabsAriaLabel}
        getPanelId={(id) => `relationship-panel-${id}`}
        getTabId={(id) => `relationship-tab-${id}`}
        layoutId="relationship-subtab-pill"
      />

      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={prefersReducedMotion ? PANEL_TRANSITION_REDUCED : PANEL_TRANSITION}
            role="tabpanel"
            id={`relationship-panel-${activeTab}`}
            aria-labelledby={`relationship-tab-${activeTab}`}
          >
            {activeTab === "relationship" ? <RelationshipTabPanel /> : null}
            {activeTab === "role-model" ? <RoleModelTabPanel /> : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
