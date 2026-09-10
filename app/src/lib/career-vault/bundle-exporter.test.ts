import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import type { CareerVaultFile } from "@/types/career-vault";
const capture = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("file-saver", () => ({ saveAs: capture.save }));
vi.mock("./storage", () => ({ createVaultSignedUrl: vi.fn(async (path: string) => `https://files.example.invalid/${path}`), downloadVaultObject: vi.fn() }));
import { BUNDLE_MAX_BYTES, exportBundle } from "./bundle-exporter";
const file = (id: string, mime = "application/pdf"): CareerVaultFile => ({ id, filename: `${id}.pdf`, file_path: id, file_size: 200, mime_type: mime } as CareerVaultFile);
const bundle = { name: "Application", include_cover_page: false, cover_title: null, cover_subtitle: null, cover_recipient: null };
beforeEach(() => { capture.save.mockReset(); vi.unstubAllGlobals(); });
describe("reviewed bundle export", () => {
  it("writes all ZIP entries in the reviewed order with exact content", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(url.endsWith("second") ? "second bytes" : "first bytes")));
    const result = await exportBundle({ bundle, files: [file("second"), file("first")], format: "zip", baseFilename: "Application" });
    const zip = await JSZip.loadAsync(await (capture.save.mock.calls[0][0] as Blob).arrayBuffer());
    expect(Object.keys(zip.files)).toEqual(["01_second.pdf", "02_first.pdf"]);
    expect(await zip.file("01_second.pdf")!.async("string")).toBe("second bytes");
    expect(result.skippedFiles).toEqual([]);
  });
  it("opens the merged PDF with the reviewed page order and cover", async () => {
    const first = await PDFDocument.create(); first.addPage([300, 400]);
    const second = await PDFDocument.create(); second.addPage([500, 600]);
    const a = await first.save(), b = await second.save();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(new Uint8Array(url.endsWith("second") ? b : a))));
    await exportBundle({ bundle: { ...bundle, include_cover_page: true }, files: [file("second"), file("first")], format: "merged_pdf", baseFilename: "Application", coverDateLabel: "September 8, 2026" });
    const pdf = await PDFDocument.load(await (capture.save.mock.calls[0][0] as Blob).arrayBuffer());
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([612, 500, 300]);
  });
  it.each(["zip", "merged_pdf"] as const)("does not download a partial %s on a missing file", async (format) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
    await expect(exportBundle({ bundle, files: [file("missing")], format, baseFilename: "Application" })).rejects.toThrow("503");
    expect(capture.save).not.toHaveBeenCalled();
  });
  it("rejects empty, oversize and entirely unsupported merged bundles", async () => {
    await expect(exportBundle({ bundle, files: [], format: "zip", baseFilename: "x" })).rejects.toThrow("at least one");
    await expect(exportBundle({ bundle, files: [{ ...file("large"), file_size: BUNDLE_MAX_BYTES + 1 }], format: "zip", baseFilename: "x" })).rejects.toThrow("100 MB");
    await expect(exportBundle({ bundle, files: [file("word", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")], format: "merged_pdf", baseFilename: "x" })).rejects.toThrow("Choose ZIP");
    expect(capture.save).not.toHaveBeenCalled();
  });
});
