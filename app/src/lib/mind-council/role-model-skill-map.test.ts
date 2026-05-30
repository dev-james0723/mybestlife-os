import { describe, it, expect } from "vitest";
import { findPresetSkillForRoleModel } from "./role-model-skill-map";

describe("findPresetSkillForRoleModel", () => {
  it("matches well-known people to their preset lens", () => {
    expect(findPresetSkillForRoleModel("Elon Musk")?.skillId).toBe("lens-elon-musk");
    expect(findPresetSkillForRoleModel("Steve Jobs")?.skillId).toBe("lens-steve-jobs");
    expect(findPresetSkillForRoleModel("Warren Buffett")?.skillId).toBe("lens-warren-buffett");
    expect(findPresetSkillForRoleModel("Glenn Gould")?.skillId).toBe("lens-glenn-gould");
  });

  it("is case-insensitive and tolerant of accents/whitespace", () => {
    expect(findPresetSkillForRoleModel("  elon   MUSK ")?.skillId).toBe("lens-elon-musk");
    expect(findPresetSkillForRoleModel("Beyoncé")?.skillId).toBe("lens-beyonce");
    expect(findPresetSkillForRoleModel("beyonce")?.skillId).toBe("lens-beyonce");
  });

  it("resolves known short-name aliases", () => {
    expect(findPresetSkillForRoleModel("Nietzsche")?.skillId).toBe("lens-friedrich-nietzsche");
  });

  it("returns undefined for people without a curated lens", () => {
    expect(findPresetSkillForRoleModel("My High School Teacher")).toBeUndefined();
    expect(findPresetSkillForRoleModel("")).toBeUndefined();
  });

  it("does not false-match a different person sharing one name token", () => {
    // "John Glenn" must not resolve to the "Glenn Gould" lens.
    expect(findPresetSkillForRoleModel("John Glenn")).toBeUndefined();
  });
});
