import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextBuild from "next/dist/build/index.js";
import { Bundler } from "next/dist/lib/bundler.js";

// Loopback-only optimized fixture build. Never deploy this output.
// Next's compile/generate modes skip its global TypeScript pass, so require the
// Garden entrypoints and their complete transitive source imports to pass first.
const requestedMode = process.argv[2];
if (!requestedMode) {
  let listening = false;
  try { listening = !!execFileSync("lsof", ["-nP", "-iTCP:3100", "-sTCP:LISTEN"], { encoding: "utf8" }).trim(); } catch { /* No process on the fixture port. */ }
  assert(!listening, "Stop the local preview on port 3100 before rebuilding: a running Next server caches old chunks.");
}
if (!requestedMode) execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "--project", "tsconfig.garden-verify.json", "--noEmit", "--pretty", "false"], { stdio: "inherit" });
process.env.NEXT_OUTPUT_DIR = ".next-garden-verify";
process.env.NEXT_PUBLIC_DEV_LOGIN_BYPASS = "true";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "local-garden-fixture-only";
console.log("TEST-ONLY optimized Garden build with placeholder service config. Do not deploy.");
if (requestedMode === "serve") {
  execFileSync(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"], { stdio: "inherit" });
  process.exit(0);
}
const routePaths = { app: ["/[locale]/(protected)/garden/page.tsx"], pages: [] };
// The installed Next 16 build entrypoint accepts route-relative paths; the CLI
// categorizer does not correctly match this repo's src/app path for this version.
if (requestedMode === "compile" || requestedMode === "generate") {
  await nextBuild.default(process.cwd(), false, false, false, false, false, false, Bundler.Webpack, requestedMode, undefined, routePaths);
} else {
  // Next holds its build lock until process exit; separate child processes are required.
  for (const mode of ["compile", "generate"]) execFileSync(process.execPath, [fileURLToPath(import.meta.url), mode], { stdio: "inherit" });
}
const manifest = JSON.parse(await readFile(".next-garden-verify/server/app-paths-manifest.json", "utf8"));
assert(manifest["/[locale]/(protected)/garden/page"], "Garden route missing from optimized output");
console.log("Verified: optimized Garden route emitted; scoped TypeScript passed.");
