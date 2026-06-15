# Loading Optimization Evidence

## Baseline - 2026-06-14

Execution state: real local baseline, before code edits.

Node 22 note: the default shell `node` was `v25.9.0`, so the baseline build was run with a temporary official Node 22 binary at `/tmp/codex-node-v22.22.3-darwin-arm64/bin`. No repo package or lockfile changes were made for this.

### Commands

```bash
/tmp/codex-node-v22.22.3-darwin-arm64/bin/node -v
# v22.22.3
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run build --prefix app
# exit 0
# Next.js 16.2.6 (webpack)
# Compiled successfully in 80s
# Finished TypeScript in 56s
# Generated static pages: 189/189
```

Next build printed route names but did not print `Size` / `First Load JS` columns in this environment. The baseline therefore records the raw protected route rows from build output plus manifest-derived client chunk totals from the generated `page_client-reference-manifest.js` files.

### Build Route Rows

```text
├ ƒ /[locale]/daily-planner
├ ƒ /[locale]/dashboard
├ ƒ /[locale]/ideas
├ ƒ /[locale]/settings
├ ƒ /[locale]/tasks
```

### Static Chunk Size Check

Command:

```bash
find app/.next/static/chunks -type f -name '*.js'
```

Results:

```text
chunk_js_files: 489
chunk_js_total: 16,791.6 KiB
```

Largest JS chunks:

```text
892.3 KiB  static/chunks/7461-26d1c98eac5d5e5f.js
478.4 KiB  static/chunks/b055d1fb.f3bb412031b9dce4.js
419.9 KiB  static/chunks/5304-b9fc87402fcab381.js
414.7 KiB  static/chunks/6659-ab500a80a5e9c54b.js
374.9 KiB  static/chunks/app/[locale]/(protected)/layout-a13ebee2bc405b5c.js
363.5 KiB  static/chunks/bd904a5c.db11e8dd0ccca285.js
333.8 KiB  static/chunks/4172-887925a56f532378.js
325.3 KiB  static/chunks/b536a0f1.749ba99425f353bd.js
325.2 KiB  static/chunks/8187f03c-43e4b113b25a5848.js
323.2 KiB  static/chunks/app/[locale]/(protected)/knowledge-base/page-4575f72282a8b571.js
```

Font/media check:

```text
app/.next/static/media files: 34
observed generated font files: 31 .woff2 files before optimization
```

### Dashboard Client Manifest Baseline

Source: `app/.next/server/app/[locale]/(protected)/dashboard/page_client-reference-manifest.js`

```text
route: /[locale]/(protected)/dashboard/page
manifest unique client chunks: 63
manifest unique client JS: 3,565.7 KiB

root layout/providers/fonts: 11 chunks, 219.2 KiB
locale shell: 1 chunk, 5.5 KiB
protected layout/sidebar: 52 chunks, 3,252.1 KiB
dashboard page: 34 chunks, 1,267.8 KiB

dashboard route chunk: 90.5 KiB static/chunks/app/%5Blocale%5D/(protected)/dashboard/page-fe491792ba788330.js
protected layout chunk: 374.9 KiB static/chunks/app/%5Blocale%5D/(protected)/layout-a13ebee2bc405b5c.js
```

### Sampled Protected Routes Baseline

These routes share the protected app shell and will be compared after changes.

```text
route          unique chunks  unique client JS  route file
dashboard      63             3,565.7 KiB       90.5 KiB static/chunks/app/%5Blocale%5D/(protected)/dashboard/page-fe491792ba788330.js
daily-planner  61             3,629.8 KiB       191.5 KiB static/chunks/app/%5Blocale%5D/(protected)/daily-planner/page-cda3fdbe6cce9213.js
tasks          63             3,899.4 KiB       138.3 KiB static/chunks/app/%5Blocale%5D/(protected)/tasks/page-361bcf7c82a9c59f.js
settings       58             3,421.7 KiB       96.8 KiB static/chunks/app/%5Blocale%5D/(protected)/settings/page-60ec766b4a94c8d4.js
ideas          63             3,677.0 KiB       156.7 KiB static/chunks/app/%5Blocale%5D/(protected)/ideas/page-2ade9c98a55a16ee.js
```

### Initial Audit Notes

