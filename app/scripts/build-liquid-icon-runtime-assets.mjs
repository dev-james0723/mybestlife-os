#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const ICON_ROOT = path.join(APP_ROOT, "public/images/liquid-icons/pack-c");
const MANIFEST_PATH = path.join(ICON_ROOT, "manifest.json");
const RUNTIME_ROOT = path.join(ICON_ROOT, "runtime");
const RUNTIME_SIZE = 96;

const SOURCE_PATHS = {
  "command-glass": {
    day: "alpha-day-command-style",
    dark: "alpha-dark-command-style",
  },
  "soft-3d-clay": {
    day: "packs/soft-3d-clay/day",
    dark: "packs/soft-3d-clay/dark",
  },
  "neo-brutal-retro": {
    day: "packs/neo-brutal-retro/day",
    dark: "packs/neo-brutal-retro/dark",
  },
  "adaptive-minimal-line": {
    day: "packs/adaptive-minimal-line/day",
    dark: "packs/adaptive-minimal-line/dark",
  },
  "humanist-ink": {
    day: "packs/humanist-ink/day",
    dark: "packs/humanist-ink/dark",
  },
  "glacier-blue": {
    day: "packs/glacier-blue/day",
    dark: "packs/glacier-blue/dark",
  },
  "opal-celestial": {
    day: "packs/opal-celestial/day",
    dark: "packs/opal-celestial/dark",
  },
  "jelly-gummy": {
    day: "packs/jelly-gummy/day",
    dark: "packs/jelly-gummy/dark",
  },
  "neo-deco-brass": {
    day: "packs/neo-deco-brass/day",
    dark: "packs/neo-deco-brass/dark",
  },
  "velvet-opera": {
    day: "packs/velvet-opera/day",
    dark: "packs/velvet-opera/dark",
  },
  "lace-porcelain": {
    day: "packs/lace-porcelain/day",
    dark: "packs/lace-porcelain/dark",
  },
  "postal-poet": {
    day: "packs/postal-poet/day",
    dark: "packs/postal-poet/dark",
  },
  "mystic-outlands": {
    day: "packs/mystic-outlands/day",
    dark: "packs/mystic-outlands/dark",
  },
  "funhaus-stripe": {
    day: "packs/funhaus-stripe/day",
    dark: "packs/funhaus-stripe/dark",
  },
  "field-khaki": {
    day: "packs/field-khaki/day",
    dark: "packs/field-khaki/dark",
  },
  "afrohemian-weave": {
    day: "packs/afrohemian-weave/day",
    dark: "packs/afrohemian-weave/dark",
  },
  "glitch-glam": {
    day: "packs/glitch-glam/day",
    dark: "packs/glitch-glam/dark",
  },
};

async function readTargets() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(manifest.targets) || manifest.targets.length !== 50) {
    throw new Error(`Expected 50 manifest targets, found ${manifest.targets?.length ?? "none"}`);
  }
  return manifest.targets.map((target) => target.assetId);
}

async function convertIcon(source, destination) {
  await sharp(source)
    .resize(RUNTIME_SIZE, RUNTIME_SIZE, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      quality: 90,
      effort: 10,
    })
    .toFile(destination);
}

async function main() {
  const assetIds = await readTargets();
  const failures = [];
  let converted = 0;

  for (const [packId, modes] of Object.entries(SOURCE_PATHS)) {
    for (const [mode, sourceRelativePath] of Object.entries(modes)) {
      const sourceDir = path.join(ICON_ROOT, sourceRelativePath);
      const destinationDir = path.join(RUNTIME_ROOT, packId, mode);
      await fs.mkdir(destinationDir, { recursive: true });

      for (const assetId of assetIds) {
        const source = path.join(sourceDir, `${assetId}.png`);
        const destination = path.join(destinationDir, `${assetId}.png`);
        try {
          await fs.access(source);
          await convertIcon(source, destination);
          converted += 1;
        } catch (error) {
          failures.push({
            packId,
            mode,
            assetId,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  const receipt = {
    executionState: failures.length ? "completed_with_failures" : "real_generation_completed",
    generationMethod:
      "Downscaled app-facing runtime icons from canonical 512px transparent PNG sources.",
    runtimeSizePx: RUNTIME_SIZE,
    outputBase: "/images/liquid-icons/pack-c/runtime",
    sourcePacks: SOURCE_PATHS,
    targetCount: assetIds.length,
    converted,
    failures,
  };

  await fs.writeFile(
    path.join(RUNTIME_ROOT, "RUNTIME_RECEIPT.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );

  console.log(JSON.stringify(receipt, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
