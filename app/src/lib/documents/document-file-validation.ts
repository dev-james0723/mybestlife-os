import JSZip from "jszip";
import {
  DOCUMENT_MAX_BYTES,
  type DocumentFileValidationErrorCode,
  type DocumentFileValidationResult,
} from "@/lib/documents/document-intake";

type FormatSpec = {
  canonicalMimeType: string;
  declaredMimeTypes: readonly string[];
  kind: "pdf" | "text" | "rtf" | "image" | "office-zip" | "odf-zip";
  aiReady: boolean;
  officeRoot?: string;
  odfMimeType?: string;
};

const FORMAT_SPECS: Readonly<Record<string, FormatSpec>> = {
  pdf: {
    canonicalMimeType: "application/pdf",
    declaredMimeTypes: ["application/pdf"],
    kind: "pdf",
    aiReady: true,
  },
  docx: {
    canonicalMimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    declaredMimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
    ],
    kind: "office-zip",
    officeRoot: "word/document.xml",
    aiReady: true,
  },
  xlsx: {
    canonicalMimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    declaredMimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
    ],
    kind: "office-zip",
    officeRoot: "xl/workbook.xml",
    aiReady: false,
  },
  pptx: {
    canonicalMimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    declaredMimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
    ],
    kind: "office-zip",
    officeRoot: "ppt/presentation.xml",
    aiReady: false,
  },
  odt: {
    canonicalMimeType: "application/vnd.oasis.opendocument.text",
    declaredMimeTypes: ["application/vnd.oasis.opendocument.text", "application/zip"],
    kind: "odf-zip",
    odfMimeType: "application/vnd.oasis.opendocument.text",
    aiReady: false,
  },
  ods: {
    canonicalMimeType: "application/vnd.oasis.opendocument.spreadsheet",
    declaredMimeTypes: [
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/zip",
    ],
    kind: "odf-zip",
    odfMimeType: "application/vnd.oasis.opendocument.spreadsheet",
    aiReady: false,
  },
  odp: {
    canonicalMimeType: "application/vnd.oasis.opendocument.presentation",
    declaredMimeTypes: [
      "application/vnd.oasis.opendocument.presentation",
      "application/zip",
    ],
    kind: "odf-zip",
    odfMimeType: "application/vnd.oasis.opendocument.presentation",
    aiReady: false,
  },
  txt: {
    canonicalMimeType: "text/plain",
    declaredMimeTypes: ["text/plain"],
    kind: "text",
    aiReady: true,
  },
  md: {
    canonicalMimeType: "text/markdown",
    declaredMimeTypes: ["text/markdown", "text/plain", "text/x-markdown"],
    kind: "text",
    aiReady: true,
  },
  csv: {
    canonicalMimeType: "text/csv",
    declaredMimeTypes: [
      "text/csv",
      "application/csv",
      "text/plain",
      "application/vnd.ms-excel",
    ],
    kind: "text",
    aiReady: true,
  },
  rtf: {
    canonicalMimeType: "application/rtf",
    declaredMimeTypes: ["application/rtf", "text/rtf", "text/plain"],
    kind: "rtf",
    aiReady: false,
  },
  jpg: imageSpec("image/jpeg", ["image/jpeg", "image/jpg"]),
  jpeg: imageSpec("image/jpeg", ["image/jpeg", "image/jpg"]),
  png: imageSpec("image/png"),
  webp: imageSpec("image/webp"),
  heic: imageSpec("image/heic", ["image/heic", "image/heif"]),
  heif: imageSpec("image/heif", ["image/heif", "image/heic"]),
  gif: imageSpec("image/gif", ["image/gif"], false),
  tif: imageSpec("image/tiff", ["image/tiff", "image/tif"], false),
  tiff: imageSpec("image/tiff", ["image/tiff", "image/tif"], false),
  bmp: imageSpec("image/bmp", ["image/bmp", "image/x-ms-bmp"], false),
};

