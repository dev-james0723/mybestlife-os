"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ExternalLink, Download as DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createVaultSignedUrl,
  downloadVaultObject,
} from "@/lib/career-vault/storage";
import {
  isImageMime,
  isMarkdownMime,
  isPdfMime,
} from "@/lib/career-vault/utils";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { CareerVaultFile } from "@/types/career-vault";
import { FileTypeIcon } from "./FileTypeIcon";

interface FilePreviewProps {
  file: CareerVaultFile;
  copy: CareerVaultCopy;
}

export function FilePreview({ file, copy }: FilePreviewProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = await createVaultSignedUrl(file.file_path, 60 * 30);
        if (cancelled) return;
        setSignedUrl(url);
        if (isMarkdownMime(file.mime_type)) {
          const res = await fetch(url);
          const txt = await res.text();
          if (!cancelled) setTextContent(txt);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load file.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [file.file_path, file.mime_type]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <FileTypeIcon mime={file.mime_type} className="h-12 w-12" />
        <p className="text-sm">{error ?? copy.errors.fetchFailed}</p>
      </div>
    );
  }

  if (isImageMime(file.mime_type)) {
    return (
      <div className="relative flex h-full min-h-[400px] items-center justify-center overflow-auto bg-muted/40 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={file.filename}
          className="max-h-[80vh] w-auto max-w-full object-contain"
        />
      </div>
    );
  }

  if (isPdfMime(file.mime_type)) {
    // Uses the browser's native PDF viewer. This satisfies Phase 1 MVP inline
    // preview (first page and beyond). Phase 2 can replace with react-pdf for
    // custom thumbnails and controls.
    return (
      <div className="flex h-full min-h-[400px] flex-col bg-muted/40">
        <iframe
          src={signedUrl}
          title={file.filename}
          className="min-h-[70vh] flex-1 w-full border-0 bg-background"
        />
        <div className="flex items-center justify-end gap-2 border-t bg-background p-2">
          <Button
            variant="ghost"
            size="sm"
            render={
              <a href={signedUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {copy.detail.openInNewTab}
          </Button>
        </div>
      </div>
    );
  }

  if (isMarkdownMime(file.mime_type) && textContent != null) {
    return (
      <div className="min-h-[400px] overflow-auto bg-background p-6">
        <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {file.mime_type === "text/markdown" ? (
            <ReactMarkdown>{textContent}</ReactMarkdown>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {textContent}
            </pre>
          )}
        </article>
      </div>
    );
  }

  // DOCX / unknown — no inline preview in Phase 1.
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 bg-muted/40 p-6 text-center">
      <FileTypeIcon mime={file.mime_type} className="h-14 w-14" />
      <p className="text-sm text-muted-foreground">{copy.detail.downloadToView}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void downloadVaultObject(file.file_path, file.filename);
        }}
      >
        <DownloadIcon className="mr-1.5 h-3.5 w-3.5" />
        {copy.actions.download}
      </Button>
    </div>
  );
}
