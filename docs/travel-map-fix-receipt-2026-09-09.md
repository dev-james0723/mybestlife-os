# Travel map repair — local release candidate

The 2D Map tab now renders a usable basemap when the Google session is missing, rejected, malformed, stalled, or unavailable. This includes the screenshot's zero-dreams case. Pan, zoom, status filters, saved destination markers, and flight routes remain available.

## Cause and repair

The previous implementation waited for a successful Google session before creating Leaflet. Failure replaced the whole map with a decorative grid. The session endpoint also preferred a private Places key, while the browser preferred a different public Maps key. That mismatch is confirmed in the source; the exact live Google rejection was not inspected.

The map now starts independently with the same RainViewer basemap service already used by Weather. Google tiles replace it only once successfully loaded. Both session creation and tile requests consistently prefer the public Tiles key, then the public Maps key. The private Places key is never used for this flow. Network requests and tile loading have bounded waits, failures retain the working basemap, and total outages expose Reload map.

Map teardown aborts the pending session, clears timers, disconnects the resize observer, and removes Leaflet layers before detaching their cleanup listeners. Immediate zoom avoids Leaflet 1.9's delayed zoom callback accessing disposed panes on tab changes. Async initialization uses the latest destination data.

## Candidate and files

Release candidate base: `d467ab83f2a949f7738b01d6c99aa2bfc09092bb`.

Candidate directory: `/private/tmp/travel-map-release-20260909`.

Reviewable patch: `artifacts/travel-map-fix-2026-09-09/release-candidate.patch`.

Exact files and SHA-256 hashes: `artifacts/travel-map-fix-2026-09-09/candidate-manifest.json`.

This run edited the map wrapper, map implementation, tile helper, and session API, and added `map-tiles-session/route.test.ts`. The isolated candidate also includes the existing Reload map fallback and its localization module, which these components require. It contains seven source files over the base commit. Other unfinished checkout changes are excluded. All seven files match the validated workspace sources.

The original working-tree diff of the relevant tracked files is preserved as `pre-existing.patch`. No existing source changes were reverted.

## Validation

Evidence directory: `artifacts/travel-map-fix-2026-09-09/`.

- Nine API/key-selection regression tests passed: `unit.log`.
- ESLint passed with no warnings: `lint.log`.
- Isolated candidate TypeScript passed: `candidate-typecheck.log`.
- Isolated optimized route build passed, explicitly asserting that Bucket List and the session API were emitted: `candidate-build.log`.
- Nine actual Next page/browser checks passed at mobile 390 × 844 and desktop 1440 × 1000: `page-results.json`. These used a fixture account and destinations, a deliberately rejected Google session, and real RainViewer tiles (33 successful responses). No account writes occurred.
- Ten React StrictMode recovery scenarios passed: `recovery-results.json`. These cover session rejection, network failure, malformed data, timeout, no public key, rejected/stalled Google tiles, successful tile replacement, and recovery after total tile rejection/stall. Google success uses fixture image responses; it is not a live Google verification.
- Zero uncaught browser errors in the final runs. Marker click/update, clearing a filter, and unmount/remount are covered.
- Source hash parity and diff whitespace checks passed: `validation.json`.

Preview: `mobile-empty-map.png`. Additional screenshots: `mobile-page.png`, `mobile-destinations.png`, and `desktop-destinations.png`.

The main checkout's first build compiled but hit a malformed generated `.next-map-fix-dev/dev/types/routes.d.ts`. The test server has been stopped and this run's generated TypeScript include entries removed. The isolated candidate avoids that generated file and passes compilation and TypeScript. A prior CLI route filter emitted no app route; it was discarded and replaced by the helper that asserts actual emitted routes. Neither incomplete attempt counts as a passing build.

`validation_unavailable`: WebKit/Safari automation, because the Playwright WebKit executable is not installed. Physical iPhone verification remains outstanding. Mobile Chrome viewport/touch checks are not a physical-iPhone test.

## Reproduce

Use Node 22 (verified 22.23.2) and npm. From `app/`:

```sh
npm run test -- src/app/api/travel/map-tiles-session/route.test.ts
node node_modules/eslint/bin/eslint.js src/components/bucket-list/travel-google-map.tsx src/components/bucket-list/travel-google-map-inner.tsx src/lib/bucket-list/google-map-tiles.ts src/app/api/travel/map-tiles-session/route.ts src/app/api/travel/map-tiles-session/route.test.ts
```

From the repo root, the browser harness and build validator are:

```sh
node artifacts/travel-map-fix-2026-09-09/recovery-check.cjs
MAP_BUILD_ROOT=/private/tmp/travel-map-release-20260909/app NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-build-placeholder node artifacts/travel-map-fix-2026-09-09/build-check.mjs
```

The actual-page harness is `page-check.cjs`. It requires a local Next dev server on port 3147 with placeholder Supabase settings and `NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY=local-test-tiles-key`; it intercepts account/data and Google session requests. The temporary server used for validation is stopped. `build-check.mjs` is a local, scoped route validator, not a deployment command or complete production deployment artifact.

## Remaining action

No push, deployment, migration, Google Cloud settings, billing changes, or global package installation was performed. The live website is unchanged. Deploy only after explicit approval, using the isolated seven-file candidate rather than the shared dirty checkout; then verify the signed-in Map tab on the live site and on the user's iPhone.

The backup basemap remains an external dependency. A total network/provider outage can still require Reload map; there is no offline map cache. Google detail still requires a valid, permitted key. The existing RainViewer service's availability/usage terms continue to apply.

The installed Vercel CLI is 54.18.3. Strongly recommend `npm i -g vercel@latest` before deployment for compatibility; no global upgrade was performed.

Reference documentation: [Google Map Tiles sessions](https://developers.google.com/maps/documentation/tile/session_tokens), [RainViewer API](https://www.rainviewer.com/api.html). Installed Next.js lazy-loading and route-build guides were used for the implementation and validator.

Pending approval reminder: `approve-map-fix-deployment` (current thread, every 15 minutes). Delete it immediately after approval/rejection or if deployment approval is no longer pending.
