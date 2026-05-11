"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import {
  downloadQuoteCard,
  getShareCardStyles,
  renderQuoteCardToDataUrl,
  type ShareCardStyle,
} from "@/lib/quote-library/export-image-card";
import type { Quote } from "@/types/quote";

interface Props {
  open: boolean;
  quote: Quote | null;
  onOpenChange: (next: boolean) => void;
}

export function ShareQuoteCardDialog({ open, quote, onOpenChange }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const styles = useMemo(() => getShareCardStyles(), []);

  const [selectedStyle, setSelectedStyle] = useState<ShareCardStyle>(
    styles[0] ?? "ivory",
  );
  const [previews, setPreviews] = useState<Record<ShareCardStyle, string>>(
    {} as Record<ShareCardStyle, string>,
  );
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!open || !quote) return;
    let cancelled = false;
    const generate = async () => {
      const out: Record<ShareCardStyle, string> = { ...previews };
      for (const style of styles) {
        if (cancelled) return;
        try {
          out[style] = await renderQuoteCardToDataUrl(quote, style);
        } catch {
          /* no-op */
        }
      }
      if (!cancelled) setPreviews(out);
    };
    void generate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote?.id, styles.join(",")]);

  if (!quote) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadQuoteCard(quote, selectedStyle);
    } catch {
      toast.error(copy.errorGeneric);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[min(90vh,860px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.shareAsImage}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {styles.map((style) => (
            <button
              type="button"
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={cn(
                "group relative overflow-hidden rounded-xl border transition-all",
                selectedStyle === style
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/60",
              )}
              aria-label={style}
            >
              {previews[style] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previews[style]}
                  alt={style}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-muted">
                  <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
                {style}
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {copy.buttonCancel}
          </Button>
          <Button onClick={() => void handleDownload()} disabled={isDownloading}>
            <Download className="mr-2 size-4" aria-hidden />
            {copy.shareAsImage}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
