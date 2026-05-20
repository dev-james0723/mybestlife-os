/**
 * Client-only: resize gratitude photos for storage and list thumbnails.
 */
const MAX_DIMENSION = 960;
const JPEG_QUALITY = 0.82;
const THUMB_MAX_DIMENSION = 320;
const THUMB_JPEG_QUALITY = 0.78;

async function drawScaledJpeg(
  source: ImageBitmap,
  maxDimension: number,
  quality: number,
): Promise<Blob> {
  const { width, height } = source;
  const maxSide = Math.max(width, height);
  const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("NO_2D_CONTEXT");

  ctx.drawImage(source, 0, 0, outW, outH);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("TO_BLOB_FAILED");
  return blob;
}

async function fileToBitmap(source: Blob): Promise<ImageBitmap> {
  const bitmap = await createImageBitmap(source).catch(() => null);
  if (!bitmap) throw new Error("IMAGE_BITMAP_UNSUPPORTED");
  return bitmap;
}

export async function compressImageForGratitudePhoto(file: File): Promise<Blob> {
  const bitmap = await fileToBitmap(file);
  try {
    return await drawScaledJpeg(bitmap, MAX_DIMENSION, JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}

export async function compressImageForGratitudeThumbnail(source: File | Blob): Promise<Blob> {
  const bitmap = await fileToBitmap(source);
  try {
    return await drawScaledJpeg(bitmap, THUMB_MAX_DIMENSION, THUMB_JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}

export async function compressDataUrlForGratitudePhoto(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "gratitude-photo.jpg", {
    type: blob.type.startsWith("image/") ? blob.type : "image/png",
  });
  return compressImageForGratitudePhoto(file);
}