const MACRO_EXTENSIONS = new Set([
  "docm",
  "dotm",
  "xlsm",
  "xltm",
  "xlam",
  "pptm",
  "potm",
  "ppam",
  "ppsm",
  "sldm",
]);

const ARCHIVE_EXTENSIONS = new Set([
  "zip",
  "rar",
  "7z",
  "gz",
  "gzip",
  "tgz",
  "tar",
  "bz2",
  "xz",
  "cab",
  "iso",
]);

const EXECUTABLE_EXTENSIONS = new Set([
  "exe",
  "dll",
  "com",
  "scr",
  "msi",
  "bat",
  "cmd",
  "ps1",
  "sh",
  "app",
  "dmg",
  "pkg",
  "jar",
  "apk",
  "wasm",
]);

const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream"]);
const ZIP_ENTRY_LIMIT = 2_000;
const ZIP_UNCOMPRESSED_LIMIT = 250 * 1024 * 1024;
const ZIP_SINGLE_ENTRY_LIMIT = 100 * 1024 * 1024;

type ZipEntryMetadata = {
  name: string;
  encrypted: boolean;
  compressedSize: number;
  uncompressedSize: number;
};

function imageSpec(
  canonicalMimeType: string,
  declaredMimeTypes: readonly string[] = [canonicalMimeType],
  aiReady = true,
): FormatSpec {
  return {
    canonicalMimeType,
    declaredMimeTypes,
    kind: "image",
    aiReady,
  };
}

function invalid(
  code: DocumentFileValidationErrorCode,
  message: string,
): DocumentFileValidationResult {
  return { ok: false, code, message };
}

export function getDocumentFileExtension(fileName: string): string | null {
  const leaf = fileName.split(/[\\/]/).pop()?.trim() ?? "";
  const dot = leaf.lastIndexOf(".");
  if (!leaf || dot <= 0 || dot === leaf.length - 1) return null;
  return leaf.slice(dot + 1).toLowerCase();
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  if (!needle || bytes.length < needle.length) return false;
  const encoded = new TextEncoder().encode(needle);
  outer: for (let i = 0; i <= bytes.length - encoded.length; i += 1) {
    for (let j = 0; j < encoded.length; j += 1) {
      if (bytes[i + j] !== encoded[j]) continue outer;
    }
    return true;
  }
  return false;
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! +
    bytes[offset + 1]! * 0x100 +
    bytes[offset + 2]! * 0x1_0000 +
    bytes[offset + 3]! * 0x1_000000
  );
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let i = bytes.length - 22; i >= minimum; i -= 1) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return i;
    }
  }
  return -1;
}

function inspectZipEntries(bytes: Uint8Array): ZipEntryMetadata[] | null {
  const endOffset = findEndOfCentralDirectory(bytes);
  if (endOffset < 0 || endOffset + 22 > bytes.length) return null;

  const entryCount = readUint16LE(bytes, endOffset + 10);
  const centralSize = readUint32LE(bytes, endOffset + 12);
  const centralOffset = readUint32LE(bytes, endOffset + 16);
  if (
    entryCount === 0xffff ||
    centralSize === 0xffff_ffff ||
    centralOffset === 0xffff_ffff ||
    entryCount > ZIP_ENTRY_LIMIT ||
    centralOffset + centralSize > bytes.length
  ) {
    return null;
  }

  const entries: ZipEntryMetadata[] = [];
  let cursor = centralOffset;
  while (cursor < centralOffset + centralSize && entries.length < entryCount) {
    if (
      bytes[cursor] !== 0x50 ||
      bytes[cursor + 1] !== 0x4b ||
      bytes[cursor + 2] !== 0x01 ||
      bytes[cursor + 3] !== 0x02 ||
      cursor + 46 > bytes.length
    ) {
      return null;
    }

    const flags = readUint16LE(bytes, cursor + 8);
    const compressedSize = readUint32LE(bytes, cursor + 20);
    const uncompressedSize = readUint32LE(bytes, cursor + 24);
    const nameLength = readUint16LE(bytes, cursor + 28);
    const extraLength = readUint16LE(bytes, cursor + 30);
    const commentLength = readUint16LE(bytes, cursor + 32);
    const entryEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (entryEnd > bytes.length) return null;

    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    let name: string;
    try {
      name = new TextDecoder((flags & 0x0800) !== 0 ? "utf-8" : "latin1", {
        fatal: true,
      }).decode(nameBytes);
    } catch {
      return null;
    }

    entries.push({
      name,
      encrypted: (flags & 0x0001) !== 0,
      compressedSize,
      uncompressedSize,
    });
    cursor = entryEnd;
  }

  return entries.length === entryCount ? entries : null;
}

