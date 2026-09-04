"use client";

import { useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Mic,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { OSControl } from "@/components/ui/os-primitives";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

import { ImageZoomViewer } from "./ImageZoomViewer";

export interface IllustrationMedia {
  url: string;
  stylePreset?: string;
  aspectRatio?: string;
  createdAt?: string;
}

export interface AudioMedia {
  url: string;
  transcript: string;
  voice?: string;
  speed?: number;
  createdAt?: string;
}

interface AIAddonsPanelProps {
  copy: JournalUiCopy;
  /** Whether the user has saved at least one entry to generate against. */
  canGenerate: boolean;
  /** Keeps the compact lock state accurate while the summary is being made. */
  waitingForSummary?: boolean;
  illustration: IllustrationMedia | null;
  audio: AudioMedia | null;
  onGenerateIllustration: () => Promise<void>;
  onGenerateAudio: () => Promise<void>;
  illustrationLoading: boolean;
  audioLoading: boolean;
}

export function AIAddonsPanel({
  copy,
  canGenerate,
  waitingForSummary,
  illustration,
  audio,
  onGenerateIllustration,
  onGenerateAudio,
  illustrationLoading,
  audioLoading,
}: AIAddonsPanelProps) {
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  const handleIllustration = async () => {
    await onGenerateIllustration();
  };

  const handleAudio = async () => {
    await onGenerateAudio();
  };

  const downloadImage = () => {
    if (!illustration) return;
    const a = document.createElement("a");
    a.href = illustration.url;
    a.download = `journal-illustration-${Date.now()}.png`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(copy.toastImageDownloaded);
  };

  const copyTranscript = async () => {
    if (!audio) return;
    try {
      await navigator.clipboard.writeText(audio.transcript);
      toast.success(copy.toastTranscriptCopied);
    } catch {
      toast.error(copy.toastAudioFailed);
    }
  };

  if (!canGenerate && !illustration && !audio) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border/65 bg-card/40 p-4 text-sm leading-6 text-muted-foreground">
        <Sparkles className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          {waitingForSummary ? copy.savingSummaryButton : copy.addonsSaveFirstHint}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
        {/* Illustration */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ImageIcon className="size-4 text-primary" aria-hidden />
            {copy.illustrationTitle}
          </h3>
          <div className="space-y-3">
            {illustration ? (
              <>
                <button
                  type="button"
                  onClick={() => setZoomedSrc(illustration.url)}
                  className="block w-full overflow-hidden rounded-xl border border-border/75 bg-muted outline-none transition-transform hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
                  aria-label="Open illustration full screen"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={illustration.url}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </button>
                <div className="flex flex-wrap gap-2">
                  <OSControl
                    type="button"
                    osSize="compact"
                    onClick={handleIllustration}
                    disabled={illustrationLoading}
                  >
                    {illustrationLoading ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden />
                        {copy.illustrationRegenerating}
                      </>
                    ) : (
                      <>
                        <RefreshCw aria-hidden />
                        {copy.illustrationRegenerate}
                      </>
                    )}
                  </OSControl>
                  <OSControl
                    type="button"
                    osSize="compact"
                    onClick={downloadImage}
                  >
                    <Download aria-hidden />
                    {copy.illustrationDownload}
                  </OSControl>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border/65 bg-card/40 p-4">
                <p className="text-sm text-muted-foreground">
                  {copy.illustrationEmpty}
                </p>
                {!canGenerate && (
                  <p className="text-xs text-muted-foreground">
                    {copy.addonsSaveFirstHint}
                  </p>
                )}
                <OSControl
                  type="button"
                  osSize="compact"
                  onClick={handleIllustration}
                  disabled={illustrationLoading}
                >
                  {illustrationLoading ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden />
                      {copy.illustrationGenerating}
                    </>
                  ) : (
                    <>
                      <Sparkles aria-hidden />
                      {copy.illustrationGenerate}
                    </>
                  )}
                </OSControl>
              </div>
            )}
          </div>
        </section>

        {/* Audio */}
        <section className="space-y-4 border-t border-border/60 pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0 xl:border-l-0 xl:border-t xl:pl-0 xl:pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Mic className="size-4 text-primary" aria-hidden />
            {copy.audioTitle}
          </h3>
          <div className="space-y-3">
            {audio ? (
              <>
                <audio
                  src={audio.url}
                  controls
                  preload="metadata"
                  className="w-full"
                />
                <TranscriptCollapsible
                  label={copy.audioTranscriptLabel}
                  text={audio.transcript}
                />
                <div className="flex flex-wrap gap-2">
                  <OSControl
                    type="button"
                    osSize="compact"
                    onClick={handleAudio}
                    disabled={audioLoading}
                  >
                    {audioLoading ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden />
                        {copy.audioGenerating}
                      </>
                    ) : (
                      <>
                        <RefreshCw aria-hidden />
                        {copy.audioRegenerate}
                      </>
                    )}
                  </OSControl>
                  <OSControl
                    type="button"
                    osSize="compact"
                    onClick={copyTranscript}
                  >
                    <Copy aria-hidden />
                    {copy.audioCopyTranscript}
                  </OSControl>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border/65 bg-card/40 p-4">
                <p className="text-sm text-muted-foreground">{copy.audioEmpty}</p>
                {!canGenerate && (
                  <p className="text-xs text-muted-foreground">
                    {copy.addonsSaveFirstHint}
                  </p>
                )}
                <OSControl
                  type="button"
                  osSize="compact"
                  onClick={handleAudio}
                  disabled={audioLoading}
                >
                  {audioLoading ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden />
                      {copy.audioGenerating}
                    </>
                  ) : (
                    <>
                      <Sparkles aria-hidden />
                      {copy.audioGenerate}
                    </>
                  )}
                </OSControl>
              </div>
            )}
          </div>
        </section>
      </div>

      <ImageZoomViewer
        src={zoomedSrc}
        alt={copy.illustrationTitle}
        onClose={() => setZoomedSrc(null)}
      />
    </>
  );
}

function TranscriptCollapsible({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border/75 bg-card/60 px-3 py-2 text-xs font-medium transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <span>{label}</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="whitespace-pre-wrap pt-2 text-xs leading-relaxed text-muted-foreground">
          {text}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
