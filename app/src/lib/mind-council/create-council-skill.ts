import type { RoleModel } from "@/types/database";
import type { RoleModelInsightContextPayload, RoleModelNeuralSkill } from "@/types/role-model-intelligence";

export type CreateCouncilSkillInput = { name: string; focus: string };
export type CouncilSkillCreationDependencies = {
  getRoleModels: () => Promise<RoleModel[]>;
  createRoleModel: (input: { name: string; bio: string | null }) => Promise<RoleModel>;
  getSkills: () => Promise<RoleModelNeuralSkill[]>;
  generate: (args: {
    roleModelId: string;
    roleModelName: string;
    context: RoleModelInsightContextPayload;
    requireResearch: boolean;
  }) => Promise<RoleModelNeuralSkill>;
};

/** Reuse an existing profile on retry; never create a second one just because research failed. */
export async function createCouncilSkill(
  input: CreateCouncilSkillInput,
  deps: CouncilSkillCreationDependencies,
): Promise<RoleModelNeuralSkill> {
  const name = input.name.trim().slice(0, 100);
  const focus = input.focus.trim().slice(0, 1000);
  if (!name) throw new Error("A person's name is required.");
  const normalized = (value: string) => value.normalize("NFKC").trim().toLowerCase();
  const profiles = await deps.getRoleModels();
  const roleModel = profiles.find((row) => normalized(row.name) === normalized(name))
    ?? await deps.createRoleModel({ name, bio: focus || null });
  const saved = (await deps.getSkills()).find((row) =>
    row.role_model_id === roleModel.id && row.status === "ready" && row.model_used !== "profile-fallback",
  );
  if (saved && !focus) return saved;

  return deps.generate({
    roleModelId: roleModel.id,
    roleModelName: roleModel.name,
    requireResearch: true,
    context: {
      roleModel: {
        id: roleModel.id,
        name: roleModel.name,
        category: roleModel.category,
        bio: [roleModel.bio, focus && focus !== roleModel.bio ? `User-provided identity / requested focus: ${focus}` : ""].filter(Boolean).join("\n"),
        tags: roleModel.tags,
        quotes: roleModel.quotes.map((quote) => quote.text),
        keyLessons: roleModel.key_lessons.map((lesson) => `${lesson.title}: ${lesson.detail ?? ""}`),
      },
    },
  });
}
