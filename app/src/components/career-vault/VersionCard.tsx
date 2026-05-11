"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, History, RotateCcw } from "lucide-react";
import { formatFileSize, formatRelativeShort } from "@/lib/career-vault/utils";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { CareerVaultFile, CareerVaultFileVersion } from "@/types/career-vault";

type VersionCardProps = {
  copy: CareerVaultCopy;
  /** When the card represents the live current file. */
  current?: { file: CareerVaultFile };
  /** When the card represents a past archived version. */
  past?: { version: CareerVaultFileVersion };
  onView?: () => void;
  onDownload?: () => void;
  onRestore?: () => void;
  isLast?: boolean;
};

/**
 * Single node in the vertical timeline. We render the dot + rail here so the
 * parent only has to map a list. The rail disappears on the last item.
 */
export function VersionCard({
  copy,
  current,
  past,
  onView,
  onDownload,
  onRestore,
  isLast,
}: VersionCardProps) {
  const isCurrent = !!current;
  const versionNumber = isCurrent
    ? current!.file.current_version
    : past!.version.version_number;
  const filename = isCurrent ? current!.file.filename : past!.version.filename;
  const size = isCurrent ? current!.file.file_size : past!.version.file_size;
  const createdAt = isCurrent
    ? current!.file.updated_at
    : past!.version.created_at;
  const changeNote = isCurrent ? null : past!.version.change_note;

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Rail */}
      {!isLast ? (
        <div
          className="absolute left-[11px] top-6 h-full w-px bg-border"
          aria-hidden
        />
      ) : null}

      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
        <span
          className={
            isCurrent
              ? "h-3 w-3 rounded-full bg-primary ring-4 ring-primary/20"
              : "h-2.5 w-2.5 rounded-full bg-border"
          }
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">
            {copy.versions.versionLabel(versionNumber)}
          </span>
          {isCurrent ? (
            <Badge className="bg-primary text-primary-foreground">
              {copy.versions.currentBadge}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatRelativeShort(createdAt)}
          </span>
          <span className="text-xs text-muted-foreground" aria-hidden>
            ·
          </span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(size)}
          </span>
        </div>

        <p className="truncate text-xs text-muted-foreground">{filename}</p>

        {changeNote ? (
          <p className="text-sm text-foreground/90">
            <History
              className="mr-1 inline h-3.5 w-3.5 -translate-y-0.5 text-muted-foreground"
              aria-hidden
            />
            {changeNote}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {onView ? (
            <Button variant="ghost" size="sm" onClick={onView}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              {copy.versions.viewBtn}
            </Button>
          ) : null}
          {onDownload ? (
            <Button variant="ghost" size="sm" onClick={onDownload}>
              <Download className="mr-1 h-3.5 w-3.5" />
              {copy.versions.downloadBtn}
            </Button>
          ) : null}
          {onRestore ? (
            <Button variant="outline" size="sm" onClick={onRestore}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              {copy.versions.restoreBtn}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
