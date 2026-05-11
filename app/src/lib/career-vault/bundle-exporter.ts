import JSZip from "jszip";
import { saveAs } from "file-saver";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type {
  BundleExportFormat,
  CareerVaultBundle,
  CareerVaultFile,
} from "@/types/career-vault";
import {
  createVaultSignedUrl,
  downloadVaultObject,
} from "./storage";
import { isImageMime, isPdfMime, sanitizeFilename } from "./utils";

/**
 * 100 MB cap as stated in Phase 4 acceptance criteria. Callers should check
 * `estimateBundleBytes` and warn before invoking export.
 */
export const BUNDLE_MAX_BYTES = 100 * 1024 * 1024;

export function estimateBundleBytes(files: CareerVaultFile[]): number {
  return files.reduce((sum, f) => sum + (f.file_size ?? 0), 0);
}

function twoDigit(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function orderedNames(files: CareerVaultFile[]): string[] {
  return files.map((f, i) => `${twoDigit(i + 1)}_${sanitizeFilename(f.filename)}`);
}

async function fetchFileBytes(file: CareerVaultFile): Promise<Uint8Array> {
  const url = await createVaultSignedUrl(file.file_path, 60 * 5);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${file.filename}: HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

type CoverOptions = {
  title: string;
  subtitle?: string | null;
  recipient?: string | null;
  dateLabel: string;
};

async function renderCoverPdfBytes(opts: CoverOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 72;
  const maxWidth = 612 - margin * 2;

  // Top accent line
  page.drawRectangle({
    x: margin,
    y: 792 - margin,
    width: maxWidth,
    height: 2,
    color: rgb(0.13, 0.15, 0.2),
  });

  // Title
  const title = opts.title.slice(0, 140);
  page.drawText(title, {
    x: margin,
    y: 792 - margin - 60,
    size: 28,
    font: bold,
    color: rgb(0.09, 0.11, 0.16),
    maxWidth,
  });

  let cursor = 792 - margin - 60 - 48;

  if (opts.subtitle) {
    page.drawText(opts.subtitle.slice(0, 200), {
      x: margin,
      y: cursor,
      size: 14,
      font,
      color: rgb(0.3, 0.3, 0.35),
      maxWidth,
    });
    cursor -= 28;
  }

  if (opts.recipient) {
    page.drawText(`Prepared for: ${opts.recipient.slice(0, 120)}`, {
      x: margin,
      y: cursor,
      size: 12,
      font,
      color: rgb(0.35, 0.35, 0.4),
      maxWidth,
    });
    cursor -= 24;
  }

  // Footer
  page.drawText(opts.dateLabel, {
    x: margin,
    y: margin,
    size: 10,
    font,
    color: rgb(0.45, 0.45, 0.5),
  });

  return doc.save();
}

async function bytesToPdfPage(
  doc: PDFDocument,
  bytes: Uint8Array,
  mime: string,
): Promise<void> {
  if (isPdfMime(mime)) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copied = await doc.copyPages(src, src.getPageIndices());
    copied.forEach((p) => doc.addPage(p));
    return;
  }

  if (isImageMime(mime)) {
    const isPng = mime === "image/png";
    const image = isPng
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes);
    const dims = image.scale(1);
    // Fit into a letter page with 36pt margin.
    const pageW = 612;
    const pageH = 792;
    const maxW = pageW - 72;
    const maxH = pageH - 72;
    const ratio = Math.min(maxW / dims.width, maxH / dims.height, 1);
    const w = dims.width * ratio;
    const h = dims.height * ratio;
    const page = doc.addPage([pageW, pageH]);
    page.drawImage(image, {
      x: (pageW - w) / 2,
      y: (pageH - h) / 2,
      width: w,
      height: h,
    });
    return;
  }

  throw new Error(`Unsupported mime for merged PDF: ${mime}`);
}

/** Callers should filter to supported mimes first. */
export function isMergedPdfSafe(mime: string): boolean {
  return isPdfMime(mime) || mime === "image/png" || mime === "image/jpeg";
}