- `app/src/app/layout.tsx` registers eight Google font families globally. Only Geist sans/mono are global CSS defaults; Orbitron, Space Grotesk, Playfair Display, Lora, Fraunces, and DM Sans are theme/vault-specific.
- `app/src/components/providers.tsx` mounts `LiquidIconPreloader` for every route.
- `app/src/app/[locale]/(protected)/layout.tsx` imports `IdeaCaptureSheet`, `OSBuddyDock`, and `OSBuddyShortcutController` directly into the protected shell.
- `app/src/components/os-buddy/OSBuddyDock.tsx` is 3,540 lines and imports game overlays, AirPilot helpers, file-drop routing, reactions, stores, and background hooks before initial render.
- `app/src/components/app-sidebar.tsx` imports `framer-motion` and all liquid navigation icon machinery as part of the protected layout chunk.

## Post-Change Build - 2026-06-14

Execution state: real local build after scoped app-shell/dashboard changes.

### Commands

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run typecheck --prefix app
# exit 0
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run build --prefix app
# exit 0
# Next.js 16.2.6 (webpack)
# Compiled successfully in 69s
# Finished TypeScript in 70s
# Generated static pages: 189/189 in 1007ms
```

Build-time note: one intermediate cold rebuild after the chunking changes took 7.6min compile / 5.2min TypeScript. The final rebuild after cache settled was close to baseline on compile time, but build-time variance is a residual risk to monitor.

### Build Route Rows

```text
├ ƒ /[locale]/daily-planner
├ ƒ /[locale]/dashboard
├ ƒ /[locale]/ideas
├ ƒ /[locale]/settings
├ ƒ /[locale]/tasks
```

### Static Chunk Size Check

```text
chunk_js_files: 502
chunk_js_total: 17,071.0 KiB
```

Largest JS chunks:

```text
891.0 KiB  static/chunks/19842-0e7ee873e930f30b.js
478.4 KiB  static/chunks/b055d1fb.41d6a62cb620e680.js
414.7 KiB  static/chunks/76659-c7d86cfb49499825.js
410.6 KiB  static/chunks/85813-93faf7feb2d88801.js
363.5 KiB  static/chunks/bd904a5c.ad7f97cee09d92fc.js
333.8 KiB  static/chunks/24172-ecf36e54f5743aac.js
325.3 KiB  static/chunks/b536a0f1.7360b36ff808d55c.js
325.2 KiB  static/chunks/8187f03c-6f06ef34745f7da0.js
324.9 KiB  static/chunks/app/[locale]/(protected)/knowledge-base/page-e68325a3d1f51812.js
320.3 KiB  static/chunks/e6b68d76.ba26be29af844fc2.js
```

### Dashboard Client Manifest After

Source: `app/.next/server/app/[locale]/(protected)/dashboard/page_client-reference-manifest.js`

```text
route: /[locale]/(protected)/dashboard/page
manifest unique client chunks: 51
manifest unique client JS: 2,769.4 KiB

root layout/providers/fonts: 11 chunks, 222.3 KiB
locale shell: 1 chunk, 5.5 KiB
protected layout/sidebar: 37 chunks, 2,399.8 KiB
dashboard page: 30 chunks, 1,140.7 KiB

dashboard route chunk: 103.3 KiB static/chunks/app/%5Blocale%5D/(protected)/dashboard/page-a522d6e7e6002cc5.js
protected layout chunk: 85.4 KiB static/chunks/app/%5Blocale%5D/(protected)/layout-58524e042e82dd43.js
```

### Before / After Route Comparison

```text
route          baseline client JS  after client JS  delta
dashboard      3,565.7 KiB         2,769.4 KiB      -796.3 KiB (-22.3%)
daily-planner  3,629.8 KiB         3,007.4 KiB      -622.4 KiB (-17.1%)
tasks          3,899.4 KiB         3,251.8 KiB      -647.6 KiB (-16.6%)
settings       3,421.7 KiB         2,641.1 KiB      -780.6 KiB (-22.8%)
ideas          3,677.0 KiB         2,907.3 KiB      -769.7 KiB (-20.9%)
```

No sampled protected route regressed.

### Font Loading After

`app/.next/server/next-font-manifest.json` now lists only two preloaded app layout font files:

```text
static/media/22a5144ee8d83bca-s.p.woff2
static/media/7d4881bb7e1bf84d-s.p.woff2
```

Generated font files remain available for theme-specific CSS variables, but only Geist sans/mono are preloaded globally.

## Final Validation Receipt - 2026-06-14

Execution state: real local validation under Node 22.22.3 from `/tmp/codex-node-v22.22.3-darwin-arm64/bin`.

### Commands Run

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" node -v
# exit 0
# v22.22.3
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run lint --prefix app
# exit 0
# 147 warnings, 0 errors
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run typecheck --prefix app
# exit 0
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run test --prefix app
# exit 0
# 101 test files passed, 584 tests passed
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run build --prefix app
# exit 0
# Compiled successfully in 69s
# Finished TypeScript in 70s
# Generated static pages: 189/189 in 1007ms
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run start --prefix app -- -p 3000
# app served at http://localhost:3000 for runtime audit
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" npm run audit:app-runtime --prefix app
# validation_unavailable for protected-shell verification
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" NEXT_PUBLIC_DEV_LOGIN_BYPASS=true npm run start --prefix app -- -p 3000
# app served at http://localhost:3000 with dev bypass accepted for focused runtime audit
```

