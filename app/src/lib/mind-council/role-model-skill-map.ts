/**
 * Maps a Role Model (by name) onto an existing preset Mind Council lens when
 * one exists, so "Talk To {name}" can deep-link straight into a curated chat
 * instead of forcing the user to generate a Neural Skill.
 *
 * Matching is intentionally conservative: we only claim a match when the
 * normalized person name in the preset's `lensTitle` equals the normalized
 * role-model name (or a small set of known aliases). Anything fuzzier risks
 * routing "John Glenn" to the "Glenn Gould" lens, which would feel broken.
 */

import { PRESET_MIND_SKILLS } from "./preset-skills";
import type { MindSkill } from "./types";

/** Strip accents, lowercase, collapse whitespace, drop punctuation. */
function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the person name from a preset lensTitle ("Elon Musk–inspired Lens" → "Elon Musk"). */
function personFromLensTitle(lensTitle: string): string {
  // The en-dash separator is "–" (U+2013); also tolerate a plain hyphen.
  return lensTitle.split(/[–-]inspired/i)[0]?.trim() ?? lensTitle;
}

/** A few well-known short names / aliases that won't match the title verbatim. */
const ALIASES: Record<string, string> = {
  beyonce: "lens-beyonce",
  nietzsche: "lens-friedrich-nietzsche",
  "marcus aurelius": "lens-marcus-aurelius",
};

const NAME_TO_SKILL: Map<string, MindSkill> = (() => {
  const map = new Map<string, MindSkill>();
  for (const skill of PRESET_MIND_SKILLS) {
    map.set(normalizeName(personFromLensTitle(skill.lensTitle)), skill);
  }
  return map;
})();

/**
 * Return the preset Mind Council skill that corresponds to this role-model
 * name, or `undefined` when there is no curated lens for them.
 */
export function findPresetSkillForRoleModel(name: string): MindSkill | undefined {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  const direct = NAME_TO_SKILL.get(normalized);
  if (direct) return direct;

  const aliasId = ALIASES[normalized];
  if (aliasId) return PRESET_MIND_SKILLS.find((s) => s.skillId === aliasId);

  return undefined;
}
