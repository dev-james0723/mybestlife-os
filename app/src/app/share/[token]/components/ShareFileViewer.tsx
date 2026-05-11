"use client";

import { Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { ResolvedShareFile } from "@/types/career-vault";
import {
  formatFileSize,
  formatRelativeShort,
  isImageMime,
  isPdfMime,
} from "@/lib/career-vault/utils";
import { WatermarkOverlay } from "./WatermarkOverlay";

interface ShareFileViewerProps {
  file: ResolvedShareFile;
  copy: CareerVaultCopy;
  allowDownload: boolean;
  watermarkText?: string;
  createdAt: string;
}

export function ShareFileViewer({
  file,
  copy,
  allowDownload,
  watermarkText,
  createdAt,
}: ShareFileViewerProps) {
  const publicCopy = copy.shares.public;

  const handleDownload = () => {
    // Signed URLs already include `?download=…` when requested; without it,
    // the browser will just navigate to view. Here we force download via
    // an anchor with the `download` attribute.
    const a = document.createElement("a");
    a.href = file.signedUrl;
    a.download = file.filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="relative flex min-h-[280px] items-center justify-center bg-muted/40 p-4">
        {isImageMime(file.mimeType) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.signedUrl}
            alt={file.filename}
            className="max-h-[70vh] w-auto rounded-md object-contain"
          />
        ) : isPdfMime(file.mimeType) ? (
          <iframe
            src={file.signedUrl}
            title={file.filename}
            className="h-[70vh] w-full rounded-md border"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <Lock className="h-8 w-8" />
            <p>{file.filename}</p>
          </div>
        )}

        {watermarkText ? (
          <WatermarkOverlay text={watermarkText} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-2 border-t p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.filename}</p>
          <p className="text-xs text-muted-foreground">
            {publicCopy.fileMeta(
              formatFileSize(file.fileSize),
              formatRelativeShort(createdAt),
            )}
          </p>
        </div>
        {allowDownload ? (
          <Button size="sm" onClick={handleDownload}>
            <Download className="mr-1 h-4 w-4" />
            {publicCopy.download}
          </Button>
        ) : (
          <Badge variant="outline">{publicCopy.downloadBlocked}</Badge>
        )}
      </div>
    </div>
  );
}
