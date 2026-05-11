// Minimal Node ESM resolver hook that rewrites `@/…` path-alias imports to
// absolute paths inside `src/…`. Used by our lightweight test scripts so
// they can import project modules that reference the alias directly.
//
// Usage:
//   node --experimental-strip-types --import ./scripts/test-node-alias-resolver.mjs \
//     scripts/test-knowledge-classify.ts
//
// We stay dependency-free: Node's `resolve` hook receives the specifier and
// lets us redirect before the default resolver runs.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./test-node-alias-resolver-impl.mjs", import.meta.url);