function detectDangerousBinary(bytes: Uint8Array):
  | "executable"
  | "archive"
  | "ole"
  | null {
  if (
    startsWith(bytes, [0x4d, 0x5a]) ||
    startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46]) ||
    startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe]) ||
    startsWith(bytes, [0x00, 0x61, 0x73, 0x6d]) ||
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xce]) ||
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xcf]) ||
    startsWith(bytes, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe])
  ) {
    return "executable";
  }

  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return "ole";
  }

  if (
    startsWith(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]) ||
    startsWith(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]) ||
    startsWith(bytes, [0x1f, 0x8b]) ||
    startsWith(bytes, [0x42, 0x5a, 0x68]) ||
    startsWith(bytes, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]) ||
    startsWith(bytes, [0x4d, 0x53, 0x43, 0x46]) ||
    (bytes.length > 262 && ascii(bytes, 257, 5) === "ustar")
  ) {
    return "archive";
  }

  return null;
}

function looksLikeUtfText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 64 * 1024));
  if (startsWith(sample, [0xff, 0xfe]) || startsWith(sample, [0xfe, 0xff])) {
    return sample.length >= 4 && sample.length % 2 === 0;
  }
  if (sample.includes(0)) return false;

  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(sample);
  } catch {
    return false;
  }
  if (!decoded) return false;

  let suspiciousControls = 0;
  for (const char of decoded) {
    const code = char.codePointAt(0)!;
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      suspiciousControls += 1;
    }
  }
  return suspiciousControls / decoded.length < 0.01;
}

function hasImageSignature(extension: string, bytes: Uint8Array): boolean {
  switch (extension) {
    case "jpg":
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "gif":
      return ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a";
    case "webp":
      return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
    case "bmp":
      return ascii(bytes, 0, 2) === "BM";
    case "tif":
    case "tiff":
      return (
        startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) ||
        startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])
      );
    case "heic":
    case "heif": {
      if (ascii(bytes, 4, 4) !== "ftyp") return false;
      const brands = ascii(bytes, 8, Math.min(56, Math.max(0, bytes.length - 8)));
      return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].some((brand) =>
        brands.includes(brand),
      );
    }
    default:
      return false;
  }
}

function hasUnsafeZipPath(name: string): boolean {
  const normalized = name.replace(/\\/g, "/");
  return (
    normalized.startsWith("/") ||
    normalized.split("/").some((segment) => segment === ".." || segment === ".")
  );
}

function hasUnsafeEmbeddedFile(name: string): boolean {
  const extension = getDocumentFileExtension(name);
  if (!extension) return false;
  return (
    EXECUTABLE_EXTENSIONS.has(extension) ||
    ARCHIVE_EXTENSIONS.has(extension) ||
    MACRO_EXTENSIONS.has(extension)
  );
}

