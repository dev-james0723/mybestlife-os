import { beforeEach, describe, expect, it, vi } from "vitest";
import { advisorDisplayName } from "./conversation-contract";
import { compileNeuralSkillMarkdown } from "@/lib/relationships/neural-skill-generation";
import { buildProfileNeuralSkillFallback } from "@/app/api/ai/role-model/_shared-intelligence";

const ai = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock("@/lib/ai/gemini-text", () => ({
  getGeminiServerApiKey: () => "test-key",
  fetchGeminiChatText: ai.chat,
}));
import { invokeMindSkill } from "./skill-runtime";

beforeEach(() => {
  ai.chat.mockReset().mockResolvedValue({ text: "I'd start with the constraint.", modelUsed: "fixture" });
});

describe("Nuwa chat skill activation", () => {
  it.each(["lens-elon-musk", "lens-warren-buffett"])("activates %s in first person with one UI disclosure", async (skillId) => {
    const contents = [
      { role: "user" as const, parts: [{ text: "How would you decide?" }] },
      { role: "model" as const, parts: [{ text: "I'd examine the assumptions." }] },
      { role: "user" as const, parts: [{ text: "What next?" }] },
    ];
    const result = await invokeMindSkill({
      skillProvider: "nuwa", skillId, agentId: skillId,
      lensTitle: skillId === "lens-elon-musk" ? "Elon Musk–inspired Lens" : "Warren Buffett–inspired Lens",
      systemPromptHint: "", locale: "en", contents,
    });
    const call = ai.chat.mock.calls[0][0];
    expect(result.skillPackageLoaded).toBe(true);
    expect(result.source).toBe("nuwa");
    expect(call.systemInstruction).toContain("Speak in FIRST PERSON");
    expect(call.systemInstruction).toContain("including the first reply");
    expect(call.systemInstruction).toContain("If asked about identity, answer truthfully");
    expect(call.systemInstruction).toContain("If the user asks to exit the role");
    expect(call.systemInstruction).not.toContain("Use third-person lens framing instead");
    expect(call.contents).toEqual(contents);
    expect(call.systemInstruction.length).toBeGreaterThan(3000);
  });

  it("uses a saved custom package even when no bundled file exists", async () => {
    const content = buildProfileNeuralSkillFallback({ roleModel: { id: "x", name: "Test Person" } });
    content.thinkingStyle = "UNIQUE_TEST_MODEL: question the bottleneck";
    const markdown = compileNeuralSkillMarkdown(content);
    const result = await invokeMindSkill({
      skillProvider: "custom", skillId: "custom-rm-x", agentId: "custom-rm-x",
      lensTitle: content.lensTitle, systemPromptHint: "short seed",
      skillMarkdown: markdown, locale: "zh-TW",
      contents: [{ role: "user", parts: [{ text: "What should I do?" }] }],
    });
    expect(result.skillPackageLoaded).toBe(true);
    expect(ai.chat.mock.calls[0][0].systemInstruction).toContain("UNIQUE_TEST_MODEL");
    expect(ai.chat.mock.calls[0][0].systemInstruction).toContain(content.likelyQuestions[0]);
  });

  it("only removes the generated suffix from names", () => {
    expect(advisorDisplayName("Warren Buffett–inspired Lens")).toBe("Warren Buffett");
    expect(advisorDisplayName("宮崎駿–inspired Evidence Lens")).toBe("宮崎駿");
    expect(advisorDisplayName("Mary-Jane Smith")).toBe("Mary-Jane Smith");
  });
});
