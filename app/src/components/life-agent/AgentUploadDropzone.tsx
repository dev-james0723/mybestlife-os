"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import { cn } from "@/lib/utils";

const ACCEPT =
  "image/*,application/pdf,text/plain,text/markdown,.pdf,.txt,.md,.doc,.docx";

type AgentUploadDropzoneProps = {
  ui: LifeAgentUiCopy;
  onFile: (file: File) => void;
  isBusy?: boolean;
  className?: string;
};

export function AgentUploadDropzone({
  ui,
  onFile,
  isBusy = false,
  className,
}: AgentUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || isBusy) return;
      onFile(file);
    },
    [isBusy, onFile],
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 transition-colors",
        dragOver && "border-primary/50 bg-primary/5",
        isBusy && "pointer-events-none opacity-70",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pickFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={ACCEPT}
        disabled={isBusy}
        onChange={(e) => pickFile(e.target.files?.[0])}
      />
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80">
          {isBusy ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{ui.uploadDropzoneTitle}</p>
          <p className="text-xs text-muted-foreground">{ui.uploadDropzoneHint}</p>
        </div>
        <button data-control-variant="outline"
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5" aria-hidden />
          {ui.uploadChooseFile}
        </button>
      </div>
    </div>
  );
}
