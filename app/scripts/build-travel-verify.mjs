// Compile the actual Travel page and Places routes without building unrelated
// work in this shared checkout. Output is local and is never deployed here.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import nextBuild from 'next/dist/build/index.js';
import { Bundler } from 'next/dist/lib/bundler.js';
process.env.NEXT_OUTPUT_DIR = '.next-travel-verify';
await nextBuild.default(process.cwd(), false, false, false, false, false, false, Bundler.Webpack, undefined, undefined, {
  app: ['/[locale]/(protected)/bucket-list/page.tsx', '/api/travel/places/text/route.ts', '/api/travel/places/autocomplete/route.ts', '/api/travel/places/nearby/route.ts'], pages: [],
});
const manifest = JSON.parse(await readFile('.next-travel-verify/server/app-paths-manifest.json', 'utf8'));
for (const route of ['/[locale]/(protected)/bucket-list/page', '/api/travel/places/text/route', '/api/travel/places/autocomplete/route', '/api/travel/places/nearby/route']) assert(manifest[route], `Missing build route: ${route}`);
console.log('Verified: Travel page and all three Places routes emitted.');
