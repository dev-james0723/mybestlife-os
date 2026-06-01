import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class QuoteThumbnailImageError extends Error {
    status: number;

    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  }

  return {
    assertBucketAiQuota: vi.fn(),
    bucketAiError: vi.fn(),
    generateQuoteThumbnailImage: vi.fn(),
    getGeminiServerApiKey: vi.fn(),
    QuoteThumbnailImageError,
    recordBucketAiUsage: vi.fn(),
    requireBucketAiContext: vi.fn(),
  };
});

vi.mock("@/lib/ai/bucket-list/bucket-ai", () => ({
  assertBucketAiQuota: mocks.assertBucketAiQuota,
  bucketAiError: mocks.bucketAiError,
  recordBucketAiUsage: mocks.recordBucketAiUsage,
  requireBucketAiContext: mocks.requireBucketAiContext,
}));

vi.mock("@/lib/ai/gemini-text", () => ({
  getGeminiServerApiKey: mocks.getGeminiServerApiKey,
}));

vi.mock("@/lib/quote-library/thumbnail/image", () => ({
  generateQuoteThumbnailImage: mocks.generateQuoteThumbnailImage,
  mimeToExt: () => "png",
  QuoteThumbnailImageError: mocks.QuoteThumbnailImageError,
}));

vi.mock("@/lib/repositories/bucket-list", () => ({
  BUCKET_DREAM_IMAGE_BUCKET: "bucket-dream-images",
}));

import { POST } from "./route";

type SupabaseCalls = {
  inserts: Array<{ table: string; payload: Record<string, unknown> }>;
  updates: Array<{ table: string; payload: Record<string, unknown> }>;
  uploads: Array<{ bucket: string; path: string; contentType: string }>;
};

function createSupabaseMock() {
  const calls: SupabaseCalls = {
    inserts: [],
    updates: [],
    uploads: [],
  };

  const queryFor = (table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: { id: "dream-1" }, error: null })),
      update: vi.fn((payload: Record<string, unknown>) => {
        calls.updates.push({ table, payload });
        return query;
      }),
      insert: vi.fn(async (payload: Record<string, unknown>) => {
        calls.inserts.push({ table, payload });
        return { error: null };
      }),
    };
    return query;
  };

  const supabase = {
    from: vi.fn((table: string) => queryFor(table)),
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn(
          async (
            path: string,
            _bytes: Uint8Array,
            options: { contentType: string },
          ) => {
            calls.uploads.push({ bucket, path, contentType: options.contentType });
            return { error: null };
          },
        ),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://storage.test/${path}` },
        })),
      })),
    },
  };

  return { calls, supabase };
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("POST /api/bucket-list/generate-cover-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertBucketAiQuota.mockResolvedValue({ ok: true, remaining: 29 });
    mocks.bucketAiError.mockImplementation((error: unknown) =>
      Response.json(
        {
          error: "ai_generation_failed",
          detail: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      ),
    );
    mocks.generateQuoteThumbnailImage.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
      modelUsed: "gemini-test-image",
    });
    mocks.getGeminiServerApiKey.mockReturnValue("test-gemini-key");
    mocks.recordBucketAiUsage.mockResolvedValue(undefined);
  });

  it("saves generated visuals to the gallery for review by default", async () => {
    const { calls, supabase } = createSupabaseMock();
    mocks.requireBucketAiContext.mockResolvedValue({
      ok: true,
      ctx: { supabase, userId: "user-1", language: "en" },
      bodyJson: {
        bucketItemId: "dream-1",
        title: "See the Northern Lights in Iceland",
        type: "travel",
      },
    });

    const response = await POST(new Request("https://app.test/api"));
    const json = await responseJson(response);

    expect(response.status).toBe(200);
    expect(json.imageUrl).toMatch(/^https:\/\/storage\.test\/user-1\/dream-1\//);
    expect(calls.inserts).toHaveLength(1);
    expect(calls.inserts[0]).toMatchObject({
      table: "bucket_dream_images",
      payload: {
        bucket_item_id: "dream-1",
        image_type: "generated_visual",
        source_type: "generated",
        is_primary: false,
      },
    });
    expect(calls.updates).toEqual([]);
    expect(mocks.recordBucketAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      "inspire",
    );
  });

  it("only applies a generated visual as cover when explicitly requested", async () => {
    const { calls, supabase } = createSupabaseMock();
    mocks.requireBucketAiContext.mockResolvedValue({
      ok: true,
      ctx: { supabase, userId: "user-1", language: "en" },
      bodyJson: {
        bucketItemId: "dream-1",
        title: "See the Northern Lights in Iceland",
        type: "travel",
        setAsCover: true,
      },
    });

    const response = await POST(new Request("https://app.test/api"));
    const json = await responseJson(response);

    expect(response.status).toBe(200);
    expect(calls.inserts[0].payload.is_primary).toBe(true);
    expect(calls.updates).toEqual(
      expect.arrayContaining([
        {
          table: "bucket_dream_images",
          payload: { is_primary: false },
        },
        {
          table: "bucket_items",
          payload: {
            cover_image_url: json.imageUrl,
            cover_image_is_ai: true,
          },
        },
      ]),
    );
  });
});
