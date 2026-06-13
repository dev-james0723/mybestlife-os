import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_THUMBNAIL_HEIGHT,
  KNOWLEDGE_THUMBNAIL_JPEG_QUALITY,
  KNOWLEDGE_THUMBNAIL_MIME_TYPE,
  KNOWLEDGE_THUMBNAIL_WIDTH,
  normalizeKnowledgeThumbnailImage,
} from "@/lib/knowledge/ai/thumbnailImage";

describe("normalizeKnowledgeThumbnailImage", () => {
  it("stores generated thumbnails as bounded 16:9 JPEGs", async () => {
    const source = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: "#3366cc",
      },
    })
      .png()
      .toBuffer();

    const result = await normalizeKnowledgeThumbnailImage(source);
    const metadata = await sharp(result.data).metadata();

    expect(result.ext).toBe("jpg");
    expect(result.contentType).toBe(KNOWLEDGE_THUMBNAIL_MIME_TYPE);
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(KNOWLEDGE_THUMBNAIL_WIDTH);
    expect(metadata.height).toBe(KNOWLEDGE_THUMBNAIL_HEIGHT);
    expect(KNOWLEDGE_THUMBNAIL_JPEG_QUALITY).toBeLessThan(90);
  });

  it("covers non-16:9 model output instead of adding side gutters", async () => {
    const source = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 4,
        background: "#123456",
      },
    })
      .png()
      .toBuffer();

    const result = await normalizeKnowledgeThumbnailImage(source);
    const metadata = await sharp(result.data).metadata();
    const { data, info } = await sharp(result.data)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const midLeft = (Math.floor((info.height - 1) / 2) * info.width) * info.channels;

    expect(metadata.width).toBe(KNOWLEDGE_THUMBNAIL_WIDTH);
    expect(metadata.height).toBe(KNOWLEDGE_THUMBNAIL_HEIGHT);
    expect(data[midLeft]).toBeLessThan(80);
    expect(data[midLeft + 1]).toBeLessThan(100);
    expect(data[midLeft + 2]).toBeLessThan(130);
  });
});
