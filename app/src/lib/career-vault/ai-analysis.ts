import { createClient } from "@/lib/supabase/client";
import type { SmartTagSuggestion } from "@/types/career-vault";
import { isImageMime, isMarkdownMime, isPdfMime } from "./utils";

const EDGE_FN = "suggest-file-metadata";
const MAX_TEXT = 5000;
const CLIENT_TIMEOUT_MS = 10_000;

/**
 * Best-effort text extraction from a browser-side File. We only handle the
 * cases we can do with zero extra dependencies; PDF/DOCX get dropped to the
 * LLM with just filename + MIME type.
 */
async function extractContentSample(file: File): Promise<string> {
  if (isMarkdownMime(file.type) || file.type.startsWith("text/")) {
    try {
      const text = await file.text();
      return text.slice(0, MAX_TEXT);
    } catch {
      return "";
    }
  }
  // Other types: we intentionally skip extraction client-side. pdf-parse /
  // mammoth are heavy and live server-side only.
  return "";
}

async function encodeImageBase64(file: File): Promise<string | null> {
  if (!isImageMime(file.type)) return null;
  // Keep tiny images only; the edge function caps at ~2MB base64.
  if (file.size > 1_500_000) return null;
  try {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk)),
      );
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

export type SmartTagOptions = {
  /** When false (or when user hasn't opted in), we skip the network call entirely. */
  enabled: boolean;
};

/**
 * Returns a suggestion, or `null` when the call was skipped / failed / timed
 * out. Callers always treat `null` as "fall back to manual entry silently".
 */
export async function requestSmartTagSuggestion(
  file: File,
  options: SmartTagOptions,
): Promise<SmartTagSuggestion | null> {
  if (!options.enabled) return null;

  let contentSample = "";
  let imageBase64: string | null = null;

  try {
    if (isImageMime(file.type)) {
      imageBase64 = await encodeImageBase64(file);
    } else if (isPdfMime(file.type)) {
      contentSample = "";
    } else {
      contentSample = await extractContentSample(file);
    }
  } catch {
    // Keep going even if extraction fails — filename alone may still help.
  }

  // Race the invoke against a timeout: when the edge function is slow we
  // want to fall back to manual entry rather than block the upload form.
  const timeoutPromise = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), CLIENT_TIMEOUT_MS);
  });

  const supabase = createClient();
  const invokePromise = supabase.functions
    .invoke<SmartTagSuggestion>(EDGE_FN, {
      body: {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        contentSample,
        imageBase64,
      },
      headers: { "x-cv-phase3": "1" },
    })
    .then(({ data, error }) => (error || !data ? null : data))
    .catch(() => null);

  const result = await Promise.race([invokePromise, timeoutPromise]);
  return result;
}
