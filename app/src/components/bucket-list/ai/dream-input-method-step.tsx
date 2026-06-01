"use client";

import { useRef } from "react";
import { ImagePlus, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const EXAMPLE_PROMPTS = [
  "I want to see the Northern Lights in Iceland.",
  "I want to build a small creative studio where I can record music, film videos, and think quietly.",
  "I want to become fluent enough in Japanese to live in Japan comfortably.",
] as const;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("read_failed"));
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

export function DreamInputMethodStep({
  text,
  onTextChange,
  imageDataUrl,
  onImageChange,
  onError,
  copy,
  disabled,
}: {
  text: string;
  onTextChange: (value: string) => void;
  imageDataUrl: string | null;
  onImageChange: (dataUrl: string | null) => void;
  onError: (message: string) => void;
  copy: BucketListUiCopy;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError(copy.aiInvalidImage);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError(copy.aiImageTooLarge);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onImageChange(dataUrl);
    } catch {
      onError(copy.aiInvalidImage);
    }
  }

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {copy.aiDisclaimer}
      </p>

      <div className="space-y-1.5">
        <Label>{copy.aiInputTextLabel}</Label>
        <Textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={copy.aiInputTextPlaceholder}
          rows={4}
          disabled={disabled}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{copy.aiExamplesLabel}</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={disabled}
              onClick={() => onTextChange(ex)}
              className="rounded-full border border-border bg-background px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-lime-400/50 hover:text-foreground disabled:opacity-50"
            >
              {ex.length > 52 ? `${ex.slice(0, 52)}…` : ex}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{copy.aiInputImageLabel}</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        {imageDataUrl ? (
          <div className="relative overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview, not a remote asset */}
            <img
              src={imageDataUrl}
              alt="Inspiration preview"
              className="max-h-48 w-full object-cover"
            />
            <div className="absolute right-2 top-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                {copy.aiInputImageChange}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                aria-label={copy.aiInputImageRemove}
                onClick={() => onImageChange(null)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 py-6 text-sm text-muted-foreground transition-colors hover:border-lime-400/50 hover:text-foreground disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
            {copy.aiInputImageHint}
          </button>
        )}
      </div>
    </div>
  );
}
