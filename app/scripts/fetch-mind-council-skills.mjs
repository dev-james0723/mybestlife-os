#!/usr/bin/env node
/**
 * Downloads Agent Skill packages (SKILL.md) for Mind Council preset lenses.
 * Run: node scripts/fetch-mind-council-skills.mjs
 */
import { mkdir, writeFile, readFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "src/lib/mind-council/bundled-skills");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");
const FALLBACK_DIR = path.join(__dirname, "mind-council-fallback-skills");

/** @type {Record<string, { url: string; repo: string; license?: string; note?: string }>} */
const SOURCES = {
  "lens-elon-musk": {
    repo: "alchaincyf/elon-musk-skill",
    url: "https://raw.githubusercontent.com/alchaincyf/elon-musk-skill/main/SKILL.md",
    license: "MIT",
  },
  "lens-steve-jobs": {
    repo: "alchaincyf/steve-jobs-skill",
    url: "https://raw.githubusercontent.com/alchaincyf/steve-jobs-skill/main/SKILL.md",
    license: "MIT",
  },
  "lens-jeff-bezos": {
    repo: "sethmblack/persona-jeff-bezos",
    url: "https://raw.githubusercontent.com/sethmblack/persona-jeff-bezos/main/SKILL.md",
    license: "MIT",
  },
  "lens-sam-altman": {
    repo: "sethmblack/skill-sam-altman",
    url: "https://raw.githubusercontent.com/sethmblack/skill-sam-altman/main/SKILL.md",
    license: "MIT",
  },
  "lens-warren-buffett": {
    repo: "will2025btc/buffett-perspective",
    url: "https://raw.githubusercontent.com/will2025btc/buffett-perspective/main/SKILL.md",
    license: "MIT",
  },
  "lens-charlie-munger": {
    repo: "alchaincyf/munger-skill",
    url: "https://raw.githubusercontent.com/alchaincyf/munger-skill/main/SKILL.md",
    license: "MIT",
  },
  "lens-ray-dalio": {
    repo: "jazzqi/ray-dalio-skill",
    url: "https://raw.githubusercontent.com/jazzqi/ray-dalio-skill/main/SKILL.md",
  },
  "lens-michael-jackson": {
    repo: "ONE-0508/michaeljacksonskill",
    url: "https://raw.githubusercontent.com/ONE-0508/michaeljacksonskill/main/SKILL.md",
  },
  "lens-kobe-bryant": {
    repo: "zobinHuang/kobe.skill",
    url: "https://raw.githubusercontent.com/zobinHuang/kobe.skill/main/SKILL.md",
  },
  "lens-serena-williams": {
    repo: "sethmblack/skill-serena-williams",
    url: "https://raw.githubusercontent.com/sethmblack/skill-serena-williams/main/SKILL.md",
    license: "MIT",
  },
  "lens-barack-obama": {
    repo: "will-assistant/openclaw-agents",
    url: "https://raw.githubusercontent.com/will-assistant/openclaw-agents/main/agents/politicians/barack-obama/SOUL.md",
    note: "Combined SOUL.md + IDENTITY.md from openclaw-agents",
  },
  "lens-nelson-mandela": {
    repo: "sethmblack/skill-nelson-mandela",
    url: "https://raw.githubusercontent.com/sethmblack/skill-nelson-mandela/main/SKILL.md",
    license: "MIT",
  },
  "lens-winston-churchill": {
    repo: "sethmblack/skill-winston-churchill",
    url: "https://raw.githubusercontent.com/sethmblack/skill-winston-churchill/main/SKILL.md",
    license: "MIT",
  },
  "lens-albert-einstein": {
    repo: "sethmblack/skill-albert-einstein",
    url: "https://raw.githubusercontent.com/sethmblack/skill-albert-einstein/main/SKILL.md",
    license: "MIT",
  },
  "lens-richard-feynman": {
    repo: "alchaincyf/feynman-skill",
    url: "https://raw.githubusercontent.com/alchaincyf/feynman-skill/main/SKILL.md",
    license: "MIT",
  },
  "lens-charles-darwin": {
    repo: "alchaincyf/darwin-skill",
    url: "https://raw.githubusercontent.com/alchaincyf/darwin-skill/master/SKILL.md",
    license: "MIT",
  },
  "lens-marcus-aurelius": {
    repo: "sethmblack/skill-marcus-aurelius",
    url: "https://raw.githubusercontent.com/sethmblack/skill-marcus-aurelius/main/SKILL.md",
    license: "MIT",
  },
  "lens-friedrich-nietzsche": {
    repo: "Massif-5279/nietzsche-skill",
    url: "https://raw.githubusercontent.com/Massif-5279/nietzsche-skill/main/SKILL.md",
  },
  "lens-virginia-woolf": {
    repo: "sethmblack/skill-virginia-woolf",
    url: "https://raw.githubusercontent.com/sethmblack/skill-virginia-woolf/main/SKILL.md",
    license: "MIT",
  },
  "lens-thich-nhat-hanh": {
    repo: "sethmblack/skill-thich-nhat-hanh",
    url: "https://raw.githubusercontent.com/sethmblack/skill-thich-nhat-hanh/main/SKILL.md",
    license: "MIT",
  },
};

