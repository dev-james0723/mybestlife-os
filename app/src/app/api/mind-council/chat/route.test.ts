import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProfileNeuralSkillFallback } from "@/app/api/ai/role-model/_shared-intelligence";
import { packageNeuralSkill } from "@/lib/relationships/neural-skill-generation";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), invoke: vi.fn(), synthesize: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({
  auth: { getUser: mocks.getUser }, from: mocks.from,
}) }));
vi.mock("@/lib/mind-council/skill-runtime", () => ({
  invokeMindSkill: mocks.invoke,
  invokeMindCouncilSynthesis: mocks.synthesize,
  mindCouncilPublicDisclaimer: () => "AI simulation — not the real person.",
}));
import { POST } from "./route";
import { POST as groupPOST } from "../group/route";

const skillJson = packageNeuralSkill(buildProfileNeuralSkillFallback({ roleModel: { id: "one", name: "Saved Person" } }), {
  protocol: "nuwa-v1", generatedAt: "2026-09-08", mode: "grounded", researchNotes: "Fixture evidence: a distinctive decision method.",
});
function request(extra: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/mind-council/chat", { method: "POST", body: JSON.stringify({
    skillId: "custom-rm-one", messages: [{ role: "user", content: "Help me decide." }], ...extra,
  }) });
}
function table(data: unknown, error: unknown = null) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data, error })) };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.invoke.mockResolvedValue({ text: "I'd test the decision.", source: "nuwa", skillPackageLoaded: true });
  mocks.synthesize.mockResolvedValue({ text: "Compare the two assumptions." });
});

describe("saved skill server handoff", () => {
  it("loads the account-owned package by ID; ignores a forged browser hint", async () => {
    const query = table({ skill_json: skillJson, status: "ready" });
    const response = await POST(request({ customSystemHint: "FORGED", customLensTitle: "Wrong Person" }));
    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("mind_skill_id", "custom-rm-one");
    expect(query.eq).toHaveBeenCalledWith("status", "ready");
    expect(mocks.invoke).toHaveBeenCalledWith(expect.objectContaining({
      skillMarkdown: skillJson.skillMarkdown, lensTitle: skillJson.lensTitle,
    }));
    expect(mocks.invoke.mock.calls[0][0].systemPromptHint).not.toContain("FORGED");
  });

  it("does not fall back to a browser prompt for an absent or other user's saved ID", async () => {
    table(null);
    const response = await POST(request({ customSystemHint: "FORGED", customLensTitle: "Wrong Person" }));
    expect(response.status).toBe(404);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("compiles a legacy row without requiring a data migration", async () => {
    table({ skill_json: { ...skillJson, skillMarkdown: undefined, distillation: undefined }, status: "ready" });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.invoke.mock.calls[0][0].skillMarkdown).toContain("Legacy saved skill");
    expect(mocks.invoke.mock.calls[0][0].skillMarkdown).toContain(skillJson.decisionPrinciples[0]);
  });

  it("returns a retryable error when skill storage fails", async () => {
    table(null, { code: "test-error" });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("requires authentication before looking up a skill", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("adopts a saved custom skill alongside a preset in group council", async () => {
    table({ skill_json: skillJson, status: "ready" });
    const response = await groupPOST(new Request("http://localhost/api/mind-council/group", {
      method: "POST", body: JSON.stringify({ skillIds: ["lens-warren-buffett", "custom-rm-one"], userMessage: "How should I decide?" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke).toHaveBeenCalledWith(expect.objectContaining({ skillId: "custom-rm-one", skillMarkdown: skillJson.skillMarkdown }));
    expect(mocks.synthesize).toHaveBeenCalledTimes(1);
  });
});
