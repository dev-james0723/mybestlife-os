// Next 16.2.6's debug-build-paths categorizer ignores src/app matches.
// Use the installed build entrypoint with the route-relative path, and assert
// the actual Brain route exists instead of mistaking a /404-only build for success.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import nextBuild from "next/dist/build/index.js";
import { Bundler } from "next/dist/lib/bundler.js";

const profile = process.env.BRAIN_VERIFY_PROFILE === "1";
const outputDir = profile ? (process.env.BRAIN_VERIFY_PROFILE_DIR ?? ".next-brain-profile") : ".next-brain-verify";
process.env.NEXT_OUTPUT_DIR = outputDir;
if (profile) {
  // Local, loopback-only performance fixture build. Never deploy this output.
  process.env.NEXT_PUBLIC_DEV_LOGIN_BYPASS = "true";
  console.log("TEST-ONLY performance build; dev page access enabled. Do not deploy.");
}
await nextBuild.default(process.cwd(), false, false, false, false, false, false, Bundler.Webpack, undefined, undefined, {
  app: ["/[locale]/(protected)/brain/page.tsx"], pages: [],
});
const manifest = JSON.parse(await readFile(`${outputDir}/server/app-paths-manifest.json`, "utf8"));
assert(manifest["/[locale]/(protected)/brain/page"], "Brain route missing from build output");
console.log("Verified: production Brain route emitted.");
