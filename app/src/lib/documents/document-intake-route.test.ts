import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeLifeAgentUpload: vi.fn(),
  cancelDocumentUploadReservation: vi.fn(),
  claimDocumentUploadReservation: vi.fn(),
  cleanupStaleDocumentUploads: vi.fn(),
  createDocumentSignedUploadUrl: vi.fn(),
  createDocumentSignedUrl: vi.fn(),
  deleteDocumentFileServer: vi.fn(),
  downloadDocumentFileServer: vi.fn(),
  markDocumentUploadReady: vi.fn(),
  removeDocumentUploadReservation: vi.fn(),
  requireLifeAgentUser: vi.fn(),
  reserveDocumentUpload: vi.fn(),
}));

vi.mock("@/lib/life-agent/actions-api-shared", () => ({
  requireLifeAgentUser: mocks.requireLifeAgentUser,
}));

vi.mock("@/lib/life-agent/upload-analyzer", () => ({
  analyzeLifeAgentUpload: mocks.analyzeLifeAgentUpload,
}));

vi.mock("@/lib/documents/document-storage", () => ({
  createDocumentSignedUploadUrl: mocks.createDocumentSignedUploadUrl,
  createDocumentSignedUrl: mocks.createDocumentSignedUrl,
  deleteDocumentFileServer: mocks.deleteDocumentFileServer,
  downloadDocumentFileServer: mocks.downloadDocumentFileServer,
}));

vi.mock("@/lib/documents/document-upload-reservations", () => ({
  cancelDocumentUploadReservation: mocks.cancelDocumentUploadReservation,
  claimDocumentUploadReservation: mocks.claimDocumentUploadReservation,
  cleanupStaleDocumentUploads: mocks.cleanupStaleDocumentUploads,
  markDocumentUploadReady: mocks.markDocumentUploadReady,
  removeDocumentUploadReservation: mocks.removeDocumentUploadReservation,
  reserveDocumentUpload: mocks.reserveDocumentUpload,
}));

import { DELETE, GET, PATCH, POST, PUT } from "@/app/api/documents/intake/route";

const USER_ID = "20000000-0000-4000-8000-000000000002";
const UPLOAD_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const DOCUMENT_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const STORAGE_PATH = `${USER_ID}/${UPLOAD_ID}/Apartment lease.pdf`;
const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
const PDF_BYTES = new TextEncoder().encode(
  "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF",
);

function reservation(
  status: "pending" | "uploading" | "uploaded" | "cancelled",
) {
  return {
    id: UPLOAD_ID,
    user_id: USER_ID,
    storage_path: STORAGE_PATH,
    status,
    created_at: "2026-09-03T00:00:00.000Z",
  };
}

