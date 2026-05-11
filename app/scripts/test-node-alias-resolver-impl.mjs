import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..", "src");

async function tryCandidates(candidates, context, nextResolve) {
  const fs = await import("node:fs/promises");
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    } catch {
      /* continue */
    }
  }
  return null;
}

/**
 * Rewrites `@/foo` → `<app>/src/foo` so tests can run against project modules
 * that use the Next-style path alias.
 *
 * Also handles extensionless relative imports (`./foo` → `./foo.ts`) so
 * pure modules that import each other without explicit extensions can be
 * loaded directly. Without this hook Node ESM rejects them with
 * `ERR_MODULE_NOT_FOUND`.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const candidates = [
      path.resolve(SRC_ROOT, `${rel}.ts`),
      path.resolve(SRC_ROOT, `${rel}.tsx`),
      path.resolve(SRC_ROOT, rel, "index.ts"),
      path.resolve(SRC_ROOT, rel, "index.tsx"),
      path.resolve(SRC_ROOT, rel),
    ];
    const out = await tryCandidates(candidates, context, nextResolve);
    if (out) return out;
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.(t|j)sx?$/.test(specifier) &&
    context.parentURL?.startsWith("file://")
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const baseAbs = path.resolve(parentDir, specifier);
    const candidates = [
      `${baseAbs}.ts`,
      `${baseAbs}.tsx`,
      path.join(baseAbs, "index.ts"),
      path.join(baseAbs, "index.tsx"),
    ];
    const out = await tryCandidates(candidates, context, nextResolve);
    if (out) return out;
  }
  return nextResolve(specifier, context);
}
