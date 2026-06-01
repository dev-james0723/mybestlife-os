"use client";

import { useState } from "react";
import { ImageIcon, Loader2, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetPrimaryDreamImage, useUpdateBucketItem } from "@/hooks/use-bucket-list";
import { useGenerateCoverImage } from "@/hooks/use-bucket-ai";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import {
  BUCKET_COVER_IMAGE_STYLES,
  type BucketCoverImageStyle,
  type BucketItem,
} from "@/types/bucket-list";

import { DreamImageUploader } from "./dream-image-uploader";

function styleLabel(style: BucketCoverImageStyle, copy: BucketListUiCopy): string {
  switch (style) {
    case "realistic_travel":
      return copy.styleRealisticTravel;
    case "cinematic":
      return copy.styleCinematic;
    case "dreamy":
      return copy.styleDreamy;
    case "minimal_editorial":
      return copy.styleMinimalEditorial;
    case "luxury_magazine":
      return copy.styleLuxuryMagazine;
  }
}

/**
 * Cover controls: generate an AI dream visual (style-aware), upload a cover, or
 * revert to the auto-resolved catalog image. Generated visuals are added to the
 * gallery for review before the user chooses one as the primary cover.
 */
export function DreamCoverSelector({
  item,
  copy,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
}) {
  const [style, setStyle] = useState<BucketCoverImageStyle>("realistic_travel");

  const generate = useGenerateCoverImage();
  const setPrimary = useSetPrimaryDreamImage();
  const updateBucket = useUpdateBucketItem();

  const destination =
    item.destination_name ||
    item.destination_city ||
    item.destination_country ||
    undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            {copy.visualsStyleLabel}
          </label>
          <Select
            value={style}
            onValueChange={(v) =>
              setStyle((v as BucketCoverImageStyle) ?? "realistic_travel")
            }
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_COVER_IMAGE_STYLES.map((s) => (
                <SelectItem key={s} value={s}>
                  {styleLabel(s, copy)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          className="bg-lime-400 text-black hover:bg-lime-300"
          disabled={generate.isPending}
          onClick={() =>
            generate.mutate({
              bucketItemId: item.id,
              title: item.title,
              type: item.type,
              destination,
              style,
              setAsCover: false,
            })
          }
        >
          {generate.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generate.isPending ? copy.visualsGenerating : copy.visualsGenerate}
        </Button>

        <DreamImageUploader
          bucketItemId={item.id}
          imageType="cover"
          label={copy.visualsUploadCover}
          copy={copy}
          onUploaded={(rec) => setPrimary.mutate(rec)}
        />

        {item.cover_image_url ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={updateBucket.isPending}
            onClick={() =>
              updateBucket.mutate({
                id: item.id,
                data: { cover_image_url: null, cover_image_is_ai: false },
              })
            }
          >
            <RotateCcw className="h-4 w-4" />
            {copy.visualsRevertCatalog}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            {copy.visualsUsingCatalog}
          </span>
        )}
      </div>
    </div>
  );
}
