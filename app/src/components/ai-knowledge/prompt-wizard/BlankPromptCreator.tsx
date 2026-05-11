"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { BlankPromptForm } from "@/components/ai-knowledge/BlankPromptForm";

/** Full-page blank creator (deep links redirect to the library modal — kept for reuse). */
export function BlankPromptCreator() {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const w = ui.createWizard;
  const pathname = usePathname();
  const locale = useMemo(() => pathname.split("/")[1] || "en", [pathname]);
  const backHref = `/${locale}/ai-knowledge`;

  return (
    <PageShell
      title={w.blankPageTitle}
      description={w.blankPageDescription}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          render={<Link href={backHref} />}
        >
          <ArrowLeft className="h-4 w-4" />
          {ui.create.backToLibrary}
        </Button>
      }
    >
      <BlankPromptForm variant="page" />
    </PageShell>
  );
}
