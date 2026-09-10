# Weather Location Controls Handoff

## Goal

Restore both user-initiated location controls on the Weather page:

- the location button beside the city or district search input;
- the locate button in the Weather Live Radar toolbar.

## Inputs and scope

The implementation uses the browser Geolocation API only after the user presses a location control. Access is restricted to the same origin by the application Permissions Policy. Existing manual city search and the user-owned RainViewer basemap change remain in place.

## Workflow and output

1. Allow same-origin geolocation in `app/next.config.ts`.
2. Request a fresh, high-accuracy position with no cached maximum age.
3. Route both controls through one permission-aware locating flow.
4. Recenter the radar immediately with the returned coordinates.
5. Refresh weather data for the same GPS coordinates and reverse-geocode the display location.
6. Reject stale weather responses so an older request cannot replace the GPS result.
7. Surface locating, success, denied-permission, unavailable-position, timeout, and insecure-connection states.

## Files changed

- `app/next.config.ts`
- `app/src/app/[locale]/(protected)/weather/page.tsx`
- `app/src/components/weather/WeatherLocationSearch.tsx`
- `app/src/components/weather/WeatherRadarInner.tsx`
- `app/src/components/weather/WeatherRadarPanel.tsx`
- `app/src/components/weather/WeatherTopBar.tsx`
- `app/src/hooks/weather/use-weather-page.ts`
- `app/src/lib/i18n/weather-ui.ts`
- `app/src/lib/weather/openweather.ts`
- `app/src/lib/weather/openweather-geolocation.test.ts`
- `app/src/lib/weather/permissions-policy.test.ts`

## Validation evidence

- `npm test -- src/lib/weather/openweather-geolocation.test.ts src/lib/weather/permissions-policy.test.ts`: 2 files passed, 11 tests passed.
- Focused ESLint across all changed Weather and configuration files: passed.
- `npm run typecheck -- --pretty false`: passed.
- `npm run build`: full production build passed after the core fix; final concurrency hardening subsequently passed tests, ESLint, and typecheck.
- Browser smoke check at `/en/weather`: both controls entered the shared locating state, disabled duplicate clicks, showed user feedback, and recovered after the unavailable-location path.
- `git diff --check`: passed.

## Failure recovery

If the user denies permission, the page reports that browser location access is blocked and allows a retry after the permission is changed. If the browser does not answer, an application watchdog resolves the attempt after 15 seconds and restores both controls. Late callbacks and stale weather requests are ignored.

## Execution state and handoff

This is a real local implementation and validation, not a mock or dry run. No precise device location was granted during validation, and no production deployment, GitHub push, database change, or external publication was performed. A live-device success check should be run over HTTPS after deployment approval.
