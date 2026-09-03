import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { DOCUMENT_FILES_BUCKET } from "@/lib/documents/document-intake";
import { createDocumentSignedUploadUrl } from "@/lib/documents/document-storage";

const STORAGE_PATH =
  "20000000-0000-4000-8000-000000000002/f47ac10b-58cc-4372-a567-0e02b2c3d479/Apartment lease.pdf";

describe("document signed upload URL", () => {
  it("returns the complete provider URL without reducing it to a token", async () => {
    const signedUrl =
      "https://storage.test/object/upload/sign/document?token=signed-token&x=1";
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: { signedUrl },
      error: null,
    });
    const from = vi.fn(() => ({ createSignedUploadUrl }));
    const supabase = { storage: { from } } as unknown as SupabaseClient;

    const result = await createDocumentSignedUploadUrl({
      supabase,
      storagePath: STORAGE_PATH,
    });

    expect(result).toEqual({ url: signedUrl });
    expect(from).toHaveBeenCalledWith(DOCUMENT_FILES_BUCKET);
    expect(createSignedUploadUrl).toHaveBeenCalledWith(STORAGE_PATH, {
      upsert: false,
    });
  });

  it("does not expose a URL when the storage provider fails", async () => {
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "storage unavailable" },
    });
    const supabase = {
      storage: { from: vi.fn(() => ({ createSignedUploadUrl })) },
    } as unknown as SupabaseClient;

    await expect(
      createDocumentSignedUploadUrl({ supabase, storagePath: STORAGE_PATH }),
    ).resolves.toEqual({ error: "storage unavailable" });
  });
});
