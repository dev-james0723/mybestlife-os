"use client";

import { Star } from "lucide-react";
import { FileGrid } from "./FileGrid";
import type { CareerVaultFile } from "@/types/career-vault";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";

interface QuickAccessSectionProps {
  files: CareerVaultFile[];
  copy: CareerVaultCopy;
  detailHref: (id: string) => string;
  onToggleStar: (file: CareerVaultFile) => void;
  onDownload: (file: CareerVaultFile) => void;
  onEdit: (file: CareerVaultFile) => void;
  onRequestDelete: (file: CareerVaultFile) => void;
}

export function QuickAccessSection({
  files,
  copy,
  detailHref,
  onToggleStar,
  onDownload,
  onEdit,
  onRequestDelete,
}: QuickAccessSectionProps) {
  if (files.length === 0) return null;
  const top = files.slice(0, 4);
  return (
    <section aria-label={copy.sections.quickAccess} className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.sections.quickAccess}
        </h2>
      </div>
      <FileGrid
        files={top}
        copy={copy}
        detailHref={detailHref}
        onToggleStar={onToggleStar}
        onDownload={onDownload}
        onEdit={onEdit}
        onRequestDelete={onRequestDelete}
      />
    </section>
  );
}
