import { describe, expect, it, vi } from "vitest";
import { createCouncilSkill, type CouncilSkillCreationDependencies } from "./create-council-skill";
import type { RoleModel } from "@/types/database";
import type { RoleModelNeuralSkill } from "@/types/role-model-intelligence";

function fixture() {
  const profiles: RoleModel[] = [];
  const saved = { role_model_id: "rm-1", mind_skill_id: "custom-rm-rm-1", status: "ready", model_used: "test" } as RoleModelNeuralSkill;
  const deps: CouncilSkillCreationDependencies = {
    getRoleModels: vi.fn(async () => profiles),
    createRoleModel: vi.fn(async ({ name, bio }) => {
      const row = { id: "rm-1", name, bio, quotes: [], key_lessons: [], tags: [] } as unknown as RoleModel;
      profiles.push(row);
      return row;
    }),
    getSkills: vi.fn(async () => []),
    generate: vi.fn(async () => saved),
  };
  return { deps, saved };
}

describe("create a Nuwa council member", () => {
  it("distills a name-only request and returns the persisted skill for chat", async () => {
    const { deps, saved } = fixture();
    const result = await createCouncilSkill({ name: "  Warren Buffett ", focus: "" }, deps);
    expect(result).toBe(saved);
    expect(deps.generate).toHaveBeenCalledWith(expect.objectContaining({
      roleModelId: "rm-1", roleModelName: "Warren Buffett", requireResearch: true,
      context: expect.objectContaining({ roleModel: expect.objectContaining({ name: "Warren Buffett" }) }),
    }));
  });

  it("retries failed research using the saved profile without creating a duplicate", async () => {
    const { deps } = fixture();
    vi.mocked(deps.generate).mockRejectedValueOnce(new Error("research_unavailable"));
    await expect(createCouncilSkill({ name: "New Person", focus: "writer" }, deps)).rejects.toThrow("research_unavailable");
    await createCouncilSkill({ name: "New Person", focus: "writer" }, deps);
    expect(deps.createRoleModel).toHaveBeenCalledTimes(1);
    expect(deps.generate).toHaveBeenCalledTimes(2);
  });

  it("reuses a ready saved skill when the person is added again", async () => {
    const { deps, saved } = fixture();
    await createCouncilSkill({ name: "New Person", focus: "" }, deps);
    vi.mocked(deps.getSkills).mockResolvedValue([saved]);
    await createCouncilSkill({ name: "new person", focus: "" }, deps);
    expect(deps.generate).toHaveBeenCalledTimes(1);
  });

  it("does not mistake a profile fallback for completed research", async () => {
    const { deps, saved } = fixture();
    await createCouncilSkill({ name: "New Person", focus: "" }, deps);
    vi.mocked(deps.getSkills).mockResolvedValue([{ ...saved, model_used: "profile-fallback" }]);
    await createCouncilSkill({ name: "New Person", focus: "" }, deps);
    expect(deps.generate).toHaveBeenCalledTimes(2);
  });
});
