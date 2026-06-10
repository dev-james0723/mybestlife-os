import { stripHtml } from "@/lib/utils/html";
import {
  classifyOSBuddyDroppedFile,
  formatOSBuddyFileSize,
  OS_BUDDY_FILE_KIND_LABELS,
  type OSBuddyDroppedFileKind,
} from "@/lib/os-buddy/os-buddy-file-drop";
import type { Idea } from "@/types/database";
import type { KnowledgeItem } from "@/types/knowledge";

export type OSBuddyQuickSnapDestination = "idea" | "knowledge";

export type OSBuddyQuickSnapEntry =
  | {
      kind: "url";
      url: string;
      label: string;
    }
  | {
      kind: "text";
      text: string;
      label: string;
    }
  | {
      kind: "html";
      html: string;
      text: string;
      label: string;
    }
  | {
      kind: "file";
      file: File;
      name: string;
      size: number;
      mime: string | null;
      fileKind: OSBuddyDroppedFileKind;
      label: string;
    };

export type OSBuddyQuickSnapPrimaryKind =
  | "url"
  | "text"
  | "html"
  | "file"
  | "mixed";

export type OSBuddyQuickSnapPayload = {
  entries: OSBuddyQuickSnapEntry[];
  primaryKind: OSBuddyQuickSnapPrimaryKind;
  previewLabel: string;
  pastedAt: number;
};

export type OSBuddyQuickSnapAckContext = {
  destination: OSBuddyQuickSnapDestination;
  primaryKind: OSBuddyQuickSnapPrimaryKind;
  previewLabel: string;
  savedCount: number;
  labels: string[];
};

export type OSBuddyQuickSnapRouteResult = {
  ideas: Idea[];
  knowledgeItems: KnowledgeItem[];
  savedCount: number;
  ackContext: OSBuddyQuickSnapAckContext;
};

export type OSBuddyQuickSnapShiftTapState = {
  count: number;
  lastAt: number | null;
};

export type OSBuddyQuickSnapShiftTapResult = {
  state: OSBuddyQuickSnapShiftTapState;
  immediateDestination: OSBuddyQuickSnapDestination | null;
};

export const QUICK_SNAP_SHIFT_DOUBLE_TAP_MS = 360;

const MAX_TEXT_CHARS = 40_000;
const MAX_LABEL_CHARS = 72;
const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

function cleanClipboardText(value: string | null | undefined) {
  return (value ?? "").replace(/\u0000/g, "").trim();
}

function normalizeUrlCandidate(value: string) {
  const trimmed = value.trim().replace(/[),.;!?]+$/g, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function extractQuickSnapUrls(...inputs: Array<string | null | undefined>) {
  const urls = new Map<string, string>();

  for (const input of inputs) {
    const text = cleanClipboardText(input);
    if (!text) continue;

    for (const line of text.split(/\r?\n/)) {
      const direct = normalizeUrlCandidate(line);
      if (direct && !urls.has(direct)) urls.set(direct, direct);
    }

    for (const match of text.matchAll(URL_RE)) {
      const normalized = normalizeUrlCandidate(match[0]);
      if (normalized && !urls.has(normalized)) urls.set(normalized, normalized);
    }
  }

  return Array.from(urls.values());
}

function isOnlyKnownUrls(text: string, urls: string[]) {
  if (!text || urls.length === 0) return false;
  let remainder = text;
  for (const url of urls) {
    remainder = remainder.replaceAll(url, " ");
    try {
      const original = new URL(url).toString();
      remainder = remainder.replaceAll(original, " ");
    } catch {
      // Ignore URL parsing drift; the normalized URL already did the useful work.
    }
  }
  remainder = remainder.replace(URL_RE, " ");
  return remainder.replace(/[\s,;|]+/g, "").length === 0;
}

function labelFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
    const pathLabel = path ? `/${path.split("/").slice(0, 2).join("/")}` : "";
    return `${parsed.hostname}${pathLabel}`.slice(0, MAX_LABEL_CHARS);
  } catch {
    return url.slice(0, MAX_LABEL_CHARS);
  }
}

function labelFromText(text: string, fallback: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return fallback;
  return compact.slice(0, MAX_LABEL_CHARS);
}

function entryFromFile(file: File): OSBuddyQuickSnapEntry {
  const fileKind = classifyOSBuddyDroppedFile({
    name: file.name,
    mime: file.type || null,
  });
  return {
    kind: "file",
    file,
    name: file.name || "Untitled file",
    size: file.size,
    mime: file.type || null,
    fileKind,
    label: `${file.name || "Untitled file"} · ${formatOSBuddyFileSize(file.size)}`,
  };
}

function filesFromClipboardData(data: DataTransfer) {
  const seen = new Set<File>();
  const files: File[] = [];

  for (const file of Array.from(data.files ?? [])) {
    if (file && !seen.has(file) && (file.size > 0 || file.name)) {
      seen.add(file);
      files.push(file);
    }
  }

  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file && !seen.has(file) && (file.size > 0 || file.name)) {
      seen.add(file);
      files.push(file);
    }
  }

  return files;
}

