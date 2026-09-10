// Build the actual changed routes in this shared checkout, in separate output.
// This is a local validation build, never a deployment.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import nextBuild from "next/dist/build/index.js";
import { Bundler } from "next/dist/lib/bundler.js";

const output = ".next-mind-council-verify";
process.env.NEXT_OUTPUT_DIR = output;
const routes = [
  "/[locale]/(protected)/mind-council/page",
  "/api/mind-council/chat/route",
  "/api/mind-council/group/route",
  "/api/mind-council/recommend/route",
  "/api/ai/role-model/distill-skill/route",
];
await nextBuild.default(process.cwd(), false, false, false, false, false, false, Bundler.Webpack, undefined, undefined, {
  app: routes.map((route) => `${route}.${route.endsWith("page") ? "tsx" : "ts"}`), pages: [],
});
const manifest = JSON.parse(await readFile(`${output}/server/app-paths-manifest.json`, "utf8"));
for (const route of routes) assert(manifest[route], `Missing route: ${route}`);
const trace = JSON.parse(await readFile(`${output}/server/app/api/ai/role-model/distill-skill/route.js.nft.json`, "utf8"));
for (const file of ["nuwa/SKILL.md", "nuwa/references/skill-template.md", "nuwa/references/extraction-framework.md"]) {
  assert(trace.files.some((name) => name.endsWith(file)), `Missing deployed Nuwa guide: ${file}`);
}
console.log("Verified: Mind Council page, APIs, and Nuwa guide deployment trace.");
