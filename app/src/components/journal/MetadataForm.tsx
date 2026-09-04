"use client";

import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

interface MetadataFormProps {
  copy: JournalUiCopy;
}

/**
 * Linked projects / tasks. Disabled in this phase since the Projects + Tasks
 * integration with journal entries isn't wired yet — render a hint and a
 * disabled placeholder so the section is visible without misleading the user.
 */
export function MetadataForm({ copy }: MetadataFormProps) {
  return (
    <div className="rounded-xl border border-dashed border-border/65 bg-card/40 p-4 text-sm text-muted-foreground">
      {copy.metadataComingSoon}
    </div>
  );
}
