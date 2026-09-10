import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import ts from "typescript";

export async function hashPondSources(paths) {
  return Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
}

/** Record the local transitive input files, without reading environment values. */
export async function capturePondBuildSources() {
  const config = ts.readConfigFile("tsconfig.garden-verify.json", ts.sys.readFile);
  assert(!config.error, "Garden verification config must load");
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const program = ts.createProgram([...parsed.fileNames, resolve("src/app/[locale]/(protected)/dashboard/page.tsx")], parsed.options);
  const paths = new Set(program.getSourceFiles().map(file => relative(process.cwd(), file.fileName)).filter(path => !path.startsWith("..") && !path.startsWith("node_modules/")));
  for (const name of await readdir("src/components/garden")) if (name.endsWith(".css")) paths.add(`src/components/garden/${name}`);
  for (const path of ["package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "tsconfig.garden-verify.json", "src/app/globals.css", "src/app/project-design.css"]) paths.add(path);
  return hashPondSources([...paths].sort());
}

export async function verifyPondBuildSources() {
  const manifest = JSON.parse(await readFile(".next-pond-verify/garden-source-manifest.json", "utf8"));
  const current = await hashPondSources(Object.keys(manifest.sources));
  const changed = Object.keys(manifest.sources).filter(path => manifest.sources[path] !== current[path]);
  assert.deepEqual(changed, [], "Preview source changed since its build. Rebuild before claiming current browser validation.");
  return manifest;
}
