/**
 * One-off: generate `public/quick-task-icons/preset-*.png` for built-in quick tasks.
 * Run from `app/`:  GEMINI_API_KEY=... npx tsx scripts/generate-quick-task-preset-icons.ts
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateQuoteThumbnailImage } from "../src/lib/quote-library/thumbnail/image";
import { buildLiquidGlassQuickTaskIconPrompt } from "../src/lib/daily-planner/quick-task-icon-prompt";
import {
  QUICK_TASK_PRESET_KEYS,
  QUICK_TASK_PRESET_VISUAL_SUBJECT,
  type QuickTaskPresetKey,
} from "../src/lib/daily-planner/quick-task-preset-meta";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/quick-task-icons");

function getKey(): string {
  const k = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!k) {
    console.error("Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
    process.exit(1);
  }
  return k;
}

async function main() {
  const apiKey = getKey();
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  for (const key of QUICK_TASK_PRESET_KEYS) {
    const subject = QUICK_TASK_PRESET_VISUAL_SUBJECT[key as QuickTaskPresetKey];
    const prompt = buildLiquidGlassQuickTaskIconPrompt(
      `${subject} This is the dedicated icon for the "${key}" quick task preset.`,
    );
    process.stdout.write(`Generating ${key}… `);
    const out = await generateQuoteThumbnailImage({ apiKey, prompt });
    const ext = out.mimeType.includes("webp") ? "webp" : "png";
    const filePath = join(OUT_DIR, `preset-${key}.${ext}`);
    writeFileSync(filePath, out.bytes);
    console.log(`ok → ${filePath} (${out.modelUsed})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