export function createOSBuddyQuickSnapPayloadFromParts(input: {
  files?: File[];
  plainText?: string | null;
  html?: string | null;
  uriList?: string | null;
  now?: number;
}): OSBuddyQuickSnapPayload | null {
  const entries: OSBuddyQuickSnapEntry[] = [];
  const plainText = cleanClipboardText(input.plainText).slice(0, MAX_TEXT_CHARS);
  const html = cleanClipboardText(input.html).slice(0, MAX_TEXT_CHARS);
  const htmlText = html ? stripHtml(html).slice(0, MAX_TEXT_CHARS) : "";
  const readableText = plainText || htmlText;
  const urls = extractQuickSnapUrls(input.uriList, plainText, html);
  const onlyUrls = isOnlyKnownUrls(readableText, urls);

  for (const file of input.files ?? []) {
    entries.push(entryFromFile(file));
  }

  if (urls.length > 0 && onlyUrls) {
    for (const url of urls) {
      entries.push({ kind: "url", url, label: labelFromUrl(url) });
    }
  } else {
    if (html && htmlText) {
      entries.push({
        kind: "html",
        html,
        text: htmlText,
        label: labelFromText(htmlText, "HTML selection"),
      });
    } else if (plainText) {
      entries.push({
        kind: "text",
        text: plainText,
        label: labelFromText(plainText, "Text"),
      });
    }

    for (const url of urls) {
      entries.push({ kind: "url", url, label: labelFromUrl(url) });
    }
  }

  if (entries.length === 0) return null;

  const uniqueEntries = dedupeQuickSnapEntries(entries);
  return {
    entries: uniqueEntries,
    primaryKind: resolveQuickSnapPrimaryKind(uniqueEntries),
    previewLabel: buildQuickSnapPreviewLabel(uniqueEntries),
    pastedAt: input.now ?? Date.now(),
  };
}

export function createOSBuddyQuickSnapPayloadFromClipboardData(
  data: DataTransfer,
  now?: number,
) {
  return createOSBuddyQuickSnapPayloadFromParts({
    files: filesFromClipboardData(data),
    plainText: data.getData("text/plain"),
    html: data.getData("text/html"),
    uriList: data.getData("text/uri-list"),
    now,
  });
}

function dedupeQuickSnapEntries(entries: OSBuddyQuickSnapEntry[]) {
  const seen = new Set<string>();
  const next: OSBuddyQuickSnapEntry[] = [];
  for (const entry of entries) {
    const key =
      entry.kind === "url"
        ? `url:${entry.url}`
        : entry.kind === "file"
          ? `file:${entry.name}:${entry.size}:${entry.mime ?? ""}`
          : `${entry.kind}:${entry.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(entry);
  }
  return next;
}

export function resolveQuickSnapPrimaryKind(
  entries: OSBuddyQuickSnapEntry[],
): OSBuddyQuickSnapPrimaryKind {
  const kinds = new Set(entries.map((entry) => entry.kind));
  if (kinds.size !== 1) return "mixed";
  return entries[0]?.kind ?? "text";
}

export function buildQuickSnapPreviewLabel(entries: OSBuddyQuickSnapEntry[]) {
  if (entries.length === 0) return "capture";
  if (entries.length > 1) {
    const fileCount = entries.filter((entry) => entry.kind === "file").length;
    const urlCount = entries.filter((entry) => entry.kind === "url").length;
    if (fileCount === entries.length) return `${fileCount} files`;
    if (urlCount === entries.length) return `${urlCount} links`;
    return `${entries.length} items`;
  }

  const entry = entries[0];
  if (!entry) return "capture";
  if (entry.kind === "file") {
    return `${OS_BUDDY_FILE_KIND_LABELS[entry.fileKind].toLowerCase()} ${entry.name}`;
  }
  if (entry.kind === "url") return `link from ${entry.label}`;
  if (entry.kind === "html") return "HTML selection";
  return "text note";
}

export function quickSnapEntryText(entry: OSBuddyQuickSnapEntry) {
  switch (entry.kind) {
    case "url":
      return entry.url;
    case "html":
      return entry.text;
    case "text":
      return entry.text;
    case "file":
      return `${entry.name} (${OS_BUDDY_FILE_KIND_LABELS[entry.fileKind]}, ${formatOSBuddyFileSize(entry.size)})`;
  }
}

export function buildLocalQuickSnapAck(input: OSBuddyQuickSnapAckContext) {
  const destination =
    input.destination === "idea" ? "Idea Capture" : "Knowledge Base";
  const label = input.previewLabel || "capture";
  const countPrefix = input.savedCount > 1 ? `${input.savedCount} items` : label;
  const variants = [
    `I got your ${countPrefix}. Saved to ${destination}.`,
    `Captured ${label} for ${destination}.`,
    `Done. Your ${label} is in ${destination}.`,
  ];
  const index = Math.abs(hashQuickSnapAck(`${destination}:${label}:${input.savedCount}`)) % variants.length;
  return variants[index] ?? variants[0];
}

export function registerQuickSnapShiftTap(input: {
  state: OSBuddyQuickSnapShiftTapState;
  now: number;
  repeat?: boolean;
  doubleTapMs?: number;
}): OSBuddyQuickSnapShiftTapResult {
  if (input.repeat) {
    return { state: input.state, immediateDestination: null };
  }

  const doubleTapMs = input.doubleTapMs ?? QUICK_SNAP_SHIFT_DOUBLE_TAP_MS;
  const withinWindow =
    input.state.lastAt != null && input.now - input.state.lastAt <= doubleTapMs;
  const nextCount = withinWindow ? input.state.count + 1 : 1;

  if (nextCount >= 2) {
    return {
      state: { count: 0, lastAt: null },
      immediateDestination: "knowledge",
    };
  }

  return {
    state: { count: nextCount, lastAt: input.now },
    immediateDestination: null,
  };
}

function hashQuickSnapAck(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash;
}
