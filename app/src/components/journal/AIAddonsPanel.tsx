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

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  /** When canGenerate is false, the action that should run before generation. */
  onAutoSaveBeforeGenerate?: () => Promise<boolean>;
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
  onAutoSaveBeforeGenerate,
  illustration,
  audio,
  onGenerateIllustration,
  onGenerateAudio,
  illustrationLoading,
  audioLoading,
}: AIAddonsPanelProps) {
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  const handleIllustration = async () => {
    if (!canGenerate && onAutoSaveBeforeGenerate) {
      const ok = await onAutoSaveBeforeGenerate();
      if (!ok) return;
    }
    await onGenerateIllustration();
  };

  const handleAudio = async () => {
    if (!canGenerate && onAutoSaveBeforeGenerate) {
      const ok = await onAutoSaveBeforeGenerate();
      if (!ok) return;
    }
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

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Illustration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" aria-hidden />
              {copy.illustrationTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {illustration ? (
              <>
                <button
                  type="button"
                  onClick={() => setZoomedSrc(illustration.url)}
                  className="block w-full overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
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
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={downloadImage}>
                    <Download aria-hidden />
                    {copy.illustrationDownload}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  {copy.illustrationEmpty}
                </p>
                {!canGenerate && (
                  <p className="text-xs text-muted-foreground">
                    {copy.addonsSaveFirstHint}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
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
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="size-4 text-primary" aria-hidden />
              {copy.audioTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
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
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyTranscript}
                  >
                    <Copy aria-hidden />
                    {copy.audioCopyTranscript}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">{copy.audioEmpty}</p>
                {!canGenerate && (
                  <p className="text-xs text-muted-foreground">
                    {copy.addonsSaveFirstHint}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
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
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
            className="flex w-full items-center justify-between rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
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
