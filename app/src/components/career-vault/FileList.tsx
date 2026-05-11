"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Star, Download, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CAREER_VAULT_CATEGORY_EMOJI,
} from "@/lib/career-vault/constants";
import { formatFileSize, formatRelativeShort } from "@/lib/career-vault/utils";
import type { CareerVaultFile } from "@/types/career-vault";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { FileTypeIcon } from "./FileTypeIcon";

interface FileListProps {
  files: CareerVaultFile[];
  copy: CareerVaultCopy;
  detailHref: (id: string) => string;
  onToggleStar: (file: CareerVaultFile) => void;
  onDownload: (file: CareerVaultFile) => void;
  onEdit: (file: CareerVaultFile) => void;
  onRequestDelete: (file: CareerVaultFile) => void;
}

export function FileList({
  files,
  copy,
  detailHref,
  onToggleStar,
  onDownload,
  onEdit,
  onRequestDelete,
}: FileListProps) {
  return (
    <div className="divide-y divide-border rounded-xl border">
      <AnimatePresence initial={false}>
        {files.map((file) => (
          <motion.div
            key={file.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-3 px-3 py-3 sm:px-4"
          >
            <Link
              href={detailHref(file.id)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"
              aria-label={copy.actions.preview}
            >
              <FileTypeIcon mime={file.mime_type} className="h-5 w-5" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={detailHref(file.id)}
                  className="truncate text-sm font-medium hover:underline"
                  title={file.filename}
                >
                  {file.filename}
                </Link>
                {file.is_master ? (
                  <Badge className="bg-amber-500 text-white">
                    {copy.card.masterBadge}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                <span>
                  <span aria-hidden className="mr-1">
                    {CAREER_VAULT_CATEGORY_EMOJI[file.category]}
                  </span>
                  {copy.categories[file.category]}
                </span>
                <span aria-hidden>·</span>
                <span>{formatFileSize(file.file_size)}</span>
                <span aria-hidden>·</span>
                <span>{formatRelativeShort(file.updated_at)}</span>
                {file.tags.length > 0 ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">
                      {file.tags
                        .slice(0, 3)
                        .map((t) => `#${t}`)
                        .join(" ")}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <IconButton
                label={file.is_starred ? copy.card.unstarAria : copy.card.starAria}
                onClick={() => onToggleStar(file)}
                className={cn(
                  file.is_starred && "text-amber-500",
                )}
              >
                <Star
                  className={cn("h-4 w-4", file.is_starred && "fill-current")}
                />
              </IconButton>
              <IconButton
                label={copy.actions.edit}
                onClick={() => onEdit(file)}
              >
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={copy.actions.download}
                onClick={() => onDownload(file)}
              >
                <Download className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={copy.actions.delete}
                onClick={() => onRequestDelete(file)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
