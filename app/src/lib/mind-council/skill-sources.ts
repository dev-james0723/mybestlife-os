import type { MindSkillSource } from "./types";

/** Upstream Agent Skill packages vendored by scripts/fetch-mind-council-skills.mjs */
export const MIND_COUNCIL_SKILL_SOURCES: Record<string, MindSkillSource> = {
  "lens-elon-musk": {
    repo: "alchaincyf/elon-musk-skill",
    url: "https://github.com/alchaincyf/elon-musk-skill",
    license: "MIT",
  },
  "lens-steve-jobs": {
    repo: "alchaincyf/steve-jobs-skill",
    url: "https://github.com/alchaincyf/steve-jobs-skill",
    license: "MIT",
  },
  "lens-jeff-bezos": {
    repo: "sethmblack/persona-jeff-bezos",
    url: "https://github.com/sethmblack/persona-jeff-bezos",
    license: "MIT",
  },
  "lens-sam-altman": {
    repo: "sethmblack/skill-sam-altman",
    url: "https://github.com/sethmblack/skill-sam-altman",
    license: "MIT",
  },
  "lens-warren-buffett": {
    repo: "will2025btc/buffett-perspective",
    url: "https://github.com/will2025btc/buffett-perspective",
    license: "MIT",
  },
  "lens-charlie-munger": {
    repo: "alchaincyf/munger-skill",
    url: "https://github.com/alchaincyf/munger-skill",
    license: "MIT",
  },
  "lens-ray-dalio": {
    repo: "jazzqi/ray-dalio-skill",
    url: "https://github.com/jazzqi/ray-dalio-skill",
  },
  "lens-michael-jackson": {
    repo: "ONE-0508/michaeljacksonskill",
    url: "https://github.com/ONE-0508/michaeljacksonskill",
  },
  "lens-beyonce": {
    repo: "MyBestLifeOS/bundled-public-materials",
    url: "app/scripts/mind-council-fallback-skills/lens-beyonce.md",
    note: "Curated from public interviews and career patterns (no upstream Agent Skill repo found)",
    license: "MIT",
  },
  "lens-glenn-gould": {
    repo: "MyBestLifeOS/bundled-public-materials",
    url: "app/scripts/mind-council-fallback-skills/lens-glenn-gould.md",
    note: "Curated from public recordings and writings",
    license: "MIT",
  },
  "lens-lang-lang": {
    repo: "MyBestLifeOS/bundled-public-materials",
    url: "app/scripts/mind-council-fallback-skills/lens-lang-lang.md",
    note: "Curated from public performances and interviews",
    license: "MIT",
  },
  "lens-leonard-bernstein": {
    repo: "MyBestLifeOS/bundled-public-materials",
    url: "app/scripts/mind-council-fallback-skills/lens-leonard-bernstein.md",
    note: "Curated from public lectures and writings",
    license: "MIT",
  },
  "lens-kobe-bryant": {
    repo: "zobinHuang/kobe.skill",
    url: "https://github.com/zobinHuang/kobe.skill",
  },
  "lens-lebron-james": {
    repo: "MyBestLifeOS/bundled-public-materials",
    url: "app/scripts/mind-council-fallback-skills/lens-lebron-james.md",
    note: "Curated from public interviews and career patterns",
    license: "MIT",
  },
  "lens-serena-williams": {
    repo: "sethmblack/skill-serena-williams",
    url: "https://github.com/sethmblack/skill-serena-williams",
    license: "MIT",
  },
  "lens-barack-obama": {
    repo: "will-assistant/openclaw-agents",
    url: "https://github.com/will-assistant/openclaw-agents/tree/main/agents/politicians/barack-obama",
    note: "SOUL.md + IDENTITY.md from openclaw-agents",
  },
  "lens-nelson-mandela": {
    repo: "sethmblack/skill-nelson-mandela",
    url: "https://github.com/sethmblack/skill-nelson-mandela",
    license: "MIT",
  },
  "lens-winston-churchill": {
    repo: "sethmblack/skill-winston-churchill",
    url: "https://github.com/sethmblack/skill-winston-churchill",
    license: "MIT",
  },
  "lens-albert-einstein": {
    repo: "sethmblack/skill-albert-einstein",
    url: "https://github.com/sethmblack/skill-albert-einstein",
    license: "MIT",
  },
  "lens-richard-feynman": {
    repo: "alchaincyf/feynman-skill",
    url: "https://github.com/alchaincyf/feynman-skill",
    license: "MIT",
  },
  "lens-charles-darwin": {
    repo: "alchaincyf/darwin-skill",
    url: "https://github.com/alchaincyf/darwin-skill",
    license: "MIT",
  },
  "lens-marcus-aurelius": {
    repo: "sethmblack/skill-marcus-aurelius",
    url: "https://github.com/sethmblack/skill-marcus-aurelius",
    license: "MIT",
  },
  "lens-friedrich-nietzsche": {
    repo: "Massif-5279/nietzsche-skill",
    url: "https://github.com/Massif-5279/nietzsche-skill",
  },
  "lens-virginia-woolf": {
    repo: "sethmblack/skill-virginia-woolf",
    url: "https://github.com/sethmblack/skill-virginia-woolf",
    license: "MIT",
  },
  "lens-thich-nhat-hanh": {
    repo: "sethmblack/skill-thich-nhat-hanh",
    url: "https://github.com/sethmblack/skill-thich-nhat-hanh",
    license: "MIT",
  },
};

export function getSkillSourceForPreset(skillId: string): MindSkillSource | undefined {
  return MIND_COUNCIL_SKILL_SOURCES[skillId];
}

export function isNuwaDistilledSource(source?: MindSkillSource): boolean {
  return Boolean(source?.repo.startsWith("alchaincyf/"));
}
