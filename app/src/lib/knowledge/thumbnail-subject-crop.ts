export type KnowledgeThumbnailSubjectBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type KnowledgeThumbnailCropMode =
  | "detected-subject"
  | "portrait-subject-bias"
  | "center";

export type KnowledgeThumbnailCrop = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  mode: KnowledgeThumbnailCropMode;
};

export const KNOWLEDGE_CARD_THUMBNAIL_ASPECT = 16 / 9;

type FaceDetectorResult = {
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type NativeFaceDetector = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => {
  detect: (image: ImageBitmap) => Promise<FaceDetectorResult[]>;
};

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeSubjectBox(
  box: KnowledgeThumbnailSubjectBox,
  imageWidth: number,
  imageHeight: number,
): KnowledgeThumbnailSubjectBox | null {
  const x = clamp(finiteOr(box.x, 0), 0, imageWidth);
  const y = clamp(finiteOr(box.y, 0), 0, imageHeight);
  const maxW = imageWidth - x;
  const maxH = imageHeight - y;
  const width = clamp(finiteOr(box.width, 0), 0, maxW);
  const height = clamp(finiteOr(box.height, 0), 0, maxH);
  if (width <= 1 || height <= 1) return null;
  return { x, y, width, height };
}

function unionSubjectBoxes(
  boxes: KnowledgeThumbnailSubjectBox[],
  imageWidth: number,
  imageHeight: number,
): KnowledgeThumbnailSubjectBox | null {
  const valid = boxes
    .map((box) => sanitizeSubjectBox(box, imageWidth, imageHeight))
    .filter((box): box is KnowledgeThumbnailSubjectBox => Boolean(box));

  if (valid.length === 0) return null;

  const left = Math.min(...valid.map((box) => box.x));
  const top = Math.min(...valid.map((box) => box.y));
  const right = Math.max(...valid.map((box) => box.x + box.width));
  const bottom = Math.max(...valid.map((box) => box.y + box.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function baseCoverCrop(
  imageWidth: number,
  imageHeight: number,
  targetAspect: number,
): { sw: number; sh: number } {
  const imageAspect = imageWidth / imageHeight;
  if (imageAspect > targetAspect) {
    return { sw: imageHeight * targetAspect, sh: imageHeight };
  }
  return { sw: imageWidth, sh: imageWidth / targetAspect };
}

export function computeKnowledgeThumbnailCrop({
  width,
  height,
  subjectBoxes = [],
  targetAspect = KNOWLEDGE_CARD_THUMBNAIL_ASPECT,
}: {
  width: number;
  height: number;
  subjectBoxes?: KnowledgeThumbnailSubjectBox[];
  targetAspect?: number;
}): KnowledgeThumbnailCrop {
  const safeWidth = Math.max(1, finiteOr(width, 1));
  const safeHeight = Math.max(1, finiteOr(height, 1));
  const safeAspect = Math.max(0.1, finiteOr(targetAspect, KNOWLEDGE_CARD_THUMBNAIL_ASPECT));
  const { sw, sh } = baseCoverCrop(safeWidth, safeHeight, safeAspect);
  const subject = unionSubjectBoxes(subjectBoxes, safeWidth, safeHeight);

  if (subject) {
    const subjectCenterX = subject.x + subject.width / 2;
    const subjectCenterY = subject.y + subject.height / 2;

    return {
      sx: clamp(subjectCenterX - sw / 2, 0, safeWidth - sw),
      // Put detected faces/subjects slightly above center so hair/heads stay visible.
      sy: clamp(subjectCenterY - sh * 0.38, 0, safeHeight - sh),
      sw,
      sh,
      mode: "detected-subject",
    };
  }

  const isTallPhoto = safeHeight / safeWidth >= 1.08;
  if (isTallPhoto) {
    return {
      sx: clamp((safeWidth - sw) / 2, 0, safeWidth - sw),
      sy: 0,
      sw,
      sh,
      mode: "portrait-subject-bias",
    };
  }

  return {
    sx: clamp((safeWidth - sw) / 2, 0, safeWidth - sw),
    sy: clamp((safeHeight - sh) / 2, 0, safeHeight - sh),
    sw,
    sh,
    mode: "center",
  };
}

export async function detectKnowledgeThumbnailSubjectBoxes(
  bitmap: ImageBitmap,
): Promise<KnowledgeThumbnailSubjectBox[]> {
  const Detector = (globalThis as unknown as { FaceDetector?: NativeFaceDetector })
    .FaceDetector;
  if (typeof Detector !== "function") return [];

  try {
    const detector = new Detector({ fastMode: true, maxDetectedFaces: 12 });
    const faces = await detector.detect(bitmap);
    return faces
      .map((face) => face.boundingBox)
      .filter((box): box is NonNullable<FaceDetectorResult["boundingBox"]> => Boolean(box))
      .map((box) => ({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      }));
  } catch {
    return [];
  }
}
