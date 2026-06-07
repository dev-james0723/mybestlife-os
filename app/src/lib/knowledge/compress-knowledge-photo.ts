/**
 * Client-only: produce a smaller JPEG for Knowledge card thumbnails (faster gallery load).
 */
const MAX_DIMENSION = 720;
const JPEG_QUALITY = 0.72;

export async function compressImageForKnowledgeThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error("IMAGE_BITMAP_UNSUPPORTED");
  }

  try {
    const { width, height } = bitmap;
    const maxSide = Math.max(width, height);
    const scale = maxSide > MAX_DIMENSION ? MAX_DIMENSION / maxSide : 1;
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("NO_2D_CONTEXT");

    ctx.drawImage(bitmap, 0, 0, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("TO_BLOB_FAILED");
    return blob;
  } finally {
    bitmap.close();
  }
}
