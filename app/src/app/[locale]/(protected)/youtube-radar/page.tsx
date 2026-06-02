"use client";

import { PageShell } from "@/components/shared/page-shell";
import { OSEmptyState } from "@/components/ui/os-primitives";
import { Video } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export default function YoutubeRadarPage() {
  const language = useAppStore((s) => s.language);
  const ui = getMiscUiCopy(language).stubs;
  return (
    <PageShell title={ui.youtubeRadar.title} description={ui.youtubeRadar.description}>
      <OSEmptyState
        icon={Video}
        title={ui.comingSoonTitle}
        description={ui.underDevelopmentDescription}
      />
    </PageShell>
  );
}
