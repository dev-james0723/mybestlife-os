"use client";

/**
 * Shared Memories / 合照 (spec §6, §8). Upload + gallery of the multi-image
 * memory layer. Safety: we never auto-identify faces or infer relationship
 * status — the user labels each image's type and (optionally) a caption.
 *
 * Uploading a "profile_photo" syncs to relationships.photo_url for backwards
 * compatibility (spec §7).
 */

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ImagePlus, Trash2, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import { getImageTypeLabel } from "@/components/relationship/utils/intelligence-display";
import {
  useRelationshipImages,
  useCreateRelationshipImage,
  useDeleteRelationshipImage,
} from "@/hooks/use-relationship-intelligence";
import { useUpdateRelationship } from "@/hooks/use-relationships";
import {
  uploadRelationshipImage,
  deleteRelationshipImage,
  isRelationshipImageStorageUrl,
} from "@/lib/relationships/image-storage";
import {
  RELATIONSHIP_IMAGE_TYPES,
  type RelationshipImageType,
} from "@/types/relationship-intelligence";
import type { RelationshipImage } from "@/types/database";

type Props = { relationshipId: string };

export function RelationshipSharedMemories({ relationshipId }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: images } = useRelationshipImages(relationshipId);
  const createImage = useCreateRelationshipImage();
  const deleteImage = useDeleteRelationshipImage(relationshipId);
  const updateRel = useUpdateRelationship();

  const [pendingType, setPendingType] = useState<RelationshipImageType>(
    "shared_photo",
  );
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const { publicUrl } = await uploadRelationshipImage({
        file,
        relationshipId,
      });
      await createImage.mutateAsync({
        relationship_id: relationshipId,
        image_url: publicUrl,
        image_type: pendingType,
        caption: null,
        ai_caption: null,
        event_date: null,
        location: null,
        related_project_id: null,
        is_primary: pendingType === "profile_photo",
        extracted_json: null,
      });
      // Sync a profile photo to the legacy avatar field.
      if (pendingType === "profile_photo") {
        updateRel.mutate({ id: relationshipId, data: { photo_url: publicUrl } });
      }
    } catch {
      toast.error(copy.relLoadError);
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(img: RelationshipImage) {
    deleteImage.mutate(img.id);
    if (isRelationshipImageStorageUrl(img.image_url)) {
      void deleteRelationshipImage(img.image_url);
    }
  }

  const list = images ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Images className="h-4 w-4" aria-hidden />
          {copy.modalSharedMemories}
        </h3>
        <div className="flex items-center gap-1.5">
          <Select
            value={pendingType}
            onValueChange={(v) => setPendingType(v as RelationshipImageType)}
          >
            <SelectTrigger className="h-8 w-auto text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_IMAGE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {getImageTypeLabel(t, copy)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="mr-1 h-3.5 w-3.5" />
            {uploading ? copy.imagesUploading : copy.imagesUpload}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.imagesEmpty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list.map((img, i) => (
            <motion.div
              key={img.id}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduce ? 0 : Math.min(i * 0.03, 0.15) }}
              className="group relative overflow-hidden rounded-lg border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.image_url}
                alt={img.caption ?? getImageTypeLabel(img.image_type, copy)}
                className="aspect-square w-full object-cover"
              />
              <Badge
                variant="secondary"
                className="absolute left-1 top-1 font-normal text-[9px]"
              >
                {getImageTypeLabel(img.image_type, copy)}
              </Badge>
              <button
                type="button"
                onClick={() => handleDelete(img)}
                aria-label={copy.imageDelete}
                className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {(img.caption || img.ai_caption) && (
                <p className="truncate bg-background/90 px-1.5 py-1 text-[10px] text-muted-foreground">
                  {img.caption ?? img.ai_caption}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