const FALLBACK_SKILLS = [
  "lens-beyonce",
  "lens-glenn-gould",
  "lens-lang-lang",
  "lens-leonard-bernstein",
  "lens-lebron-james",
];

const OBAMA_IDENTITY_URL =
  "https://raw.githubusercontent.com/will-assistant/openclaw-agents/main/agents/politicians/barack-obama/IDENTITY.md";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "MyBestLifeOS-mind-council-fetch/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function toSkillMd(skillId, body, meta) {
  const name = skillId.replace(/^lens-/, "");
  return `---
name: ${name}-perspective
description: Bundled Mind Council lens (${skillId}). Source: ${meta.repo}. ${meta.note ?? ""}
license: ${meta.license ?? "See upstream repository"}
metadata:
  mindCouncilSkillId: ${skillId}
  upstreamRepo: ${meta.repo}
  upstreamUrl: ${meta.url}
---

${body.trim()}
`;
}

async function writeBundledSkill(skillId, content, meta) {
  const dir = path.join(OUT_DIR, skillId);
  await mkdir(dir, { recursive: true });
  const skillPath = path.join(dir, "SKILL.md");
  await writeFile(skillPath, content, "utf8");
  return skillPath;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    skills: {},
  };

  for (const [skillId, meta] of Object.entries(SOURCES)) {
    try {
      let body = await fetchText(meta.url);
      if (skillId === "lens-barack-obama") {
        const identity = await fetchText(OBAMA_IDENTITY_URL);
        body = `${body}\n\n---\n\n${identity}`;
      }
      const content = toSkillMd(skillId, body, meta);
      await writeBundledSkill(skillId, content, meta);
      manifest.skills[skillId] = {
        ...meta,
        bytes: Buffer.byteLength(content, "utf8"),
        status: "fetched",
      };
      console.log(`✓ ${skillId} (${manifest.skills[skillId].bytes} bytes) ← ${meta.repo}`);
    } catch (err) {
      manifest.skills[skillId] = { ...meta, status: "failed", error: String(err) };
      console.error(`✗ ${skillId}: ${err.message}`);
    }
  }

  for (const skillId of FALLBACK_SKILLS) {
    const fallbackPath = path.join(FALLBACK_DIR, `${skillId}.md`);
    try {
      const body = await readFile(fallbackPath, "utf8");
      const meta = {
        repo: "MyBestLifeOS/bundled-public-materials",
        url: fallbackPath,
        note: "Curated from public interviews, speeches, and biographies (no upstream Agent Skill repo found)",
        license: "MIT",
      };
      const content = toSkillMd(skillId, body, meta);
      await writeBundledSkill(skillId, content, meta);
      manifest.skills[skillId] = {
        ...meta,
        bytes: Buffer.byteLength(content, "utf8"),
        status: "bundled-fallback",
      };
      console.log(`✓ ${skillId} (fallback, ${manifest.skills[skillId].bytes} bytes)`);
    } catch (err) {
      manifest.skills[skillId] = { status: "missing", error: String(err) };
      console.error(`✗ ${skillId} fallback missing: ${err.message}`);
    }
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`\nManifest → ${MANIFEST_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
