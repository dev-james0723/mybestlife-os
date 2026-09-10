# Weather place-name and Live Radar repair receipt

Date: 2026-09-08
Execution state: `candidate_ready` — validated locally; not pushed or deployed

## Requested outcome

- Show the real resolved place name after GPS selection; never use `Current location` as the weather-card heading.
- Remove the `API KEY REQUIRED` watermark from Live Radar.

## Input contract

- Device selection supplies latitude and longitude only; the GPS path must resolve a human-readable place before committing display state.
- Manual search supplies a named `WeatherLocation` and must remain a manual selection.
- Place-name candidates may come from reverse geocoding, the current-weather provider's city/country, or a real city attached to the coordinate record.
- Empty values and generic `Current location` values are invalid place names.
- Radar input is RainViewer's public frame index plus its official basemap and radar tile URLs; no CARTO API key or CARTO tile request is permitted.
- Stale asynchronous responses must not overwrite a newer manual or GPS selection.

## Confirmed root causes

1. The deployed GPS path stored the placeholder `Current location` as the location name and later treated the GPS selection as a manual selection. That produced the exact screenshot combination: `Current location` plus `Using selected location`.
2. Production still serves a restrictive `Permissions-Policy` with `geolocation=()`.
3. The deployed radar basemap still uses CARTO's retired keyless `dark_all` tile URL. CARTO now returns a map tile with `API KEY REQUIRED` baked into the image pixels.
4. The prior weather repair was present only in the dirty local workspace and had not been deployed.

## Implemented candidate

- Added a single real-place resolver with this fallback order: reverse-geocoded place, current-weather provider city, then an actual city already attached to the coordinates.
- Explicitly rejects generic `Current location` values. If no genuine place name can be resolved, the UI returns a retryable location-name error instead of displaying the placeholder.
- GPS controls now pass device coordinates through the GPS flow and retain `precision: "gps"`; manual search remains `precision: "manual"`.
- Updated the browser permissions header to `geolocation=(self)`.
- Replaced the CARTO basemap with RainViewer's official keyless dark basemap.
- Updated radar overlays to RainViewer's currently supported Universal Blue color scheme (`2`) and made the frame adapter work when the discontinued `nowcast` field is absent.
- Preserved map recentering when the selected location changes.

The production candidate was assembled from committed `HEAD` plus only the scoped weather files at:

`/private/tmp/mybestlife-weather-deploy.LsIQOL`

No unrelated dirty-worktree changes are present in that candidate.

## Output contract

- A successful GPS selection renders a real place-name heading and the `Using GPS location` badge.
- A successful manual selection renders the selected place name and the `Using selected location` badge.
- The exact generic heading `Current location` is never rendered as a successful weather location.
- If coordinates are available but no real place name can be resolved, the weather view enters a retryable error state rather than presenting a false label.
- Live Radar renders a clean dark basemap, available precipitation frames, and required provider attribution, with zero CARTO requests.
- The map marker and view recenter when the active coordinates change.
- This receipt's current output is a locally validated, isolated deployment candidate. It is not a live production result until an explicitly approved Vercel deployment succeeds and the public URL is revalidated.

## Validation evidence

### Automated checks

- Targeted Vitest: 4 files, 18 tests passed.
- Focused ESLint with zero warnings: passed.
- TypeScript typecheck: passed.
- `git diff --check`: passed.
- Full workspace production build: passed; 192 static pages generated.
- Clean isolated candidate production build: passed; TypeScript and 192 static pages generated.

### Mobile browser check

Execution: local browser fixture only; no account or production writes.

- Viewport: 390 × 844 at 2× device scale.
- Both `Use my location` controls exercised.
- Heading resolved to `Indianapolis, Indiana`.
- Status resolved to `Using GPS location`.
- Exact `Current location` heading absent.
- CARTO requests: 0.
- RainViewer requests: 17.
- Successful RainViewer PNG responses: 11.
- Horizontal mobile overflow: none.
- Browser page errors: none.

Artifacts:

- `artifacts/weather-fix-2026-09-08/browser-result.json`
- `artifacts/weather-fix-2026-09-08/mobile-live-radar.png`
- `artifacts/weather-fix-2026-09-08/mobile-weather-page.png`

## Commands run

```bash
cd /Users/ouxianxing/My_life_os/app
npm test -- src/lib/weather/openweather-geolocation.test.ts src/lib/weather/permissions-policy.test.ts src/lib/weather/location-display.test.ts src/lib/weather/rainviewer.test.ts
npx eslint --max-warnings=0 <scoped weather files and browser verifier>
npm run typecheck -- --pretty false
node scripts/verify-weather-location-radar.mjs

cd /Users/ouxianxing/My_life_os
git diff --check
npm run build

cd /private/tmp/mybestlife-weather-validate.joTrBR
npm run build
```

## Not done and next gate

- No Git push was performed.
- No Vercel production deployment was performed.
- The public site therefore still serves the stale implementation until the user explicitly approves the isolated weather-only production deployment.
- After deployment, verify the live response has `geolocation=(self)`, hard-refresh the iPhone page, exercise both GPS buttons, and visually confirm the real place name and clean radar tiles.

## Residual risks

- RainViewer's free public tiles are best-effort and rate-limited. The implementation caches frame data while the panel is mounted and uses the provider's current supported scheme.
- Automated Chrome emulation validates the mobile layout and network behavior but does not replace a final iPhone Safari GPS-permission check after deployment.
- The globally installed Vercel CLI is older than the current release; the repository's deployment workflow uses `npx --yes vercel@latest` to avoid relying on it.
