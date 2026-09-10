import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ capture: {} as Record<string, unknown>, failConfirmation: false, updates: [] as Record<string, unknown>[] }));
const mutations = vi.hoisted(() => ({ text: vi.fn(), url: vi.fn(), file: vi.fn() }));
vi.mock("@/lib/knowledge/mutations", () => ({ addKnowledgeFromText: mutations.text, addKnowledgeFromUrl: mutations.url, finalizeKnowledgeFileUpload: mutations.file }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({
  from: () => {
    let pending: Record<string, unknown> | undefined;
    const chain = {
      select: () => chain, eq: () => chain,
      maybeSingle: async () => ({ data: { ...state.capture }, error: null }),
      update: (value: Record<string, unknown>) => { pending = value; return chain; },
      then: (resolve: (value: unknown) => void) => {
        if (pending?.status === "saved" && state.failConfirmation) {
          state.failConfirmation = false;
          resolve({ error: new Error("Confirmation failed after record saved") });
        } else {
          if (pending) { state.updates.push(pending); Object.assign(state.capture, pending); }
          resolve({ error: null });
        }
      },
    };
    return chain;
  },
}) }));
import { saveQuickSaveCaptureToKnowledge } from "./server";

const captureId = "11111111-1111-4111-8111-111111111111";
const input = { captureId, userId: "owner", language: "en" };
beforeEach(() => {
  vi.clearAllMocks();
  state.capture = { id: captureId, user_id: "owner", title: "Original", text: "My saved text", normalized_url: null, file_refs: [], status: "pending" };
  state.updates = []; state.failConfirmation = false;
  mutations.text.mockImplementation(async (_title, _text, options) => ({ id: options.operationId }));
  mutations.url.mockImplementation(async (_url, options) => ({ id: options.operationId }));
  mutations.file.mockImplementation(async (options) => ({ id: options.operationId }));
});
describe("Quick Save recovery and consent", () => {
  it("retries with the same destination ID after confirmation failure and saves text without AI", async () => {
    state.failConfirmation = true;
    await expect(saveQuickSaveCaptureToKnowledge(input)).rejects.toThrow("Confirmation failed");
    expect(state.capture.status).toBe("failed");
    await expect(saveQuickSaveCaptureToKnowledge(input)).resolves.toEqual({ itemId: captureId });
    expect(mutations.text.mock.calls.map(call => call[2])).toEqual([
      expect.objectContaining({ operationId: captureId, analyze: false }),
      expect.objectContaining({ operationId: captureId, analyze: false }),
    ]);
    expect(state.capture.status).toBe("saved");
  });
  it("requires explicit current consent before dispatching a shared link", async () => {
    state.capture.normalized_url = "https://example.invalid/article";
    await expect(saveQuickSaveCaptureToKnowledge(input)).rejects.toThrow("QUICK_SAVE_AI_CONSENT_REQUIRED");
    expect(mutations.url).not.toHaveBeenCalled();
    await saveQuickSaveCaptureToKnowledge({ ...input, allowAi: true });
    expect(mutations.url).toHaveBeenCalledWith("https://example.invalid/article", expect.objectContaining({ operationId: captureId }));
  });
  it("gives each file a distinct repeatable destination ID across retries", async () => {
    state.capture.file_refs = ["a.pdf", "b.pdf"].map(name => ({ name, storage_path: `owner/${name}`, mime_type: "application/pdf", size: 10 }));
    state.failConfirmation = true;
    await expect(saveQuickSaveCaptureToKnowledge({ ...input, allowAi: true })).rejects.toThrow();
    await saveQuickSaveCaptureToKnowledge({ ...input, allowAi: true });
    const ids = mutations.file.mock.calls.map(call => call[0].operationId);
    expect(ids.slice(0, 2)).toEqual(ids.slice(2));
    expect(new Set(ids).size).toBe(2);
  });
});
