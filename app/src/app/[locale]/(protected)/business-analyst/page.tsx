"use client";

import { PageShell } from "@/components/shared/page-shell";
import { OSEmptyState } from "@/components/ui/os-primitives";
import { TrendingUp } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export default function BusinessAnalystPage() {
  const language = useAppStore((s) => s.language);
  const ui = getMiscUiCopy(language).stubs;
  return (
    <PageShell title={ui.businessAnalyst.title} description={ui.businessAnalyst.description}>
      <OSEmptyState
        icon={TrendingUp}
        title={ui.comingSoonTitle}
        description={ui.underDevelopmentDescription}
      />
    </PageShell>
  );
}