```bash
PATH="/tmp/codex-node-v22.22.3-darwin-arm64/bin:$PATH" node app/scripts/audit-liquid-glass-runtime.mjs --base=http://127.0.0.1:3000 --routes=/en/dashboard --viewports=390,1280 --element-click-limit=8 --timeout-ms=180000 --out=app/.next/liquid-glass-audit-dashboard
# exit 0
# Runtime audit complete: 3 checks, 0 fail, 2 warn.
```

### Runtime Audit Result

`npm run audit:app-runtime --prefix app` was attempted twice:

- First attempt exited `1` because no process was listening on `http://127.0.0.1:3000`; every route failed with `net::ERR_CONNECTION_REFUSED`.
- Second attempt ran against plain `next start` on port 3000. It reached the app, checked 21 routes / 61 viewport checks, then hit the script's 600000ms timeout. The generated summary shows protected routes redirecting to `/en/login` because the audit cookie is ignored unless the server is started with `NEXT_PUBLIC_DEV_LOGIN_BYPASS=true`; it therefore reported missing protected-shell controls instead of validating the optimized shell.
- Focused replacement check: with `NEXT_PUBLIC_DEV_LOGIN_BYPASS=true` on the server, `/en/dashboard` passed the runtime audit at 390px, 1280px, and 390px reduced-motion with 0 failures. The two remaining warnings are compact 24px carousel dot controls in the deferred signals widget.

Evidence:

```text
app/.next/liquid-glass-audit/summary.md
Generated: 2026-06-14T15:13:13.222Z
Routes checked: 21
Viewport checks: 61
Run incomplete: timeout budget reached after 600000ms.
Example note: Unexpected redirect: /en/analytics -> /en/login
```

The strongest completed checks for this change are the production build, typecheck, lint, test suite, build manifest chunk comparison, font manifest inspection, focused dashboard runtime audit, and the full runtime audit artifact proving the auth/env blocker for the package script.

### Files Changed

```text
app/src/app/[locale]/(protected)/dashboard/page.tsx
app/src/app/[locale]/(protected)/layout.tsx
app/src/app/layout.tsx
app/src/components/app-sidebar.tsx
app/src/components/liquid-icons/DeferredLiquidNavIcon.tsx
app/src/components/liquid-icons/LiquidIconPreloader.tsx
app/src/components/liquid-icons/LiquidNavIcon.tsx
app/src/components/protected-lazy-features.tsx
app/src/components/protected-scroll-layout.tsx
app/src/components/providers.tsx
app/src/components/signals/DashboardSignalsWidget.tsx
app/src/components/ui/sidebar.tsx
app/src/hooks/use-deferred-client-mount.ts
docs/performance/loading-optimization.md
```

### Residual Risks

- Full `audit:app-runtime` still needs a documented authenticated/dev-bypass server setup, or a route budget split, before the package script can verify every protected route end to end within 600000ms.
- Build time showed one large intermediate cold-build spike even though the final rebuild was close to baseline.
- Total emitted chunk JS increased slightly because more code is split into async chunks; first-load manifest totals are the primary metric improved here.

### Next Target

Next performance pass should focus on the largest remaining async/vendor chunks and on making `audit:app-runtime` start or document an authenticated dev-bypass session so protected-shell regressions can be validated directly.
