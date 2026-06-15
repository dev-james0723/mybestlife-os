"use client";

import type { InfographicStyle } from "@/lib/document-brain/infographicStyles";

function displayStyle(style: InfographicStyle): string {
  return style
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function GeneratedInfographicViewer(props: {
  imageUrl: string;
  aspectRatio: string;
  style: InfographicStyle;
  model: string;
  promptUsed: string;
  busy?: boolean;
  onRegenerate: () => void;
  onOpenImage: () => void;
  onCopyPrompt: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Generated image · {props.aspectRatio} · {displayStyle(props.style)}</span>
      </div>
      <div className="w-full overflow-hidden rounded-xl border border-border bg-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={props.imageUrl}
          alt="Generated preview for this document"
          className="mx-auto max-h-[min(78vh,900px)] w-full max-w-full object-contain"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={props.busy}
          onClick={props.onRegenerate}
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={props.onOpenImage}
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-muted"
        >
          Open image
        </button>
        <button
          type="button"
          onClick={props.onDownload}
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-muted"
        >
          Download
        </button>
      </div>
    </div>
  );
}
