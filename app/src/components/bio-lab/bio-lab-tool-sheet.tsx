"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FocusSprintPanel } from "@/components/bio-lab/focus-sprint-panel";
import { MindSweepPanel } from "@/components/bio-lab/mind-sweep-panel";
import { StateScanPanel } from "@/components/bio-lab/state-scan-panel";
import { SystemResetPanel } from "@/components/bio-lab/system-reset-panel";
import { BIO_LAB_TOOLS } from "@/lib/bio-lab/tools-metadata";
import { getBioLabToolsUiCopy } from "@/lib/i18n/bio-lab-tools-ui";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { useBioLabStore } from "@/stores/bio-lab-store";

export function BioLabToolSheet() {
  const activeTool = useBioLabStore((s) => s.activeTool);
  const closeTool = useBioLabStore((s) => s.closeTool);
  const language = useAppStore((s) => s.language);
  const { uiTheme } = useTheme();
  const titles = getBioLabToolsUiCopy(language).toolTitles;

  const open = activeTool !== null;
  const title = activeTool ? titles[activeTool] : "";
  const activeDef = activeTool ? BIO_LAB_TOOLS.find((t) => t.id === activeTool) : undefined;
  const description = activeDef ? activeDef.themeSurfaces[uiTheme].subtitle : "";

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeTool()}>
      <SheetContent side="bottom-card" className="gap-0 p-0 sm:max-w-lg" showCloseButton>
        <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="max-h-[min(78dvh,36rem)] overflow-y-auto overscroll-contain px-4 py-4">
          {activeTool === "focus-sprint" ? <FocusSprintPanel onClose={closeTool} /> : null}
          {activeTool === "mind-sweep" ? <MindSweepPanel /> : null}
          {activeTool === "state-scan" ? <StateScanPanel /> : null}
          {activeTool === "system-reset" ? <SystemResetPanel /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
