"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Loader2,
  Pencil,
  Star,
  Trash2,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useDeleteDreamImage,
  useDreamImages,
  useSetPrimaryDreamImage,
  useUpdateDreamImage,
} from "@/hooks/use-bucket-list";
import { useAnalyzeInspiration } from "@/hooks/use-bucket-ai";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketDreamImageRecord,
  BucketInspirationAnalysis,
  BucketItem,
} from "@/types/bucket-list";

import { DreamImageUploader } from "./dream-image-uploader";
import { DreamCoverSelector } from "./dream-cover-selector";
import { DreamImageAnalysisReview } from "./dream-image-analysis-review";
import {
  bucketEntrance,
  bucketHoverLift,
  bucketStaggerContainer,
  bucketStaggerItem,
} from "../bucket-motion";

/**
 * Full dream visuals panel: cover controls + inspiration gallery. Each image
 * can be set as the cover, captioned, analyzed, or removed. Generated-image
 * provenance remains internal.
 */
export function DreamInspirationGallery({
  item,
  copy,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const { data: images, isLoading } = useDreamImages(item.id);
  const [analysisFor, setAnalysisFor] = useState<{
    imageId: string;
    result: BucketInspirationAnalysis;
  } | null>(null);

  const list = images ?? [];
  const hasVisual = list.length > 0 || Boolean(item.cover_image_url);

  return (
    <motion.div
      variants={bucketStaggerContainer(reduceMotion)}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Cover controls */}
      <motion.section variants={bucketStaggerItem(reduceMotion, 10)} className="rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-semibold">{copy.visualsCoverHeading}</h3>
        {!hasVisual ? (
          <div className="mb-3 rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-center">
            <p className="text-sm font-medium">{copy.visualsEmptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.visualsEmptyDescription}
            </p>
          </div>
        ) : null}
        <DreamCoverSelector item={item} copy={copy} />
      </motion.section>

      {/* Inspiration gallery */}
      <motion.section variants={bucketStaggerItem(reduceMotion, 10)} className="rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{copy.visualsGalleryHeading}</h3>
          <DreamImageUploader
            bucketItemId={item.id}
            imageType="inspiration"
            label={copy.visualsUpload}
            copy={copy}
          />
        </div>

        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {copy.visualsGalleryEmpty}
          </p>
        ) : (
          <motion.div
            variants={bucketStaggerContainer(reduceMotion)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {list.map((image) => (
              <GalleryImageCard
                key={image.id}
                image={image}
                item={item}
                copy={copy}
                analysisOpen={analysisFor?.imageId === image.id}
                onAnalyzed={(result) =>
                  setAnalysisFor({ imageId: image.id, result })
                }
                onCloseAnalysis={() => setAnalysisFor(null)}
              />
            ))}
          </motion.div>
        )}

        {analysisFor ? (
          <motion.div className="mt-3" {...bucketEntrance(reduceMotion, 0, 8)}>
            <DreamImageAnalysisReview
              analysis={analysisFor.result}
              imageId={analysisFor.imageId}
              item={item}
              copy={copy}
              onClose={() => setAnalysisFor(null)}
            />
          </motion.div>
        ) : null}
      </motion.section>
    </motion.div>
  );
}

function GalleryImageCard({
  image,
  item,
  copy,
  analysisOpen,
  onAnalyzed,
  onCloseAnalysis,
}: {
  image: BucketDreamImageRecord;
  item: BucketItem;
  copy: BucketListUiCopy;
  analysisOpen: boolean;
  onAnalyzed: (result: BucketInspirationAnalysis) => void;
  onCloseAnalysis: () => void;
}) {
  const setPrimary = useSetPrimaryDreamImage();
  const remove = useDeleteDreamImage();
  const updateImage = useUpdateDreamImage();
  const analyze = useAnalyzeInspiration();
  const reduceMotion = useReducedMotion() ?? false;

  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(image.caption ?? "");

  async function runAnalyze() {
    if (analysisOpen) {
      onCloseAnalysis();
      return;
    }
    try {
      const result = await analyze.mutateAsync({
        imageUrl: image.image_url,
        bucketItemId: item.id,
      });
      onAnalyzed(result);
    } catch {
      // toast handled in the hook
    }
  }

  return (
    <motion.div
      variants={bucketStaggerItem(reduceMotion, 10)}
      whileHover={bucketHoverLift(reduceMotion)}
      className="group overflow-hidden rounded-lg border"
    >
      <div className="relative aspect-video">
        {/* eslint-disable-next-line @next/next/no-img-element -- user/AI image from our public bucket */}
        <img
          src={image.image_url}
          alt={image.caption ?? "Dream inspiration"}
          className={
            reduceMotion
              ? "h-full w-full object-cover"
              : "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          }
          loading="lazy"
        />
        {image.is_primary ? (
          <Badge className="absolute right-1.5 top-1.5 bg-lime-400/90 px-1.5 py-0 text-[9px] text-black">
            {copy.visualsIsCover}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-1.5 p-2">
        {editingCaption ? (
          <div className="flex items-center gap-1">
            <Input
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              placeholder={copy.visualsCaptionPlaceholder}
              className="h-7 text-xs"
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={copy.visualsCaptionSave}
              onClick={() => {
                updateImage.mutate({
                  id: image.id,
                  bucketItemId: item.id,
                  data: { caption: captionDraft.trim() || null },
                });
                setEditingCaption(false);
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCaptionDraft(image.caption ?? "");
              setEditingCaption(true);
            }}
            className="flex w-full items-center gap-1 text-left text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">
              {image.caption || copy.visualsAddCaption}
            </span>
          </button>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {!image.is_primary ? (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={copy.visualsSetCover}
                title={copy.visualsSetCover}
                disabled={setPrimary.isPending}
                onClick={() => setPrimary.mutate(image)}
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={copy.visualsAnalyze}
              title={copy.visualsAnalyze}
              disabled={analyze.isPending}
              onClick={() => void runAnalyze()}
            >
              {analyze.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={copy.visualsRemove}
            title={copy.visualsRemove}
            disabled={remove.isPending}
            onClick={() => remove.mutate(image)}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
