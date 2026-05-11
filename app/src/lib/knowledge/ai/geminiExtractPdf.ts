import { extractFileTextViaGemini } from "@/lib/knowledge/ai/geminiExtractFileText";

export async function extractPdfTextViaGemini(pdfBytes: Uint8Array): Promise<string> {
  return extractFileTextViaGemini({
    bytes: pdfBytes,
    mimeType: "application/pdf",
    fileName: "document.pdf",
    mode: "extract",
  });
}
