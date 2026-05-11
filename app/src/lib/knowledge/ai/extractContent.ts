import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isGeminiRegionBlockedErrorMessage } from "@/lib/ai/gemini-text";
import {
  extractFileTextViaGemini,
  GEMINI_INLINE_FILE_MAX_BYTES,
} from "@/lib/knowledge/ai/geminiExtractFileText";
import { extractPdfTextViaGemini } from "@/lib/knowledge/ai/geminiExtractPdf";

/** Below this length, treat local PDF parse as failed (scanned PDF, odd encoding, etc.). */
const MIN_PDF_TEXT_CHARS = 48;

export async function extractFileContent(
  storagePath: string,
  originalName: string,
  mimeType?: string,
): Promise<string> {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  const supabase = await createServerSupabaseClient();

  const { data: blob, error } = await supabase.storage
    .from("knowledge-files")
    .download(storagePath);

  if (error || !blob) {
    throw new Error(`Failed to download file from storage: ${error?.message ?? "no data"}`);
  }

  const mimeGuess = (mimeType || blob.type || "").toLowerCase();
  const rasterExt =
    ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "avif", "heic", "heif"].includes(
      ext,
    );
  const rasterLike =
    (mimeGuess.startsWith("image/") && mimeGuess !== "image/svg+xml") ||
    (rasterExt && ext !== "svg");
  if (rasterLike) {
    return extractRasterImageKnowledgeText(blob, originalName, mimeType || blob.type);
  }

  switch (ext) {
    case "pdf":
      return extractPdf(blob, mimeType);
    case "docx":
      return extractDocx(blob, originalName, mimeType);
    case "doc":
      return extractGenericFileText(blob, originalName, mimeType);
    case "txt":
    case "md":
    case "csv":
    case "json":
    case "html":
    case "xml":
      return blob.text();
    default:
      return extractGenericFileText(blob, originalName, mimeType);
  }
}

async function extractRasterImageKnowledgeText(
  blob: Blob,
  originalName: string,
  mimeType?: string,
): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const effectiveMime = mimeType || blob.type || "image/jpeg";
  const title = originalName.replace(/\.[^.]+$/, "") || "Photo";

  if (bytes.byteLength > GEMINI_INLINE_FILE_MAX_BYTES) {
    return photoKnowledgeFallbackText(title);
  }

  try {
    const extracted = await extractFileTextViaGemini({
      bytes,
      mimeType: effectiveMime,
      fileName: originalName,
      mode: "describe",
    });
    if (extracted.trim().length > 0) return extracted;
  } catch (e) {
    console.warn("[knowledge-ai] image describe failed, using fallback:", e);
  }

  return photoKnowledgeFallbackText(title);
}

function photoKnowledgeFallbackText(title: string): string {
  return `Photo: ${title}. User-uploaded image.`;
}

