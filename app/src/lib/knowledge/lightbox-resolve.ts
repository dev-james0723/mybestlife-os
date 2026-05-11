/**
 * Decide what the knowledge thumbnail lightbox should render for any item.
 */

import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";
import type { KnowledgeItem } from "@/types/knowledge";

export type KnowledgeLightboxModel =
  | { kind: "image"; src: string }
  | { kind: "pdf"; src: string }
  | { kind: "video"; src: string }
  | { kind: "audio"; src: string }
  | { kind: "text"; text: string; format: "markdown" | "plain" }
  | { kind: "iframe"; src: string };

const RASTER_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "heic",
  "heif",
  "tif",
  "tiff",
]);

const VIDEO_EXT = new Set(["mp4", "mov", "avi", "mkv", "m4v", "mpeg", "mpg", "webm"]);
const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"]);

function extFromStoragePath(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

function isRasterUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg|heic)(\?|$)/i.test(url);
}

export function resolveKnowledgeLightboxModel(item: KnowledgeItem): KnowledgeLightboxModel | null {
  if (item.filePath) {
    const src = knowledgeFilesProxyUrlFromStoragePath(item.filePath);
    const ext = extFromStoragePath(item.filePath);

    if (item.sourceType === "voice_memo") {
      return { kind: "audio", src };
    }

    /**
     * Thumbnail clicks should enlarge the **cover image** for PDF / Word, not open
     * the embedded document viewer or trigger a browser download.
     */
    const thumb = item.thumbnailUrl?.trim();
    if (thumb && (ext === "pdf" || ext === "doc" || ext === "docx")) {
      return { kind: "image", src: thumb };
    }

    if (item.contentType === "photo" || RASTER_EXT.has(ext)) {
      return { kind: "image", src };
    }

    /** No cover yet — do not open the raw PDF in the thumbnail lightbox. */
    if (ext === "pdf" || ext === "doc" || ext === "docx") {
      return null;
    }

    if (VIDEO_EXT.has(ext)) {
      if (ext === "webm" && item.contentType === "podcast") {
        return { kind: "audio", src };
      }
      return { kind: "video", src };
    }

    if (AUDIO_EXT.has(ext) || item.contentType === "podcast") {
      return { kind: "audio", src };
    }

    const textish = ["txt", "md", "markdown", "csv", "json", "xml", "html", "htm", "yaml", "yml"];
    if (item.rawContent?.trim() && textish.includes(ext)) {
      const md = ext === "md" || ext === "markdown";
      return { kind: "text", text: item.rawContent, format: md ? "markdown" : "plain" };
    }

    return { kind: "iframe", src };
  }

  const remote = item.screenshotUrl ?? item.thumbnailUrl;
  if (remote && (remote.startsWith("/api/knowledge-files/") || isRasterUrl(remote))) {
    return { kind: "image", src: remote };
  }

  if (item.rawContent?.trim()) {
    return { kind: "text", text: item.rawContent, format: "plain" };
  }

  return null;
}

export function canOpenKnowledgeLightbox(item: KnowledgeItem): boolean {
  if (item.status === "processing") return false;
  return resolveKnowledgeLightboxModel(item) != null;
}
