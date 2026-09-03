import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  cleanupStaleDocumentUploadsGlobally: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/documents/document-upload-reservations", () => ({
  cleanupStaleDocumentUploadsGlobally:
    mocks.cleanupStaleDocumentUploadsGlobally,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleSupabaseClient: mocks.createServiceRoleSupabaseClient,
}));

import { GET } from "@/app/api/cron/document-upload-cleanup/route";

const ADMIN_CLIENT = { kind: "service-role-client" };

function cronRequest(authorization?: string) {
  return new NextRequest(
    "https://app.test/api/cron/document-upload-cleanup",
    authorization ? { headers: { authorization } } : undefined,
  );
}

describe("GET /api/cron/document-upload-cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServiceRoleSupabaseClient.mockReturnValue(ADMIN_CLIENT);
    mocks.cleanupStaleDocumentUploadsGlobally.mockResolvedValue({
      scanned: 4,
      deleted: 2,
      skipped: 2,
      failed: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    {
      label: "missing CRON_SECRET",
      secret: "",
      authorization: "Bearer any-value",
    },
    {
      label: "wrong bearer token",
      secret: "correct-secret",
      authorization: "Bearer wrong-secret",
    },
  ])(
    "returns 401 for $label without creating an admin client",
    async ({ secret, authorization }) => {
      vi.stubEnv("CRON_SECRET", secret);

      const response = await GET(cronRequest(authorization));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(mocks.createServiceRoleSupabaseClient).not.toHaveBeenCalled();
      expect(mocks.cleanupStaleDocumentUploadsGlobally).not.toHaveBeenCalled();
    },
  );

  it("runs global cleanup with the admin client for a valid bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");

    const response = await GET(cronRequest("Bearer correct-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      scanned: 4,
      deleted: 2,
      skipped: 2,
      failed: 0,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.createServiceRoleSupabaseClient).toHaveBeenCalledTimes(1);
    expect(mocks.cleanupStaleDocumentUploadsGlobally).toHaveBeenCalledWith({
      supabase: ADMIN_CLIENT,
      olderThanIso: expect.any(String),
    });
  });

  it("returns a sanitized 500 response when cleanup reports an error", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    mocks.cleanupStaleDocumentUploadsGlobally.mockResolvedValue({
      scanned: 0,
      deleted: 0,
      skipped: 0,
      failed: 1,
      error: "sensitive database connection details",
    });

    const response = await GET(cronRequest("Bearer correct-secret"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "document_upload_cleanup_failed",
      failed: 1,
    });
    expect(JSON.stringify(body)).not.toContain("sensitive database");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