async function extractPdf(blob: Blob, mimeType?: string): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (bytes.byteLength >= 5) {
    const header = String.fromCharCode(
      bytes[0]!,
      bytes[1]!,
      bytes[2]!,
      bytes[3]!,
      bytes[4]!,
    );
    if (header !== "%PDF-") {
      throw new Error(
        "File does not look like a valid PDF (missing %PDF- header). Check the file extension matches the format.",
      );
    }
  }

  let localText = "";
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      localText = result.text?.trim() ?? "";
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err) {
    // Do not fail early; many PDFs fail local parsing in runtime environments.
    console.warn("[knowledge-ai] local PDF parsing failed, falling back to Gemini:", err);
  }

  if (localText.length >= MIN_PDF_TEXT_CHARS) {
    return localText;
  }

  const skipCloudPdf =
    process.env.GEMINI_SKIP_CLOUD_PDF === "1" ||
    process.env.KNOWLEDGE_SKIP_GEMINI_PDF === "1";
  if (skipCloudPdf) {
    if (localText.length > 0) return localText;
    throw new Error(
      "Cloud PDF extraction is disabled (set GEMINI_SKIP_CLOUD_PDF). No embedded text was found locally — try a searchable/OCR PDF or paste text manually.",
    );
  }

  let geminiText = "";
  try {
    geminiText = (await extractPdfTextViaGemini(bytes)).trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isGeminiRegionBlockedErrorMessage(msg)) {
      console.warn(
        "[knowledge-ai] Gemini API unavailable (region); using local PDF text only if present.",
      );
      if (localText.length > 0) {
        return localText;
      }
      throw new Error(
        "Google Gemini blocks requests from your region or hosting location (\"User location is not supported\"). " +
          "This PDF has no embedded text we could read offline — it may be scanned/image-only. " +
          "Options: export a searchable PDF with OCR; paste the text; deploy in a Gemini-supported region; use Vertex AI in Google Cloud; or set GEMINI_SKIP_CLOUD_PDF=1 to skip cloud calls when you only need local text.",
      );
    }
    throw new Error(
      `Cloud PDF read failed (${msg}). For scanned PDFs, check GEMINI_API_KEY and model access; or export a searchable / OCR'd PDF.`,
    );
  }

  if (geminiText.length > 0) {
    return geminiText;
  }

  if (localText.length > 0) {
    return localText;
  }

  throw new Error(
    "No text could be read from this PDF. It may be image-only without readable text, password-protected, or corrupted. Try: export a searchable PDF with OCR, or upload a .docx / plain text copy.",
  );
}

async function extractDocx(blob: Blob, originalName: string, mimeType?: string): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const raw = await mammoth.extractRawText({ buffer });
  let text = raw.value?.trim() ?? "";

  if (text.length < MIN_PDF_TEXT_CHARS) {
    const html = await mammoth.convertToHtml({ buffer });
    const fromHtml = stripHtmlToPlain(html.value ?? "");
    if (fromHtml.length > text.length) {
      text = fromHtml;
    }
  }

  if (text.length < MIN_PDF_TEXT_CHARS) {
    try {
      const bytes = new Uint8Array(arrayBuffer);
      const effectiveMime =
        mimeType ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const gemini = await extractFileTextViaGemini({
        bytes,
        mimeType: effectiveMime,
        fileName: originalName,
        mode: "extract",
      });
      if (gemini.trim().length > text.length) {
        text = gemini.trim();
      }
    } catch (e) {
      console.warn("[knowledge-ai] docx Gemini fallback failed:", e);
    }
  }

  return text;
}

async function extractGenericFileText(
  blob: Blob,
  originalName: string,
  mimeType?: string,
): Promise<string> {
  const effectiveMime = mimeType || blob.type || "application/octet-stream";
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  const isMediaLike =
    effectiveMime.startsWith("image/") ||
    effectiveMime.startsWith("audio/") ||
    effectiveMime.startsWith("video/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "mp3", "wav", "ogg", "m4a", "mp4", "mov", "avi", "webm"].includes(ext);

  if (!isMediaLike) {
    const asText = await blob.text().catch(() => "");
    if (asText.trim().length >= 24) return asText;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mode = effectiveMime.startsWith("audio/")
    ? "transcribe"
    : effectiveMime.startsWith("video/")
      ? "transcribe"
      : effectiveMime.startsWith("image/")
        ? "describe"
        : "extract";

  const extracted = await extractFileTextViaGemini({
    bytes,
    mimeType: effectiveMime,
    fileName: originalName,
    mode,
  });

  if (extracted.trim().length > 0) return extracted;
  throw new Error(
    `No readable text extracted from ${effectiveMime}. For media files, ensure the file is clear and under size limits.`,
  );
}

function stripHtmlToPlain(html: string): string {
  const t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

/**
 * Extract the main body text from an HTML page.
 * Strips nav, footer, scripts, styles, and returns the largest text block.
 */
export function extractArticleBody(html: string): string {
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");

  const articleMatch = /<article[\s\S]*?>([\s\S]*?)<\/article>/i.exec(cleaned);
  if (articleMatch) {
    cleaned = articleMatch[1];
  } else {
    const mainMatch = /<main[\s\S]*?>([\s\S]*?)<\/main>/i.exec(cleaned);
    if (mainMatch) cleaned = mainMatch[1];
  }

  const text = cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}
