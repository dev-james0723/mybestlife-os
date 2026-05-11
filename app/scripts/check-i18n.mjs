#!/usr/bin/env node
/**
 * CI guard: fail if legacy TODO translation markers appear in source,
 * or if knowledge locale wiring is incomplete.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appSrc = join(root, "src");

function grepHas(pattern, dir) {
  try {
    execSync(
      `grep -RIn ${pattern} "${dir}" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs'`,
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    return true;
  } catch (e) {
    if (e.status === 1) return false;
    throw e;
  }
}

let failed = false;

if (grepHas("-F '[TODO:'", appSrc)) {
  console.error("ERROR: Found literal [TODO: in app/src.");
  try {
    console.error(
      execSync(`grep -RIn -F '[TODO:' "${appSrc}" --include='*.ts' --include='*.tsx'`, {
        encoding: "utf8",
      }),
    );
  } catch {
    /* ignore */
  }
  failed = true;
}

if (grepHas("-F 'withTodoLocale'", join(root, "src", "lib", "i18n"))) {
  console.error("ERROR: withTodoLocale should not remain in i18n sources.");
  failed = true;
}

const knowledgeLocales = [
  "knowledge-zh-tw.ts",
  "knowledge-zh-cn.ts",
  "knowledge-ja.ts",
  "knowledge-ko.ts",
  "knowledge-fr.ts",
  "knowledge-it.ts",
  "knowledge-es.ts",
  "knowledge-vi.ts",
];
const kl = join(root, "src", "lib", "i18n", "knowledge-locales");
for (const f of knowledgeLocales) {
  const p = join(kl, f);
  if (!existsSync(p)) {
    console.error(`ERROR: Missing knowledge locale file: ${p}`);
    failed = true;
  }
}

const overrideIndex = join(root, "src", "lib", "i18n", "knowledge-ui-locale-overrides.ts");
if (!existsSync(overrideIndex)) {
  console.error(`ERROR: Missing ${overrideIndex}`);
  failed = true;
} else {
  const text = readFileSync(overrideIndex, "utf8");
  for (const loc of ["zh-TW", "zh-CN", "ja", "ko", "fr", "it", "es", "vi"]) {
    const needle = loc.includes("-") ? `"${loc}"` : `${loc}:`;
    if (!text.includes(needle)) {
      console.error(`ERROR: knowledge-ui-locale-overrides.ts missing locale key ${loc}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log("check-i18n: OK");