async function validateZipContainer(
  bytes: Uint8Array,
  extension: string,
  spec: FormatSpec,
): Promise<DocumentFileValidationResult | null> {
  if (!startsWith(bytes, [0x50, 0x4b])) {
    return invalid(
      "file_signature_mismatch",
      `.${extension} files must use a valid ZIP-based document container.`,
    );
  }

  const metadata = inspectZipEntries(bytes);
  if (!metadata) {
    return invalid("invalid_office_container", "The document container is malformed or unsupported.");
  }
  if (metadata.some((entry) => entry.encrypted)) {
    return invalid(
      "encrypted_document_not_allowed",
      "Password-protected or encrypted documents are not supported.",
    );
  }
  if (metadata.some((entry) => hasUnsafeZipPath(entry.name))) {
    return invalid("unsafe_office_container", "The document contains an unsafe internal path.");
  }
  if (metadata.some((entry) => hasUnsafeEmbeddedFile(entry.name))) {
    return invalid(
      "unsafe_office_container",
      "The document contains an executable, archive, or macro-enabled attachment.",
    );
  }

  const totalUncompressed = metadata.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
  const suspiciousCompression = metadata.some(
    (entry) =>
      entry.uncompressedSize > ZIP_SINGLE_ENTRY_LIMIT ||
      (entry.uncompressedSize > 10 * 1024 * 1024 &&
        entry.uncompressedSize / Math.max(1, entry.compressedSize) > 1_000),
  );
  if (totalUncompressed > ZIP_UNCOMPRESSED_LIMIT || suspiciousCompression) {
    return invalid("unsafe_office_container", "The document container expands beyond safe limits.");
  }

  const lowerNames = new Map(metadata.map((entry) => [entry.name.toLowerCase(), entry.name]));
  if (
    lowerNames.has("word/vbaproject.bin") ||
    lowerNames.has("xl/vbaproject.bin") ||
    lowerNames.has("ppt/vbaproject.bin") ||
    [...lowerNames.keys()].some((name) => name.endsWith("/vbaproject.bin"))
  ) {
    return invalid("macro_document_not_allowed", "Macro-enabled documents are not supported.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes, { checkCRC32: false });
  } catch {
    return invalid("invalid_office_container", "The document container could not be read.");
  }

  if (spec.kind === "office-zip") {
    const contentTypesName = lowerNames.get("[content_types].xml");
    if (!contentTypesName || !spec.officeRoot || !lowerNames.has(spec.officeRoot)) {
      return invalid(
        "invalid_office_container",
        `The .${extension} file is missing required Office document parts.`,
      );
    }

    const contentTypesMetadata = metadata.find(
      (entry) => entry.name.toLowerCase() === "[content_types].xml",
    );
    if (!contentTypesMetadata || contentTypesMetadata.uncompressedSize > 2 * 1024 * 1024) {
      return invalid("unsafe_office_container", "The Office content manifest is too large.");
    }
    const contentTypes = await zip.file(contentTypesName)!.async("string");
    if (/macroenabled|vbaproject/i.test(contentTypes)) {
      return invalid("macro_document_not_allowed", "Macro-enabled documents are not supported.");
    }
  }

  if (spec.kind === "odf-zip") {
    const mimeEntryName = lowerNames.get("mimetype");
    if (!mimeEntryName || !lowerNames.has("content.xml")) {
      return invalid(
        "invalid_office_container",
        `The .${extension} file is missing required OpenDocument parts.`,
      );
    }
    const mimeEntry = metadata.find((entry) => entry.name.toLowerCase() === "mimetype");
    if (!mimeEntry || mimeEntry.uncompressedSize > 256) {
      return invalid("invalid_office_container", "The OpenDocument MIME manifest is invalid.");
    }
    const embeddedMime = (await zip.file(mimeEntryName)!.async("string")).trim();
    if (embeddedMime !== spec.odfMimeType) {
      return invalid(
        "file_signature_mismatch",
        `The OpenDocument container does not match the .${extension} extension.`,
      );
    }

    const manifestName = lowerNames.get("meta-inf/manifest.xml");
    const manifestMetadata = manifestName
      ? metadata.find((entry) => entry.name.toLowerCase() === "meta-inf/manifest.xml")
      : undefined;
    if (manifestName && manifestMetadata && manifestMetadata.uncompressedSize <= 2 * 1024 * 1024) {
      const manifest = await zip.file(manifestName)!.async("string");
      if (/encryption-data/i.test(manifest)) {
        return invalid(
          "encrypted_document_not_allowed",
          "Password-protected or encrypted documents are not supported.",
        );
      }
    }
  }

  return null;
}

export async function validateDocumentFile(input: {
  fileName: string;
  declaredMimeType?: string | null;
  bytes: Uint8Array;
}): Promise<DocumentFileValidationResult> {
  const { fileName, bytes } = input;
  if (!fileName.trim() || /[\u0000-\u001f\u007f]/.test(fileName)) {
    return invalid("file_name_invalid", "A valid file name is required.");
  }
  if (bytes.byteLength === 0) {
    return invalid("file_empty", "The selected file is empty.");
  }
  if (bytes.byteLength > DOCUMENT_MAX_BYTES) {
    return invalid("file_too_large", "Documents must be 25 MB or smaller.");
  }

  const extension = getDocumentFileExtension(fileName);
  if (!extension) {
    return invalid("file_name_invalid", "The file name must include an extension.");
  }
  if (MACRO_EXTENSIONS.has(extension)) {
    return invalid("macro_document_not_allowed", "Macro-enabled documents are not supported.");
  }
  if (ARCHIVE_EXTENSIONS.has(extension)) {
    return invalid("archive_not_allowed", "Archive files are not supported.");
  }
  if (EXECUTABLE_EXTENSIONS.has(extension)) {
    return invalid("executable_not_allowed", "Executable files are not supported.");
  }

  const spec = FORMAT_SPECS[extension];
  if (!spec) {
    return invalid(
      "unsupported_extension",
      `.${extension} files are not supported for document intake.`,
    );
  }

  const dangerousBinary = detectDangerousBinary(bytes);
  if (dangerousBinary === "executable") {
    return invalid("executable_not_allowed", "The file content appears to be executable.");
  }
  if (dangerousBinary === "archive") {
    return invalid("archive_not_allowed", "The file content appears to be an archive.");
  }
  if (dangerousBinary === "ole") {
    return invalid(
      "encrypted_document_not_allowed",
      "Legacy or encrypted Office documents must be converted to a supported, unencrypted format.",
    );
  }

  const declaredMimeType = (input.declaredMimeType ?? "")
    .split(";", 1)[0]!
    .trim()
    .toLowerCase();
  const warnings: string[] = [];
  if (GENERIC_MIME_TYPES.has(declaredMimeType)) {
    warnings.push("mime_type_inferred_from_content");
  } else if (!spec.declaredMimeTypes.includes(declaredMimeType)) {
    return invalid(
      "mime_type_mismatch",
      `The declared MIME type does not match the .${extension} extension.`,
    );
  }

  if (spec.kind === "pdf") {
    if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
      return invalid("file_signature_mismatch", "The file does not have a valid PDF signature.");
    }
    if (containsAscii(bytes, "/Encrypt")) {
      return invalid(
        "encrypted_document_not_allowed",
        "Password-protected or encrypted PDFs are not supported.",
      );
    }
  } else if (spec.kind === "image") {
    if (!hasImageSignature(extension, bytes)) {
      return invalid(
        "file_signature_mismatch",
        `The file content does not match the .${extension} image extension.`,
      );
    }
  } else if (spec.kind === "text") {
    if (!looksLikeUtfText(bytes)) {
      return invalid(
        "file_signature_mismatch",
        "The file is not readable UTF-8 or UTF-16 text.",
      );
    }
  } else if (spec.kind === "rtf") {
    const prefix = ascii(bytes, 0, Math.min(bytes.length, 32)).replace(/^\uFEFF?\s*/, "");
    if (!prefix.startsWith("{\\rtf")) {
      return invalid("file_signature_mismatch", "The file does not have a valid RTF signature.");
    }
  } else {
    const containerError = await validateZipContainer(bytes, extension, spec);
    if (containerError) return containerError;
  }

  return {
    ok: true,
    extension,
    mimeType: spec.canonicalMimeType,
    aiReady: spec.aiReady,
    warnings,
  };
}
