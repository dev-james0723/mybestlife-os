"use client";

import { useEffect } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { GardenView } from "@/components/garden/GardenView";
import { DailyChest } from "@/components/garden/DailyChest";
import { SeedSelector } from "@/components/garden/SeedSelector";
import { PlantCollection } from "@/components/garden/PlantCollection";
import { InventoryBar } from "@/components/garden/InventoryBar";
import { BioLabToolsSection } from "@/components/bio-lab/bio-lab-tools-section";
import { GardenBioLabQuerySync } from "@/components/bio-lab/garden-bio-lab-query-sync";
import { useActiveGarden, useCheckWilt } from "@/hooks/use-garden";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import { getGardenHubPageDescription } from "@/lib/i18n/bio-lab-tools-ui";
import { useTheme } from "@/lib/theme-context";

export default function GardenPage() {
  const language = useAppStore((s) => s.language);
  const { uiTheme } = useTheme();
  const ui = getGardenUiCopy(language);
  const pageDescription = getGardenHubPageDescription(language, uiTheme);
  const { data: garden, isLoading, isFetched } = useActiveGarden();
  const checkWilt = useCheckWilt();

  useEffect(() => {
    if (isFetched && garden && !garden.is_wilted) {
      checkWilt.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetched]);

  if (isLoading) return <LoadingPage />;

  const hasActivePlant = !!garden;

  return (
    <PageShell
      title={ui.pageTitle}
      description={pageDescription}
    >
      <div className="space-y-6">
        <GardenBioLabQuerySync />
        <BioLabToolsSection />

        {/* Daily chest — always shown */}
        <DailyChest />

        {/* Inventory bar */}
        <InventoryBar />

        {/* Main content: either active plant or seed selector */}
        {hasActivePlant ? (
          <GardenView garden={garden} />
        ) : (
          <SeedSelector />
        )}

        {/* Plant collection gallery */}
        <PlantCollection />
      </div>
    </PageShell>
  );
}
