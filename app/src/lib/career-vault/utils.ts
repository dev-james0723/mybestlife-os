/** Human-readable file size: 1.2 KB, 3.4 MB, 512 B. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  const exp = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, exp);
  const formatted = value >= 10 || exp === 0 ? Math.round(value).toString() : value.toFixed(1);
  return `${formatted} ${units[exp]}`;
}

/**
 * Strip filesystem-hostile chars and collapse whitespace. Keeps unicode
 * letters/marks so CJK filenames round-trip cleanly. Preserves a single
 * trailing extension.
 */
export function sanitizeFilename(raw: string): string {
  const trimmed = raw.trim().replace(/^\.+/, "");
  if (!trimmed) return "file";

  const lastDot = trimmed.lastIndexOf(".");
  const hasExt = lastDot > 0 && lastDot < trimmed.length - 1;
  const base = hasExt ? trimmed.slice(0, lastDot) : trimmed;
  const ext = hasExt ? trimmed.slice(lastDot + 1) : "";

  const cleanBase = base
    // Remove path separators and control characters.
    .replace(/[\\/]+/g, "-")
    .replace(/[\x00-\x1f]+/g, "")
    // Forbid characters unsafe for URLs/object names but keep letters (incl. CJK).
    .replace(/[<>:"|?*#%&{}]+/g, "")
    // Collapse whitespace → single underscore.
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");

  const cleanExt = ext
    .replace(/[^A-Za-z0-9]+/g, "")
    .toLowerCase()
    .slice(0, 16);

  const finalBase = cleanBase || "file";
  const safe = cleanExt ? `${finalBase}.${cleanExt}` : finalBase;
  return safe.slice(0, 180);
}

/** Friendly "2 days ago" / "just now" without pulling in a heavy lib. */
export function formatRelativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(mo / 12);
  return `${yr}y ago`;
}

/** True for mime types we want to render as an inline `<img>`. */
export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/** True for mime types we render inline via iframe / react-markdown. */
export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf";
}

export function isMarkdownMime(mime: string): boolean {
  return mime === "text/markdown" || mime === "text/plain";
}

/** Lowercase + hyphenate + strip punctuation. Shared with server for parity. */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u00C0-\uFFFF-]+/g, "");
}

/** Split a comma/newline-separated string into clean, deduped tags. */
export function parseTagInput(value: string, max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of value.split(/[,\n]+/)) {
    const t = normalizeTag(chunk);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}
