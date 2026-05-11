"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createVaultSignedUrl } from "@/lib/career-vault/storage";
import type { CareerVaultFile } from "@/types/career-vault";
import { isImageMime } from "@/lib/career-vault/utils";
import { FileTypeIcon } from "./FileTypeIcon";

interface FileThumbnailProps {
  file: CareerVaultFile;
  className?: string;
  iconClassName?: string;
}

/**
 * Renders the file's thumbnail if the mime is previewable as an image;
 * otherwise shows a coloured icon. Signed URLs are lazy-loaded.
 */
export function FileThumbnail({
  file,
  className,
  iconClassName,
}: FileThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const canRenderImage = isImageMime(file.mime_type);

  useEffect(() => {
    if (!canRenderImage) return;
    let cancelled = false;
    createVaultSignedUrl(file.file_path, 60 * 30)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        /* keep url as-is; icon fallback already handles absence. */
      });
    return () => {
      cancelled = true;
    };
  }, [file.file_path, canRenderImage]);

  if (canRenderImage && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={file.filename}
        className={cn("h-full w-full object-cover", className)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-muted text-muted-foreground",
        className,
      )}
    >
      <FileTypeIcon mime={file.mime_type} className={iconClassName} />
    </div>
  );
}
