#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const RUNTIME_ROOT = path.join(
  APP_ROOT,
  "public/images/liquid-icons/pack-c/runtime",
);

const SIZE = 96;

const PALETTES = {
  "afrohemian-weave": {
    day: {
      primary: "#3f2418",
      secondary: "#c4552d",
      accent: "#173b57",
      highlight: "#f0d4a3",
      shadow: "#1f1510",
    },
    dark: {
      primary: "#f0d4a3",
      secondary: "#e06a3a",
      accent: "#82b7d6",
      highlight: "#fff2c8",
      shadow: "#2c1810",
    },
  },
  "lace-porcelain": {
    day: {
      primary: "#b5a99b",
      secondary: "#ece7dc",
      accent: "#8fa4b6",
      highlight: "#fffaf0",
      shadow: "#8d8277",
    },
    dark: {
      primary: "#f4eee4",
      secondary: "#cabfad",
      accent: "#b7d7ef",
      highlight: "#ffffff",
      shadow: "#6f675e",
    },
  },
  "neo-deco-brass": {
    day: {
      primary: "#161a19",
      secondary: "#b98233",
      accent: "#d7b46a",
      highlight: "#f2d88a",
      shadow: "#050606",
    },
    dark: {
      primary: "#f3d680",
      secondary: "#b98233",
      accent: "#fff0ad",
      highlight: "#fff8cf",
      shadow: "#1b1307",
    },
  },
};

const REPAIRS = {
  "afrohemian-weave": [
    "about-me",
    "career-journal",
    "assets",
    "category-knowledge",
    "knowledge-base",
  ],
  "lace-porcelain": [
    "about-me",
    "documents",
    "career",
    "assets",
    "knowledge-base",
  ],
  "neo-deco-brass": [
    "about-me",
    "career-journal",
    "career",
    "category-learning",
    "knowledge-base",
  ],
};

function svgShell(packId, mode, body) {
  const palette = PALETTES[packId][mode];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="main" x1="18" y1="12" x2="78" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${palette.highlight}"/>
      <stop offset="0.48" stop-color="${palette.secondary}"/>
      <stop offset="1" stop-color="${palette.primary}"/>
    </linearGradient>
    <linearGradient id="edge" x1="14" y1="78" x2="82" y2="18" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${palette.shadow}"/>
      <stop offset="0.55" stop-color="${palette.accent}"/>
      <stop offset="1" stop-color="${palette.highlight}"/>
    </linearGradient>
    <pattern id="weave" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <path d="M0 2 H10 M0 7 H10" stroke="${palette.accent}" stroke-width="1.2" opacity="0.55"/>
    </pattern>
    <filter id="soft-depth" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="${palette.shadow}" flood-opacity="0.42"/>
    </filter>
  </defs>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#soft-depth)">
    ${body(palette)}
  </g>
</svg>`;
}

function beadPath(points, radius = 2.1) {
  return points
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#edge)" stroke="none"/>`)
    .join("");
}

