import "server-only";
import sharp from "sharp";
import { validateGardenPetGlb } from "./pets";
/** Check embedded textures before the browser decodes them on a phone. */
export async function validatePetModelAsset(bytes: Uint8Array) {
  validateGardenPetGlb(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    jsonLength = view.getUint32(12, true);
  const doc = JSON.parse(
    new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)),
  );
  const binaryHeader = 20 + jsonLength,
    binaryStart = binaryHeader + 8;
  if (!doc.images?.length) return;
  if (
    binaryStart > bytes.length ||
    view.getUint32(binaryHeader + 4, true) !== 0x004e4942
  )
    throw new Error("Missing embedded texture data.");
  let pixels = 0;
  for (const image of doc.images) {
    const bufferView = doc.bufferViews?.[image.bufferView];
    if (
      !bufferView ||
      bufferView.buffer !== 0 ||
      !Number.isInteger(bufferView.byteLength)
    )
      throw new Error("Invalid texture buffer.");
    const start = binaryStart + (bufferView.byteOffset ?? 0),
      end = start + bufferView.byteLength;
    if (start < binaryStart || end > bytes.length || end <= start)
      throw new Error("Invalid texture bounds.");
    const metadata = await sharp(Buffer.from(bytes.subarray(start, end)), {
      limitInputPixels: 4096 * 4096,
    }).metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 2048 ||
      metadata.height > 2048
    )
      throw new Error("Textures must be 2048 pixels or smaller.");
    pixels += metadata.width * metadata.height;
    if (pixels > 16_777_216)
      throw new Error("Too many texture pixels for this garden.");
  }
}
