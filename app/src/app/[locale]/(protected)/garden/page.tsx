"use client";

import { PageShell } from "@/components/shared/page-shell";
import { GardenGame } from "@/components/garden/GardenGame";
import { DailyChest } from "@/components/garden/DailyChest";
import { PlantCollection } from "@/components/garden/PlantCollection";
import { InventoryBar } from "@/components/garden/InventoryBar";
import { BioLabToolsSection } from "@/components/bio-lab/bio-lab-tools-section";
import { GardenBioLabQuerySync } from "@/components/bio-lab/garden-bio-lab-query-sync";
import { useAppStore } from "@/stores/app-store";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import { getGardenGameCopy } from "@/lib/i18n/garden-game-ui";
import { OSMotionPanel } from "@/components/ui/os-primitives";

export default function GardenPage() {
  const language = useAppStore((s) => s.language);
  const ui = getGardenUiCopy(language);
  const gameUi = getGardenGameCopy(language);

  return (
    <PageShell
      title={ui.pageTitle}
      description={gameUi.subtitle}
    >
      <OSMotionPanel className="space-y-6">
        <GardenBioLabQuerySync />
        <GardenGame />
        <details className="rounded-2xl border border-border/60 bg-background/50 p-5">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">{gameUi.collection}</summary>
          <div className="space-y-5 pt-5"><DailyChest /><InventoryBar /><PlantCollection /></div>
        </details>
        <BioLabToolsSection />
      </OSMotionPanel>
    </PageShell>
  );
}
