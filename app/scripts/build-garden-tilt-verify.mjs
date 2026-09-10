import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import nextBuild from "next/dist/build/index.js";
import { Bundler } from "next/dist/lib/bundler.js";

// Loopback-only optimized fixture build. Never deploy this output.
// Next's compile/generate modes skip its global TypeScript pass, so require the
// Garden entrypoints and their complete transitive source imports to pass first.
const requestedMode = process.argv[2];
if (!requestedMode) {
  let listening = false;
  try { listening = !!execFileSync("lsof", ["-nP", "-iTCP:3146", "-sTCP:LISTEN"], { encoding: "utf8" }).trim(); } catch { /* No process on the fixture port. */ }
  assert(!listening, "Stop the local preview on port 3146 before rebuilding: a running Next server caches old chunks.");
}
if (!requestedMode) execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "--project", "tsconfig.sky-garden-verify.json", "--noEmit", "--pretty", "false"], { stdio: "inherit" });
process.env.NEXT_OUTPUT_DIR = ".next-tilt-verify";
process.env.NEXT_PUBLIC_DEV_LOGIN_BYPASS = "true";
process.env.NEXT_PUBLIC_HIDE_DEV_LOGIN_BYPASS = "false";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:4346";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "local-garden-fixture-only";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "local-garden-fixture-only";
console.log("TEST-ONLY optimized Garden build with loopback fixture services. Do not deploy.");
if (requestedMode === "serve" || requestedMode === "dev") {
  // Authenticate the two isolated test identities without weakening production
  // middleware. Real auth/session verification is outside this fixture's scope.
  const identities = new Set(["00000000-0000-4000-8000-000000000071", "00000000-0000-4000-8000-000000000072"]);
  const auth = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    try {
      const token = (request.headers.authorization ?? "").replace(/^Bearer /, "");
      const claim = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
      if (request.url !== "/auth/v1/user" || !identities.has(claim.sub) || !token.endsWith(".fixture")) throw new Error("Not a fixture identity");
      response.end(JSON.stringify({ id: claim.sub, email: "garden-preview@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} }));
    } catch { response.statusCode = 401; response.end(JSON.stringify({ message: "Isolated preview account required" })); }
  });
  auth.listen(4346, "127.0.0.1"); await once(auth, "listening");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...(requestedMode === "dev" ? ["dev", "--webpack"] : ["start"]), "--hostname", "127.0.0.1", "--port", "3146"], { stdio: "inherit" });
  const stop = () => { server.kill("SIGTERM"); auth.close(); };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  const [code] = await once(server, "exit"); auth.close(); process.exit(code ?? 0);
}
const routePaths = { app: ["/[locale]/(protected)/garden/page.tsx", "/[locale]/(protected)/dashboard/page.tsx", "/[locale]/(protected)/settings/page.tsx", "/api/garden/pets/route.ts"], pages: [] };
// The installed Next 16 build entrypoint accepts route-relative paths; the CLI
// categorizer does not correctly match this repo's src/app path for this version.
if (requestedMode === "compile" || requestedMode === "generate") {
  await nextBuild.default(process.cwd(), false, false, false, false, false, false, Bundler.Webpack, requestedMode, undefined, routePaths);
} else {
  // Next holds its build lock until process exit; separate child processes are required.
  for (const mode of ["compile", "generate"]) execFileSync(process.execPath, [fileURLToPath(import.meta.url), mode], { stdio: "inherit" });
}
const manifest = JSON.parse(await readFile(".next-tilt-verify/server/app-paths-manifest.json", "utf8"));
assert(manifest["/[locale]/(protected)/garden/page"], "Garden route missing from optimized output");
console.log("Verified: optimized Garden route emitted; scoped TypeScript passed.");
