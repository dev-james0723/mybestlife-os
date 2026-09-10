import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProfileNeuralSkillFallback } from "../_shared-intelligence";

const ai = vi.hoisted(() => ({ key: vi.fn(), research: vi.fn(), synthesize: vi.fn() }));
vi.mock("@/lib/ai/gemini-text", () => ({
  getGeminiServerApiKey: ai.key,
  getGeminiHabitsProModel: () => "test-pro",
  getGeminiHabitsFlashModel: () => "test-flash",
  fetchGeminiGroundedText: ai.research,
  fetchGeminiStructured: ai.synthesize,
}));
vi.mock("@/app/api/ai/habits/_shared", () => ({
  requireAuthedContext: async (request: Request) => ({ ok: true, ctx: { language: "en" }, bodyJson: await request.json() }),
  errorResponse: () => new Response("{}", { status: 500 }),
}));
import { POST } from "./route";

const context = { roleModel: { id: "test-rm", name: "Test Public Person" } };
function request(requireResearch: boolean) {
  return new Request("http://localhost/api/ai/role-model/distill-skill", {
    method: "POST", body: JSON.stringify({ roleModelId: "test-rm", context, requireResearch }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  ai.key.mockReturnValue("test-key");
  ai.research.mockResolvedValue({ text: "Fixture source notes: direct interviews, decisions, expression DNA, criticism, and timeline.", modelUsed: "test-research" });
  ai.synthesize.mockResolvedValue({ data: buildProfileNeuralSkillFallback(context), modelUsed: "test-synthesis" });
});

describe("Nuwa research-to-skill package", () => {
  it("loads the actual Nuwa guide and returns a complete persistable package", async () => {
    const response = await POST(request(true));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(ai.research.mock.calls[0][0].systemInstruction).toContain("6个Agent的任务分配");
    expect(ai.synthesize.mock.calls[0][0].systemInstruction).toContain("心智模型识别的三重验证");
    expect(ai.synthesize.mock.calls[0][0].systemInstruction).toContain("用「我」而非");
    expect(json.result.skillMarkdown).toContain(json.result.decisionPrinciples[0]);
    expect(json.result.skillMarkdown).toContain("Speak in FIRST PERSON");
    expect(json.result.distillation.mode).toBe("grounded");
    expect(json.result.distillation.researchNotes).toContain("Fixture source notes");
    expect(json.result.skillMarkdown).toContain(json.result.distillation.researchNotes);
  });

  it("does not label a name-only fallback as a researched custom skill", async () => {
    ai.key.mockReturnValue(null);
    expect((await POST(request(true))).status).toBe(503);
    expect(ai.synthesize).not.toHaveBeenCalled();
  });

  it("stops the strict creation flow if grounded research fails", async () => {
    ai.research.mockRejectedValue(new Error("gemini_http_429"));
    expect((await POST(request(true))).status).toBe(503);
    expect(ai.synthesize).not.toHaveBeenCalled();
  });

  it("preserves the explicitly labeled legacy profile fallback", async () => {
    ai.key.mockReturnValue(null);
    const json = await (await POST(request(false))).json();
    expect(json.warning.code).toBe("profile_fallback");
    expect(json.result.distillation.mode).toBe("profile_fallback");
    expect(json.result.skillMarkdown).toContain("No verified web research was available");
  });
});