const GLYPHS = {
  "about-me": {
    "afrohemian-weave": () => `
      <circle cx="48" cy="31" r="13" fill="url(#main)" stroke="url(#edge)" stroke-width="3"/>
      <path d="M26 76 C29 57 39 49 48 49 C57 49 67 57 70 76" fill="url(#weave)" stroke="url(#edge)" stroke-width="4"/>
      ${beadPath([[33, 66], [41, 72], [55, 72], [63, 66]], 2.2)}
    `,
    "lace-porcelain": () => `
      <circle cx="48" cy="31" r="12" fill="url(#main)" stroke="url(#edge)" stroke-width="3"/>
      <path d="M28 76 C31 58 39 50 48 50 C57 50 65 58 68 76" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M35 64 Q48 55 61 64" stroke="currentColor" stroke-width="0"/>
      ${beadPath([[32, 67], [40, 72], [48, 74], [56, 72], [64, 67]], 1.9)}
    `,
    "neo-deco-brass": () => `
      <path d="M48 16 L61 29 L56 45 L40 45 L35 29 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="3"/>
      <path d="M25 78 L35 55 H61 L71 78 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M48 55 V78 M35 64 H61" stroke="url(#edge)" stroke-width="2.4"/>
    `,
  },
  "career-journal": {
    "afrohemian-weave": () => `
      <path d="M29 21 H66 C71 21 74 25 74 30 V75 C74 78 72 80 69 80 H31 C27 80 24 77 24 73 V28 C24 24 26 21 29 21 Z" fill="url(#weave)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M37 30 V72 M46 35 H64 M46 48 H62 M46 61 H58" stroke="url(#main)" stroke-width="3"/>
      <path d="M63 23 L72 14 L78 20 L69 29 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="2.8"/>
    `,
    "neo-deco-brass": () => `
      <path d="M25 22 H65 L73 30 V78 H25 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M65 22 V31 H74 M36 36 H60 M36 49 H64 M36 62 H56" stroke="url(#edge)" stroke-width="2.8"/>
      <path d="M66 17 L77 28" stroke="url(#edge)" stroke-width="4"/>
    `,
  },
  assets: {
    "afrohemian-weave": () => `
      <path d="M48 13 L72 26 V54 L48 68 L24 54 V26 Z" fill="url(#weave)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M24 26 L48 39 L72 26 M48 39 V68" stroke="url(#main)" stroke-width="3"/>
      ${beadPath([[34, 59], [48, 67], [62, 59]], 2)}
    `,
    "lace-porcelain": () => `
      <path d="M48 14 L73 28 V55 L48 70 L23 55 V28 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M23 28 L48 42 L73 28 M48 42 V70" stroke="url(#edge)" stroke-width="2.7"/>
      ${beadPath([[32, 30], [40, 35], [56, 35], [64, 30]], 1.8)}
    `,
  },
  "category-knowledge": {
    "afrohemian-weave": () => `
      <path d="M22 73 V29 C31 24 41 27 48 34 C55 27 65 24 74 29 V73 C65 69 55 71 48 78 C41 71 31 69 22 73 Z" fill="url(#weave)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M48 34 V78 M31 39 H42 M54 39 H65 M31 52 H41 M55 52 H65" stroke="url(#main)" stroke-width="3"/>
      ${beadPath([[27, 27], [69, 27], [48, 78]], 2)}
    `,
  },
  "knowledge-base": {
    "afrohemian-weave": () => `
      <path d="M26 67 L48 18 L70 67 Z" fill="url(#weave)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M36 60 H60 M41 50 H55 M45 40 H51" stroke="url(#main)" stroke-width="3"/>
      ${beadPath([[48, 18], [34, 67], [62, 67]], 2.2)}
    `,
    "lace-porcelain": () => `
      <path d="M22 69 V29 C31 25 41 27 48 35 C55 27 65 25 74 29 V69 C65 66 55 68 48 76 C41 68 31 66 22 69 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M48 35 V76 M31 41 H41 M55 41 H65 M32 54 H40 M56 54 H64" stroke="url(#edge)" stroke-width="2.3"/>
      ${beadPath([[28, 29], [36, 31], [60, 31], [68, 29]], 1.7)}
    `,
    "neo-deco-brass": () => `
      <path d="M22 72 V26 C32 22 41 26 48 35 C55 26 64 22 74 26 V72 C63 67 55 70 48 79 C41 70 33 67 22 72 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M48 35 V79 M31 40 H41 M55 40 H65 M32 54 H40 M56 54 H64" stroke="url(#edge)" stroke-width="2.5"/>
    `,
  },
  documents: {
    "lace-porcelain": () => `
      <path d="M31 18 H58 L70 30 V77 H31 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M58 18 V31 H70 M39 43 H61 M39 55 H58 M39 67 H54" stroke="url(#edge)" stroke-width="2.5"/>
      ${beadPath([[31, 28], [31, 40], [31, 52], [31, 64]], 1.7)}
    `,
  },
  career: {
    "lace-porcelain": () => `
      <path d="M25 35 H71 V74 H25 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M38 35 V28 C38 24 41 22 45 22 H51 C55 22 58 24 58 28 V35 M25 48 H71" stroke="url(#edge)" stroke-width="3"/>
      ${beadPath([[35, 54], [48, 54], [61, 54]], 1.8)}
    `,
    "neo-deco-brass": () => `
      <path d="M24 38 H72 V74 H24 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M38 38 V29 H58 V38 M24 50 H72 M48 50 V74" stroke="url(#edge)" stroke-width="3"/>
      <path d="M33 28 H63" stroke="url(#edge)" stroke-width="2"/>
    `,
  },
  "category-learning": {
    "neo-deco-brass": () => `
      <path d="M18 36 L48 22 L78 36 L48 50 Z" fill="url(#main)" stroke="url(#edge)" stroke-width="4"/>
      <path d="M30 45 V60 C39 67 57 67 66 60 V45" fill="url(#main)" stroke="url(#edge)" stroke-width="3"/>
      <path d="M76 38 V62 L81 70" stroke="url(#edge)" stroke-width="3"/>
    `,
  },
};

function iconSvg(packId, mode, assetId) {
  const packGlyph = GLYPHS[assetId]?.[packId];
  if (!packGlyph) {
    throw new Error(`No repair glyph for ${packId}/${assetId}`);
  }
  return svgShell(packId, mode, packGlyph);
}

async function main() {
  const outputs = [];

  for (const [packId, assetIds] of Object.entries(REPAIRS)) {
    for (const mode of ["day", "dark"]) {
      for (const assetId of assetIds) {
        const outputPath = path.join(RUNTIME_ROOT, packId, mode, `${assetId}.png`);
        const svg = iconSvg(packId, mode, assetId);
        await sharp(Buffer.from(svg)).png().toFile(outputPath);
        outputs.push(path.relative(APP_ROOT, outputPath));
      }
    }
  }

  await fs.writeFile(
    path.join(RUNTIME_ROOT, "DUPLICATE_REPAIR_RECEIPT.json"),
    JSON.stringify(
      {
        repairedAt: new Date().toISOString(),
        reason: "Replaced exact duplicate generated image navigation icons with target-specific transparent PNG glyphs.",
        size: SIZE,
        repairs: REPAIRS,
        outputs,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Repaired ${outputs.length} generated image icon files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
