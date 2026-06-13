import sharp from "sharp";

export const KNOWLEDGE_THUMBNAIL_WIDTH = 960;
export const KNOWLEDGE_THUMBNAIL_HEIGHT = 540;
export const KNOWLEDGE_THUMBNAIL_JPEG_QUALITY = 82;
export const KNOWLEDGE_THUMBNAIL_MIME_TYPE = "image/jpeg";
export const KNOWLEDGE_THUMBNAIL_EXTENSION = "jpg";
export const KNOWLEDGE_THUMBNAIL_RESOLUTION_LABEL = `${KNOWLEDGE_THUMBNAIL_WIDTH}x${KNOWLEDGE_THUMBNAIL_HEIGHT}`;

export type NormalizedKnowledgeThumbnailImage = {
  data: Buffer;
  ext: typeof KNOWLEDGE_THUMBNAIL_EXTENSION;
  contentType: typeof KNOWLEDGE_THUMBNAIL_MIME_TYPE;
};

export async function normalizeKnowledgeThumbnailImage(
  data: Buffer,
): Promise<NormalizedKnowledgeThumbnailImage> {
  const normalized = await sharp(data, { failOn: "none" })
    .rotate()
    .resize({
      width: KNOWLEDGE_THUMBNAIL_WIDTH,
      height: KNOWLEDGE_THUMBNAIL_HEIGHT,
      fit: "contain",
      background: "#f8fafc",
    })
    .flatten({ background: "#f8fafc" })
    .jpeg({ quality: KNOWLEDGE_THUMBNAIL_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return {
    data: normalized,
    ext: KNOWLEDGE_THUMBNAIL_EXTENSION,
    contentType: KNOWLEDGE_THUMBNAIL_MIME_TYPE,
  };
}
