import { beforeEach, describe, it, expect, vi } from "vitest";
const f = vi.hoisted(() => ({
  user: { id: "00000000-0000-4000-8000-000000000071" } as { id: string } | null,
  pet: null as null | Record<string, unknown>,
  updates: [] as Record<string, unknown>[],
  reserved: true,
  start: vi.fn(),
  read: vi.fn(),
  upload: vi.fn(),
  sign: vi.fn(),
  model: vi.fn(),
  reference: vi.fn(),
}));
vi.mock("server-only", () => ({}));
function client() {
  return {
    auth: { getUser: async () => ({ data: { user: f.user } }) },
    rpc: async () => ({ data: f.reserved, error: null }),
    storage: { from: () => ({ upload: f.upload, createSignedUrl: f.sign }) },
    from: () => {
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        eq: () => q,
      neq: () => q,
        order: () => q,
        update: (p: Record<string, unknown>) => {
          patch = p;
          return q;
        },
        maybeSingle: async () => ({ data: f.pet }),
        then: (resolve: (x: unknown) => unknown) => {
          if (patch) {
            f.updates.push(patch);
            return Promise.resolve(resolve({ error: null }));
          }
          return Promise.resolve(
            resolve({ data: f.pet ? [f.pet] : [], error: null }),
          );
        },
      };
      return q;
    },
  };
}
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => client(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleSupabaseClient: () => client(),
}));
vi.mock("./pet-provider", () => ({
  gardenPetGenerationAvailable: () => true,
  startPetModel: f.start,
  readPetModel: f.read,
  uploadPetReference: f.reference,
  downloadPetModel: f.model,
}));
import { GET, POST } from "@/app/api/garden/pets/route";
import sharp from "sharp";
const id = "10000000-0000-4000-8000-000000000001",
  userId = "00000000-0000-4000-8000-000000000071";
function request(body?: BodyInit, account = userId) {
  return new Request("http://localhost/api/garden/pets", {
    method: body ? "POST" : "GET",
    headers: {
      "x-garden-account": account,
      ...(typeof body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body,
  });
}
async function form() {
  const data = new FormData();
  data.set("id", id);
  data.set("name", "My pet");
  data.set("consent", "yes");
  const photo = await sharp({
    create: { width: 16, height: 16, channels: 3, background: "#aaa" },
  })
    .png()
    .toBuffer();
  data.set(
    "photo",
    new File([new Uint8Array(photo)], "pet.png", { type: "image/png" }),
  );
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  f.user = { id: userId };
  f.pet = null;
  f.updates = [];
  f.reserved = true;
  f.upload.mockResolvedValue({ error: null });
  f.reference.mockResolvedValue("photo-token");
  f.start.mockResolvedValue("task-1");
  f.sign.mockResolvedValue({
    data: { signedUrl: "http://localhost/private-test-model" },
  });
});
describe("personal pet route contracts with provider and storage fixtures", () => {
  it("requires authentication and rejects an account switch", async () => {
    f.user = null;
    expect((await GET(request())).status).toBe(401);
    f.user = { id: userId };
    expect(
      (await POST(request(JSON.stringify({ id }), "different"))).status,
    ).toBe(409);
    expect(f.start).not.toHaveBeenCalled();
  });
  it("saves a task id and never resubmits a repeated request", async () => {
    expect((await POST(request(await form()))).status).toBe(201);
    expect(f.start).toHaveBeenCalledTimes(1);
    expect(f.updates.at(-1)).toMatchObject({
      status: "generating",
      task_id: "task-1",
    });
    f.reserved = false;
    await POST(request(await form()));
    expect(f.start).toHaveBeenCalledTimes(1);
  });
  it("does not retry an ambiguous paid submission", async () => {
    f.start.mockRejectedValue(new Error("connection lost"));
    expect((await POST(request(await form()))).status).toBe(202);
    expect(f.updates.at(-1)).toMatchObject({ status: "needs_review" });
  });
  it("keeps provider failure distinct from ready", async () => {
    f.pet = { id, status: "generating", task_id: "task-1" };
    f.read.mockResolvedValue({ status: "failed", progress: 12 });
    expect((await POST(request(JSON.stringify({ id })))).status).toBe(200);
    expect(f.updates.at(-1)).toMatchObject({ status: "failed" });
    expect(f.model).not.toHaveBeenCalled();
  });
  it("never marks an invalid finished model ready", async () => {
    f.pet = { id, status: "generating", task_id: "task-1" };
    f.read.mockResolvedValue({
      status: "success",
      url: "https://example.invalid/model",
    });
    f.model.mockResolvedValue(new Uint8Array(40));
    expect((await POST(request(JSON.stringify({ id })))).status).toBe(202);
    expect(f.updates.at(-1)).toMatchObject({ status: "failed" });
    expect(f.updates.some((p) => p.status === "ready")).toBe(false);
  });
});
