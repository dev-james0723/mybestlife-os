"use client";

import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useUploadDreamImage } from "@/hooks/use-bucket-list";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketDreamImageRecord,
  BucketDreamImageType,
} from "@/types/bucket-list";

const MAX_BYTES = 10 * 1024 * 1024;

/** Upload button → public dream-images bucket → `bucket_dream_images` row. */
export function DreamImageUploader({
  bucketItemId,
  imageType = "inspiration",
  label,
  variant = "outline",
  copy,
  onUploaded,
}: {
  bucketItemId: string;
  imageType?: BucketDreamImageType;
  label: string;
  variant?: "outline" | "secondary" | "default" | "ghost";
  copy: BucketListUiCopy;
  onUploaded?: (record: BucketDreamImageRecord) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDreamImage();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(copy.aiInvalidImage);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(copy.visualsImageTooLarge);
      return;
    }
    try {
      const record = await upload.mutateAsync({
        bucket_item_id: bucketItemId,
        file,
        image_type: imageType,
      });
      onUploaded?.(record);
    } catch {
      // toast handled in the hook
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        size="sm"
        variant={variant}
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {upload.isPending ? copy.visualsUploading : label}
      </Button>
    </>
  );
}
