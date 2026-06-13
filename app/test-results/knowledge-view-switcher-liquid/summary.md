# MyBestLife OS Runtime Audit

Generated: 2026-06-13T14:23:30.804Z
Output: /Users/ouxianxing/My_life_os/app/test-results/knowledge-view-switcher-liquid
Routes checked: 1
Viewport checks: 4
Skipped dynamic routes: 0

| Route | Viewport | Motion | Status | Notes |
| --- | ---: | --- | --- | --- |
| /en/knowledge-base | 390 | no-preference | fail | Topbar search failed; Console errors: 2; Quick Capture clicked without detected layer; Clock tools clicked without detected layer |
| /en/knowledge-base | 1280 | no-preference | fail | Theme toggle failed; Console errors: 2; Quick Capture clicked without detected layer; Topbar search clicked without detected layer |
| /en/knowledge-base | 1440 | no-preference | fail | Page errors: 1 |
| /en/knowledge-base | 390 | reduce | warn | Console errors: 1 |

## Evidence Notes

- `pass`: no detected overflow, page errors, critical tap-target failures, or failed shell interactions.
- `warn`: route rendered but has non-blocking warnings, usually compact controls under 44px or missing optional shell triggers at a breakpoint.
- `fail`: route must not be marked `Verified` until failures are fixed or documented as unrelated.
