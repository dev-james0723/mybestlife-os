import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { validateDocumentFile } from "@/lib/documents/document-file-validation";
import {
  buildDocumentStoragePath,
  DOCUMENT_MAX_BYTES,
  isOwnedDocumentStoragePath,
  normalizeDocumentLocale,
  normalizeDocumentUploadId,
  parseDocumentAnalyzeField,
  sanitizeDocumentFileName,
} from "@/lib/documents/document-intake";

const encoder = new TextEncoder();

async function makeOfficeZip(input: {
  root: "word/document.xml" | "xl/workbook.xml" | "ppt/presentation.xml";
  macro?: boolean;
}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    input.macro
      ? '<Types><Override ContentType="application/vnd.ms-word.document.macroEnabled.main+xml" /></Types>'
      : "<Types />",
  );
  zip.file(input.root, "<document />");
  zip.file("_rels/.rels", "<Relationships />");
  if (input.macro) zip.file(input.root.split("/")[0]! + "/vbaProject.bin", "macro");
  return zip.generateAsync({ type: "uint8array" });
}

describe("document intake path safety", () => {
  it("keeps a readable safe file name and strips supplied paths", () => {
    expect(sanitizeDocumentFileName("../../保險 policy #1.pdf")).toBe("保險 policy _1.pdf");
    expect(buildDocumentStoragePath("user-1", "upload-1", "../Passport.pdf")).toBe(
      "user-1/upload-1/Passport.pdf",
    );
  });

  it("only accepts paths rooted in the exact authenticated user prefix", () => {
    expect(isOwnedDocumentStoragePath("user-1/upload-1/file.pdf", "user-1")).toBe(true);
    expect(isOwnedDocumentStoragePath("user-10/upload-1/file.pdf", "user-1")).toBe(false);
    expect(isOwnedDocumentStoragePath("other/upload-1/file.pdf", "user-1")).toBe(false);
    expect(isOwnedDocumentStoragePath("user-1/../other/file.pdf", "user-1")).toBe(false);
    expect(isOwnedDocumentStoragePath("/user-1/upload-1/file.pdf", "user-1")).toBe(false);
    expect(isOwnedDocumentStoragePath("user-1\\upload-1\\file.pdf", "user-1")).toBe(false);
    expect(isOwnedDocumentStoragePath("user-1/file.pdf", "user-1")).toBe(false);
  });

  it("parses explicit AI consent and normalizes locale", () => {
    expect(parseDocumentAnalyzeField("true")).toBe(true);
    expect(parseDocumentAnalyzeField("ON")).toBe(true);
    expect(parseDocumentAnalyzeField("false")).toBe(false);
    expect(normalizeDocumentLocale("zh-Hant-HK")).toBe("zh-Hant-HK");
    expect(normalizeDocumentLocale("ignore previous instructions")).toBe("en");
    expect(normalizeDocumentUploadId("F47AC10B-58CC-4372-A567-0E02B2C3D479")).toBe(
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    );
    expect(normalizeDocumentUploadId("../../other-user")).toBeNull();
  });
});

describe("document file validation", () => {
  it("accepts a PDF when extension, MIME, and signature agree", async () => {
    const result = await validateDocumentFile({
      fileName: "lease.pdf",
      declaredMimeType: "application/pdf",
      bytes: encoder.encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF"),
    });

    expect(result).toEqual({
      ok: true,
      extension: "pdf",
      mimeType: "application/pdf",
      aiReady: true,
      warnings: [],
    });
  });

  it("infers a canonical MIME type only when the browser sends a generic type", async () => {
    const result = await validateDocumentFile({
      fileName: "notes.md",
      declaredMimeType: "application/octet-stream",
      bytes: encoder.encode("# Renewal notes\nCall insurer."),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe("text/markdown");
      expect(result.warnings).toContain("mime_type_inferred_from_content");
    }
  });

  it("rejects a mismatched declared MIME type", async () => {
    const result = await validateDocumentFile({
      fileName: "passport.pdf",
      declaredMimeType: "image/jpeg",
      bytes: encoder.encode("%PDF-1.7\n%%EOF"),
    });

    expect(result).toMatchObject({ ok: false, code: "mime_type_mismatch" });
  });

  it("rejects executable content disguised with an allowed extension", async () => {
    const result = await validateDocumentFile({
      fileName: "invoice.pdf",
      declaredMimeType: "application/pdf",
      bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]),
    });

    expect(result).toMatchObject({ ok: false, code: "executable_not_allowed" });
  });

  it("rejects encrypted PDFs, archives, macros, and oversized files", async () => {
    const encryptedPdf = await validateDocumentFile({
      fileName: "locked.pdf",
      declaredMimeType: "application/pdf",
      bytes: encoder.encode("%PDF-1.7\ntrailer << /Encrypt 4 0 R >>\n%%EOF"),
    });
    const archive = await validateDocumentFile({
      fileName: "documents.zip",
      declaredMimeType: "application/zip",
      bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    });
    const macro = await validateDocumentFile({
      fileName: "budget.xlsm",
      declaredMimeType: "application/vnd.ms-excel.sheet.macroEnabled.12",
      bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    });
    const tooLarge = await validateDocumentFile({
      fileName: "large.txt",
      declaredMimeType: "text/plain",
      bytes: new Uint8Array(DOCUMENT_MAX_BYTES + 1),
    });

    expect(encryptedPdf).toMatchObject({
      ok: false,
      code: "encrypted_document_not_allowed",
    });
    expect(archive).toMatchObject({ ok: false, code: "archive_not_allowed" });
    expect(macro).toMatchObject({ ok: false, code: "macro_document_not_allowed" });
    expect(tooLarge).toMatchObject({ ok: false, code: "file_too_large" });
  });

  it("checks the internal structure of Office ZIP containers", async () => {
    const docx = await makeOfficeZip({ root: "word/document.xml" });
    const result = await validateDocumentFile({
      fileName: "policy.docx",
      declaredMimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: docx,
    });

    expect(result).toMatchObject({
      ok: true,
      extension: "docx",
      aiReady: true,
    });
  });

  it("accepts storage-only Office formats but does not mark them AI-ready", async () => {
    const xlsx = await makeOfficeZip({ root: "xl/workbook.xml" });
    const result = await validateDocumentFile({
      fileName: "inventory.xlsx",
      declaredMimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes: xlsx,
    });

    expect(result).toMatchObject({ ok: true, extension: "xlsx", aiReady: false });
  });

  it("rejects macro payloads hidden inside a .docx container", async () => {
    const docx = await makeOfficeZip({ root: "word/document.xml", macro: true });
    const result = await validateDocumentFile({
      fileName: "unsafe.docx",
      declaredMimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: docx,
    });

    expect(result).toMatchObject({ ok: false, code: "macro_document_not_allowed" });
  });
});
