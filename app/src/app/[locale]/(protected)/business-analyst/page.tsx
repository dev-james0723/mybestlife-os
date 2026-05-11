"use client";

import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendingUp } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export default function BusinessAnalystPage() {
  const language = useAppStore((s) => s.language);
  const ui = getMiscUiCopy(language).stubs;
  return (
    <PageShell title={ui.businessAnalyst.title} description={ui.businessAnalyst.description}>
      <EmptyState
        icon={TrendingUp}
        title={ui.comingSoonTitle}
        description={ui.underDevelopmentDescription}
      />
    </PageShell>
  );
}
