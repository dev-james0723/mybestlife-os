"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, MoreHorizontal, Download, Pencil, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CAREER_VAULT_CATEGORY_EMOJI,
} from "@/lib/career-vault/constants";
import { formatFileSize, formatRelativeShort } from "@/lib/career-vault/utils";
import type { CareerVaultFile } from "@/types/career-vault";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { FileThumbnail } from "./FileThumbnail";

interface FileCardProps {
  file: CareerVaultFile;
  copy: CareerVaultCopy;
  detailHref: string;
  onToggleStar: (file: CareerVaultFile) => void;
  onDownload: (file: CareerVaultFile) => void;
  onEdit: (file: CareerVaultFile) => void;
  onRequestDelete: (file: CareerVaultFile) => void;
}

export function FileCard({
  file,
  copy,
  detailHref,
  onToggleStar,
  onDownload,
  onEdit,
  onRequestDelete,
}: FileCardProps) {
  const starred = file.is_starred;
  const mimeShort = shortMimeLabel(file.mime_type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="group/file-card relative flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:ring-foreground/30"
    >
      <Link
        href={detailHref}
        aria-label={`${copy.actions.preview}: ${file.filename}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FileThumbnail file={file} iconClassName="h-12 w-12" />
        {file.is_master ? (
          <Badge className="absolute left-2 top-2 bg-amber-500 text-white shadow-sm">
            {copy.card.masterBadge}
          </Badge>
        ) : null}
      </Link>

      <button data-control-variant="ghost" data-selected={starred}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onToggleStar(file);
        }}
        aria-label={starred ? copy.card.unstarAria : copy.card.starAria}
        aria-pressed={starred}
        className={cn(
          "absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 shadow-sm ring-1 ring-foreground/10 transition",
          "hover:scale-110 active:scale-95",
          starred ? "text-amber-500" : "text-muted-foreground",
        )}
      >
        <motion.span
          whileTap={{ scale: 1.3 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
        >
          <Star className={cn("h-4 w-4", starred && "fill-current")} />
        </motion.span>
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link
          href={detailHref}
          className="line-clamp-1 text-sm font-medium text-foreground hover:underline"
          title={file.filename}
        >
          {file.filename}
        </Link>
        <p className="text-xs text-muted-foreground">
          {mimeShort}
          <span aria-hidden> · </span>
          {formatFileSize(file.file_size)}
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary" className="gap-1 font-normal">
            <span aria-hidden>
              {CAREER_VAULT_CATEGORY_EMOJI[file.category]}
            </span>
            {copy.categories[file.category]}
          </Badge>
          {file.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="px-1.5 py-0 text-[10px] font-normal"
            >
              #{tag}
            </Badge>
          ))}
          {file.tags.length > 2 ? (
            <span className="text-[10px] text-muted-foreground">
              +{file.tags.length - 2}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeShort(file.updated_at)}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label={copy.actions.openMenu}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                render={<Link href={detailHref} />}
              >
                <Eye className="mr-2 h-4 w-4" /> {copy.actions.preview}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(file)}>
                <Pencil className="mr-2 h-4 w-4" /> {copy.actions.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload(file)}>
                <Download className="mr-2 h-4 w-4" /> {copy.actions.download}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRequestDelete(file)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> {copy.actions.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}

function shortMimeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/msword") return "DOC";
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "DOCX";
  if (mime === "image/jpeg") return "JPG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WEBP";
  if (mime === "text/markdown") return "MD";
  if (mime === "text/plain") return "TXT";
  return mime.split("/").pop()?.toUpperCase() ?? "FILE";
}
