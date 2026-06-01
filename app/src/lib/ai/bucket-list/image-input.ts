/**
 * Shared helper for Bucket List AI routes that accept an image as either a
 * `data:` URL (from a browser file picker) or an http(s) URL. Returns inline
 * base64 bytes suitable for Gemini's `inlineData` parts.
 */

export const MAX_BUCKET_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export type DecodedImage = { mimeType: string; base64: string };

export async function decodeImageInput(imageUrl: string): Promise<DecodedImage> {
  const trimmed = imageUrl.trim();

  if (trimmed.startsWith("data:")) {
    const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/u.exec(trimmed);
    if (!match) throw new Error("invalid_data_url");
    const mimeType = match[1] || "image/png";
    const isBase64 = Boolean(match[2]);
    const payload = match[3] ?? "";
    const base64 = isBase64
      ? payload
      : Buffer.from(decodeURIComponent(payload), "utf8").toString("base64");
    const approxBytes = Math.floor((base64.length * 3) / 4);
    if (approxBytes > MAX_BUCKET_IMAGE_BYTES) throw new Error("image_too_large");
    if (!mimeType.startsWith("image/")) throw new Error("unsupported_image_type");
    return { mimeType, base64 };
  }

  if (/^https?:\/\//iu.test(trimmed)) {
    const res = await fetch(trimmed, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`image_fetch_failed_${res.status}`);
    const mimeType =
      res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    if (!mimeType.startsWith("image/")) throw new Error("unsupported_image_type");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BUCKET_IMAGE_BYTES) throw new Error("image_too_large");
    return { mimeType, base64: buf.toString("base64") };
  }

  throw new Error("invalid_image_url");
}