type ExportOptions = {
  bundle: Pick<
    CareerVaultBundle,
    | "name"
    | "include_cover_page"
    | "cover_title"
    | "cover_subtitle"
    | "cover_recipient"
  >;
  files: CareerVaultFile[];
  format: BundleExportFormat;
  /** Final filename without extension; we append .zip or .pdf. */
  baseFilename: string;
  /** Callback fired with 0..1 progress after each file is added. */
  onProgress?: (fraction: number) => void;
  /** Localized "Cover" label for the PDF inside the ZIP. */
  coverFilenameLabel?: string;
  /** Localized date string for the cover footer. */
  coverDateLabel?: string;
};

export type ExportResult = {
  filename: string;
  skippedFiles: string[];
  bytes: number;
};

/**
 * Fetches each file, builds either a ZIP (all files + optional cover.pdf)
 * or a single merged PDF (PDFs + images only, DOCX excluded). Triggers a
 * browser download when done.
 */
export async function exportBundle(
  opts: ExportOptions,
): Promise<ExportResult> {
  const total = opts.files.length;
  const skippedFiles: string[] = [];

  if (opts.format === "zip") {
    const zip = new JSZip();
    const ordered = orderedNames(opts.files);

    if (opts.bundle.include_cover_page) {
      const cover = await renderCoverPdfBytes({
        title: opts.bundle.cover_title || opts.bundle.name,
        subtitle: opts.bundle.cover_subtitle,
        recipient: opts.bundle.cover_recipient,
        dateLabel: opts.coverDateLabel ?? new Date().toLocaleDateString(),
      });
      zip.file(`${opts.coverFilenameLabel ?? "00_Cover"}.pdf`, cover);
    }

    for (let i = 0; i < opts.files.length; i++) {
      const f = opts.files[i];
      try {
        const bytes = await fetchFileBytes(f);
        zip.file(ordered[i], bytes);
      } catch {
        skippedFiles.push(f.filename);
      }
      opts.onProgress?.((i + 1) / Math.max(total, 1));
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const filename = `${sanitizeFilename(opts.baseFilename)}.zip`;
    saveAs(blob, filename);
    return { filename, skippedFiles, bytes: blob.size };
  }

  // merged_pdf
  const doc = await PDFDocument.create();

  if (opts.bundle.include_cover_page) {
    const cover = await renderCoverPdfBytes({
      title: opts.bundle.cover_title || opts.bundle.name,
      subtitle: opts.bundle.cover_subtitle,
      recipient: opts.bundle.cover_recipient,
      dateLabel: opts.coverDateLabel ?? new Date().toLocaleDateString(),
    });
    const coverDoc = await PDFDocument.load(cover);
    const pages = await doc.copyPages(coverDoc, coverDoc.getPageIndices());
    pages.forEach((p) => doc.addPage(p));
  }

  for (let i = 0; i < opts.files.length; i++) {
    const f = opts.files[i];
    if (!isMergedPdfSafe(f.mime_type)) {
      skippedFiles.push(f.filename);
      opts.onProgress?.((i + 1) / Math.max(total, 1));
      continue;
    }
    try {
      const bytes = await fetchFileBytes(f);
      await bytesToPdfPage(doc, bytes, f.mime_type);
    } catch {
      skippedFiles.push(f.filename);
    }
    opts.onProgress?.((i + 1) / Math.max(total, 1));
  }

  const pdfBytes = await doc.save();
  // pdf-lib returns a Uint8Array. Wrap it in a standalone ArrayBuffer so the
  // Blob constructor is happy even when the underlying buffer is a
  // SharedArrayBuffer (edge-case, but `new Blob([Uint8Array])` typechecks
  // strictly on `ArrayBufferLike`).
  const copy = new Uint8Array(pdfBytes.byteLength);
  copy.set(pdfBytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  const filename = `${sanitizeFilename(opts.baseFilename)}.pdf`;
  saveAs(blob, filename);
  return { filename, skippedFiles, bytes: blob.size };
}

/**
 * Convenience: triggers a browser download for a single file using the
 * storage helper, returning the filename used. Extracted so shares /
 * bundle detail pages can reuse a common "download" entrypoint.
 */
export async function downloadVaultFile(file: CareerVaultFile): Promise<void> {
  await downloadVaultObject(file.file_path, file.filename);
}
