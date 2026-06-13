import { describe, expect, it } from "vitest";
import {
  computeKnowledgeThumbnailCrop,
  KNOWLEDGE_CARD_THUMBNAIL_ASPECT,
} from "./thumbnail-subject-crop";

describe("computeKnowledgeThumbnailCrop", () => {
  it("keeps a detected portrait face near the top inside the card thumbnail", () => {
    const crop = computeKnowledgeThumbnailCrop({
      width: 600,
      height: 900,
      subjectBoxes: [{ x: 250, y: 42, width: 100, height: 124 }],
    });

    expect(crop.mode).toBe("detected-subject");
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBe(0);
    expect(crop.sw / crop.sh).toBeCloseTo(KNOWLEDGE_CARD_THUMBNAIL_ASPECT, 5);
  });

  it("moves a landscape crop toward detected subjects instead of blind center cropping", () => {
    const crop = computeKnowledgeThumbnailCrop({
      width: 1200,
      height: 600,
      subjectBoxes: [{ x: 980, y: 120, width: 120, height: 160 }],
    });

    expect(crop.mode).toBe("detected-subject");
    expect(crop.sx).toBeGreaterThan(0);
    expect(crop.sx + crop.sw).toBeCloseTo(1200, 5);
  });

  it("uses an upper portrait bias when face detection is unavailable", () => {
    const crop = computeKnowledgeThumbnailCrop({
      width: 600,
      height: 900,
      subjectBoxes: [],
    });

    expect(crop.mode).toBe("portrait-subject-bias");
    expect(crop.sy).toBe(0);
    expect(crop.sw / crop.sh).toBeCloseTo(KNOWLEDGE_CARD_THUMBNAIL_ASPECT, 5);
  });

  it("keeps ordinary landscape images centered", () => {
    const crop = computeKnowledgeThumbnailCrop({
      width: 1600,
      height: 900,
      subjectBoxes: [],
    });

    expect(crop.mode).toBe("center");
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBe(0);
  });
});