function jsonRequest(
  method: "PUT" | "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
  signal?: AbortSignal,
) {
  return new Request("https://app.test/api/documents/intake", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

function useDocumentLookup(result: {
  data: { id: string; storage_path: string | null } | null;
  error: { message: string } | null;
}, deleteError: { message: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const userEq = vi.fn().mockReturnValue({ maybeSingle });
  const idEq = vi.fn().mockReturnValue({ eq: userEq });
  const select = vi.fn().mockReturnValue({ eq: idEq });
  const deleteUserEq = vi.fn().mockResolvedValue({ error: deleteError });
  const deleteIdEq = vi.fn().mockReturnValue({ eq: deleteUserEq });
  const deleteRecord = vi.fn().mockReturnValue({ eq: deleteIdEq });
  const from = vi.fn().mockReturnValue({ select, delete: deleteRecord });
  const supabase = { from };

  mocks.requireLifeAgentUser.mockResolvedValue({
    ok: true,
    supabase,
    userId: USER_ID,
  });

  return {
    from,
    select,
    idEq,
    userEq,
    maybeSingle,
    deleteRecord,
    deleteIdEq,
    deleteUserEq,
    supabase,
  };
}

describe("document intake route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireLifeAgentUser.mockResolvedValue({
      ok: true,
      supabase: {},
      userId: USER_ID,
    });
    mocks.cleanupStaleDocumentUploads.mockResolvedValue(undefined);
    mocks.reserveDocumentUpload.mockResolvedValue({
      reservation: reservation("pending"),
    });
    mocks.createDocumentSignedUploadUrl.mockResolvedValue({
      url: "https://storage.test/object/upload/sign/document?token=signed-token",
    });
    mocks.claimDocumentUploadReservation.mockResolvedValue({
      reservation: reservation("uploading"),
    });
    mocks.downloadDocumentFileServer.mockResolvedValue({
      bytes: PDF_BYTES,
      mimeType: "application/pdf",
    });
    mocks.markDocumentUploadReady.mockResolvedValue({
      reservation: reservation("uploaded"),
    });
    mocks.createDocumentSignedUrl.mockResolvedValue({
      url: "https://storage.test/signed-document",
    });
    mocks.cancelDocumentUploadReservation.mockResolvedValue({
      reservation: reservation("cancelled"),
    });
    mocks.deleteDocumentFileServer.mockResolvedValue({});
    mocks.removeDocumentUploadReservation.mockResolvedValue({});
    mocks.analyzeLifeAgentUpload.mockResolvedValue({
      detectedType: "document",
      summary: "A lease agreement",
      confidence: 0.9,
      warnings: [],
      suggestedActions: [],
    });
  });

  it("reserves a private path and returns the complete signed upload URL", async () => {
    const response = await PUT(
      jsonRequest("PUT", {
        uploadId: UPLOAD_ID,
        fileName: "Apartment lease.pdf",
        fileSize: PDF_BYTES.byteLength,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      uploadId: UPLOAD_ID,
      storagePath: STORAGE_PATH,
      uploadUrl:
        "https://storage.test/object/upload/sign/document?token=signed-token",
    });
    expect(body).not.toHaveProperty("uploadToken");
    expect(mocks.reserveDocumentUpload).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
      fileName: "Apartment lease.pdf",
    });
    expect(mocks.createDocumentSignedUploadUrl).toHaveBeenCalledWith({
      supabase: {},
      storagePath: STORAGE_PATH,
    });
  });

  it("rejects an invalid reservation request before issuing an upload URL", async () => {
    const response = await PUT(
      jsonRequest("PUT", {
        uploadId: "../../another-user",
        fileName: "Policy.pdf",
        fileSize: PDF_BYTES.byteLength,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_upload_reservation",
    });
    expect(mocks.reserveDocumentUpload).not.toHaveBeenCalled();
    expect(mocks.createDocumentSignedUploadUrl).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "empty",
      fileName: "Policy.pdf",
      fileSize: 0,
      status: 400,
      error: "file_empty",
    },
    {
      label: "oversized",
      fileName: "Policy.pdf",
      fileSize: DOCUMENT_MAX_BYTES + 1,
      status: 413,
      error: "file_too_large",
    },
    {
      label: "unsupported",
      fileName: "malware.exe",
      fileSize: 1024,
      status: 415,
      error: "unsupported_extension",
    },
  ])(
    "rejects an $label file before reserving storage",
    async ({ fileName, fileSize, status, error }) => {
      const response = await PUT(
        jsonRequest("PUT", { uploadId: UPLOAD_ID, fileName, fileSize }),
      );

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
      expect(mocks.reserveDocumentUpload).not.toHaveBeenCalled();
      expect(mocks.createDocumentSignedUploadUrl).not.toHaveBeenCalled();
    },
  );

  it("removes an unused reservation if upload URL creation fails", async () => {
    mocks.createDocumentSignedUploadUrl.mockResolvedValue({
      error: "storage unavailable",
    });

    const response = await PUT(
      jsonRequest("PUT", {
        uploadId: UPLOAD_ID,
        fileName: "Apartment lease.pdf",
        fileSize: PDF_BYTES.byteLength,
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: "signed_upload_url_failed",
    });
    expect(mocks.removeDocumentUploadReservation).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
  });

  it("claims, downloads, validates, and marks a direct upload ready", async () => {
    const response = await POST(jsonRequest("POST", { uploadId: UPLOAD_ID }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      uploadId: UPLOAD_ID,
      storageBucket: "document-files",
      storagePath: STORAGE_PATH,
      fileName: "Apartment lease.pdf",
      mimeType: "application/pdf",
      fileSize: PDF_BYTES.byteLength,
      previewUrl: "https://storage.test/signed-document",
      aiStatus: "not_requested",
      warnings: [],
    });
    expect(mocks.claimDocumentUploadReservation).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
    expect(mocks.downloadDocumentFileServer).toHaveBeenCalledWith({
      supabase: {},
      storagePath: STORAGE_PATH,
    });
    expect(mocks.markDocumentUploadReady).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
    expect(mocks.analyzeLifeAgentUpload).not.toHaveBeenCalled();
    expect(mocks.cancelDocumentUploadReservation).not.toHaveBeenCalled();
  });

  it("does not finalize an upload without an owned pending reservation", async () => {
    mocks.claimDocumentUploadReservation.mockResolvedValue({});

    const response = await POST(jsonRequest("POST", { uploadId: UPLOAD_ID }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "upload_reservation_unavailable",
    });
    expect(mocks.downloadDocumentFileServer).not.toHaveBeenCalled();
    expect(mocks.markDocumentUploadReady).not.toHaveBeenCalled();
  });

  it("cancels and deletes an unsafe direct upload without erasing its tombstone", async () => {
    mocks.downloadDocumentFileServer.mockResolvedValue({
      bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
      mimeType: "application/pdf",
    });

    const response = await POST(jsonRequest("POST", { uploadId: UPLOAD_ID }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "executable_not_allowed",
    });
    expect(mocks.cancelDocumentUploadReservation).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
    expect(mocks.deleteDocumentFileServer).toHaveBeenCalledWith({
      supabase: {},
      storagePath: STORAGE_PATH,
    });
    expect(mocks.removeDocumentUploadReservation).not.toHaveBeenCalled();
    expect(mocks.markDocumentUploadReady).not.toHaveBeenCalled();
  });

  it("cancels and deletes an aborted finalization without erasing its tombstone", async () => {
    const controller = new AbortController();
    controller.abort();

    const response = await POST(
      jsonRequest("POST", { uploadId: UPLOAD_ID }, controller.signal),
    );

    expect(response.status).toBe(499);
    expect(await response.json()).toEqual({ error: "request_aborted" });
    expect(mocks.cancelDocumentUploadReservation).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
    expect(mocks.deleteDocumentFileServer).toHaveBeenCalledWith({
      supabase: {},
      storagePath: STORAGE_PATH,
    });
    expect(mocks.removeDocumentUploadReservation).not.toHaveBeenCalled();
    expect(mocks.markDocumentUploadReady).not.toHaveBeenCalled();
  });

  it("cleans the exact object when cancellation wins the ready-state race", async () => {
    mocks.markDocumentUploadReady.mockResolvedValue({});

    const response = await POST(jsonRequest("POST", { uploadId: UPLOAD_ID }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "upload_cancelled" });
    expect(mocks.cancelDocumentUploadReservation).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
    expect(mocks.deleteDocumentFileServer).toHaveBeenCalledWith({
      supabase: {},
      storagePath: STORAGE_PATH,
    });
    expect(mocks.removeDocumentUploadReservation).not.toHaveBeenCalled();
  });

  it("does not delete the object when a commit wins before discard", async () => {
    mocks.markDocumentUploadReady.mockResolvedValue({});
    mocks.cancelDocumentUploadReservation.mockResolvedValue({});

    const response = await POST(jsonRequest("POST", { uploadId: UPLOAD_ID }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "upload_cancelled" });
    expect(mocks.cancelDocumentUploadReservation).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
    expect(mocks.deleteDocumentFileServer).not.toHaveBeenCalled();
    expect(mocks.removeDocumentUploadReservation).not.toHaveBeenCalled();
  });

  it("preserves a ready upload when optional AI analysis throws", async () => {
    mocks.analyzeLifeAgentUpload.mockRejectedValue(
      new Error("provider unavailable"),
    );

    const response = await PATCH(
      jsonRequest("PATCH", {
        storagePath: STORAGE_PATH,
        locale: "zh-Hant-HK",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.aiStatus).toBe("failed");
    expect(body.warnings).toContain("ai_analysis_failed_upload_preserved");
    expect(mocks.analyzeLifeAgentUpload).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "zh-Hant-HK" }),
    );
    expect(mocks.deleteDocumentFileServer).not.toHaveBeenCalled();
    expect(mocks.cancelDocumentUploadReservation).not.toHaveBeenCalled();
  });

  it("does not label the analyzer extraction fallback as complete", async () => {
    mocks.analyzeLifeAgentUpload.mockResolvedValue({
      detectedType: "unknown",
      summary:
        "Could not read this file automatically (provider failed). You can still choose what to do with it.",
      confidence: 0.2,
      warnings: ["provider failed"],
      suggestedActions: [],
    });

    const response = await PATCH(
      jsonRequest("PATCH", { storagePath: STORAGE_PATH }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      aiStatus: "failed",
      warnings: ["ai_analysis_failed_upload_preserved"],
    });
  });

  it("only analyzes and signs paths owned by the authenticated user", async () => {
    const foreignPath = `another-user/${UPLOAD_ID}/Policy.pdf`;

    const analyzeResponse = await PATCH(
      jsonRequest("PATCH", { storagePath: foreignPath }),
    );
    const signResponse = await GET(
      new Request(
        `https://app.test/api/documents/intake?storagePath=${encodeURIComponent(foreignPath)}`,
      ),
    );

    expect(analyzeResponse.status).toBe(403);
    expect(signResponse.status).toBe(403);
    expect(mocks.downloadDocumentFileServer).not.toHaveBeenCalled();
    expect(mocks.createDocumentSignedUrl).not.toHaveBeenCalled();
  });

  it("signs an owned ready document path", async () => {
    const response = await GET(
      new Request(
        `https://app.test/api/documents/intake?storagePath=${encodeURIComponent(STORAGE_PATH)}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://storage.test/signed-document",
    });
    expect(mocks.createDocumentSignedUrl).toHaveBeenCalledWith({
      supabase: {},
      storagePath: STORAGE_PATH,
    });
  });

  it("cancels an upload and deletes only its reserved object while keeping the tombstone", async () => {
    const response = await DELETE(
      jsonRequest("DELETE", { uploadId: UPLOAD_ID }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true, uploadId: UPLOAD_ID });
    expect(mocks.cancelDocumentUploadReservation).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
    expect(mocks.deleteDocumentFileServer).toHaveBeenCalledTimes(1);
    expect(mocks.deleteDocumentFileServer).toHaveBeenCalledWith({
      supabase: {},
      storagePath: STORAGE_PATH,
    });
    expect(mocks.removeDocumentUploadReservation).not.toHaveBeenCalled();
  });

  it("does not delete a temporary object after its reservation was committed", async () => {
    mocks.cancelDocumentUploadReservation.mockResolvedValue({});

    const response = await DELETE(
      jsonRequest("DELETE", { uploadId: UPLOAD_ID }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true, uploadId: UPLOAD_ID });
    expect(mocks.cancelDocumentUploadReservation).toHaveBeenCalledWith({
      supabase: {},
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });
    expect(mocks.deleteDocumentFileServer).not.toHaveBeenCalled();
    expect(mocks.removeDocumentUploadReservation).not.toHaveBeenCalled();
  });

  it("rejects raw storage paths as deletion authority", async () => {
    const response = await DELETE(
      jsonRequest("DELETE", { storagePath: STORAGE_PATH }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid_storage_target" });
    expect(mocks.cancelDocumentUploadReservation).not.toHaveBeenCalled();
    expect(mocks.deleteDocumentFileServer).not.toHaveBeenCalled();
  });

  it("deletes the private file resolved from an owned document id", async () => {
    const lookup = useDocumentLookup({
      data: { id: DOCUMENT_ID, storage_path: STORAGE_PATH },
      error: null,
    });

    const response = await DELETE(
      jsonRequest("DELETE", { documentId: DOCUMENT_ID }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      deleted: true,
      documentId: DOCUMENT_ID,
    });
    expect(lookup.from).toHaveBeenCalledWith("documents");
    expect(lookup.select).toHaveBeenCalledWith("id,storage_path");
    expect(lookup.idEq).toHaveBeenCalledWith("id", DOCUMENT_ID);
    expect(lookup.userEq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(mocks.deleteDocumentFileServer).toHaveBeenCalledWith({
      supabase: lookup.supabase,
      storagePath: STORAGE_PATH,
    });
    expect(lookup.deleteRecord).toHaveBeenCalledTimes(1);
    expect(lookup.deleteIdEq).toHaveBeenCalledWith("id", DOCUMENT_ID);
    expect(lookup.deleteUserEq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(mocks.cancelDocumentUploadReservation).not.toHaveBeenCalled();
  });

  it("treats an unowned, missing, or already-deleted document idempotently", async () => {
    const lookup = useDocumentLookup({
      data: null,
      error: null,
    });

    const response = await DELETE(
      jsonRequest("DELETE", { documentId: DOCUMENT_ID }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      deleted: true,
      documentId: DOCUMENT_ID,
    });
    expect(mocks.cancelDocumentUploadReservation).not.toHaveBeenCalled();
    expect(mocks.deleteDocumentFileServer).not.toHaveBeenCalled();
    expect(lookup.deleteRecord).not.toHaveBeenCalled();
  });

  it("keeps the document row when private storage deletion fails", async () => {
    const lookup = useDocumentLookup({
      data: { id: DOCUMENT_ID, storage_path: STORAGE_PATH },
      error: null,
    });
    mocks.deleteDocumentFileServer.mockResolvedValue({ error: "storage down" });

    const response = await DELETE(
      jsonRequest("DELETE", { documentId: DOCUMENT_ID }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: "delete_failed" });
    expect(lookup.deleteRecord).not.toHaveBeenCalled();
  });
});
