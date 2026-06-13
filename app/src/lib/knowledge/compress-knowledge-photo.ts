/**
 * Client-only: produce a smaller JPEG for Knowledge card thumbnails (faster gallery load).
 */
import {
  computeKnowledgeThumbnailCrop,
  detectKnowledgeThumbnailSubjectBoxes,
  KNOWLEDGE_CARD_THUMBNAIL_ASPECT,
} from "@/lib/knowledge/thumbnail-subject-crop";

const MAX_DIMENSION = 720;
const JPEG_QUALITY = 0.72;

export async function compressImageForKnowledgeThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error("IMAGE_BITMAP_UNSUPPORTED");
  }

  try {
    const { width, height } = bitmap;
    const subjectBoxes = await detectKnowledgeThumbnailSubjectBoxes(bitmap);
    const crop = computeKnowledgeThumbnailCrop({
      width,
      height,
      subjectBoxes,
      targetAspect: KNOWLEDGE_CARD_THUMBNAIL_ASPECT,
    });
    const scale = crop.sw > MAX_DIMENSION ? MAX_DIMENSION / crop.sw : 1;
    const outW = Math.max(1, Math.round(crop.sw * scale));
    const outH = Math.max(1, Math.round(outW / KNOWLEDGE_CARD_THUMBNAIL_ASPECT));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("NO_2D_CONTEXT");

    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("TO_BLOB_FAILED");
    return blob;
  } finally {
    bitmap.close();
  }
}
