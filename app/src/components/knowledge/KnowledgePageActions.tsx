"use client";

import { useKnowledgeStore } from "@/stores/knowledge-store";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";

export function KnowledgePageActions() {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);

  return (
    <Button
      type="button"
      size="sm"
      onClick={openAddModal}
      className="h-9 gap-2 border-transparent bg-violet-600 text-white shadow-sm hover:bg-violet-700"
    >
      <Plus className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">{ui.addKnowledge}</span>
      <span className="sm:hidden">{ui.addShort}</span>
    </Button>
  );
}
