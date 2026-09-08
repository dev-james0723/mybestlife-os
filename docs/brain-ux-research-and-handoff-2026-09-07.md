# Brain workspace: research, repairs and verification

Date: 7 September 2026. Execution state: **local implementation and local browser fixtures**. No commit, push, deployment, migration, production-data write or paid AI request was performed.

## Outcome and interaction model

The Brain is now a graph-first workspace, using the application's existing typography, color tokens, rounded surfaces and light/dark themes. Search and the three view modes stay visible. Filters, legend, node browsing, suggestions and details are optional panels instead of permanently competing with the graph.

The important wide-view requirement has two controls:

- **Focus mode** fills the browser window, including phone/tablet landscape, without unmounting the graph. It preserves camera zoom and the simulation's node positions. Modern browsers use the top layer so the application's transformed shell and floating controls do not cover the graph.
- **Fullscreen** uses the native browser API and keeps the toolbar and panels inside the fullscreen element. If native fullscreen is rejected/unavailable, it falls back to Focus mode. Exit controls and Escape remain available; selecting a result does not exit the workspace.

The redesign-existing-projects skill guided reuse of the existing visual system and progressive disclosure. The browser-verification skill guided responsive screenshots and complete interaction paths, not just checking that a canvas appears.

At the user's follow-up request, the Three.js Debug Profiler skill and its playbook were read and applied to render-loop ownership, resize/DPR, disposal, and repeated grouping changes. Its disposal checklist identified a missing edge-geometry cleanup in the sphere. The general `three` skill was also inspected, but it targets deterministic HyperFrames video timelines rather than this interactive application, so its video adapter was not introduced.

## Research and decisions

This was documentation/source research, not a hands-on benchmark of paid competitors. The following are verified product or technical patterns; the proposed applications are design judgments for this codebase.

| Reference | Relevant pattern | Applied here |
| --- | --- | --- |
| [Obsidian Graph view](https://obsidian.md/help/plugins/graph) | Global/local graphs, adjustable local depth, filters, groups, label threshold, keyboard zoom/pan | Keep Overview and Neighborhood distinct; expose depth 1–3 and connection filters; offer keyboard navigation and progressive labels. |
| [Heptabase interface logic](https://wiki.heptabase.com/user-interface-logic) | Search across information, reference cards in a side panel, card metadata separated from the whiteboard | Keep the graph visible while inspecting information; let users choose a search result rather than moving the camera on every keystroke. |
| [Neo4j Bloom card list](https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/card-list/) | A synchronized list complements the graph, including selection and neighborhood exploration | Add a searchable, keyboard-operable node list, with selected state and connection counts. This is an alternative to precise canvas picking. |
| [Logseq's networked-thinking guide](https://blog.logseq.com/how-to-get-started-with-networked-thinking-and-logseq/) | Linked context and focused exploration support understanding, not just a large network overview | Make the local neighborhood an explicit task-oriented mode and preserve context when selecting connected nodes. This older guide is conceptual evidence, not a current mobile-performance claim. |
| [D3 force simulation](https://d3js.org/d3-force/simulation) | Simulations cool and can stop/restart; static work need not continue indefinitely | Reheat physics for actual graph-data changes, not selection; stop continuous idle painting. |
| [react-force-graph API](https://github.com/vasturiano/react-force-graph) | Canvas rendering, auto-pause, camera methods, picking callbacks and force controls | Retain the installed 2D engine. Repair unsupported double-click wiring and use its existing zoom/fit API; avoid a high-risk rendering-library migration. |
| [Sigma data architecture](https://www.sigmajs.org/docs/advanced/data/) and [rendering layers](https://www.sigmajs.org/docs/advanced/layers/) | Separate graph data from visual display state; draw graph and interaction layers independently | Stabilize simulation arrays across highlight/selection changes. Keep a future worker/WebGL migration as a measured scaling option, not a prerequisite for these repairs. |
| [MDN Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) and [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) | Fullscreen requires explicit browser support/permission; gesture ownership must be intentional | Use a fullscreen fallback, viewport measurement and graph-scoped touch gestures. Never force device orientation. |

Roam was also considered as a networked-notes reference, but its public site did not provide enough accessible current implementation detail to support specific mobile or performance comparisons. No such claims are made here.

## Defects repaired

| Priority | Observed code problem | Repair |
| --- | --- | --- |
| P1 | Closing the inspector immediately reopened it through an effect dependent on `inspectorOpen`. | Details dismissal is independent from selection. Opening only follows an explicit selection or details action. |
| P1 | Mobile details expanded by default and could take most of the viewport. | Collapsed node dock by default, explicit expand/collapse/close, bounded scrollable body. |
| P1 | Fullscreen removed essential controls and forced a new camera fit. | Persistent workspace root, controls inside fullscreen, resize without camera reset. |
| P1 | Desktop/mobile filter presentation conflicted and could block the page. | A single inline panel inside the workspace, responsive width and internal scrolling. |
| P1 | Clear filters left domain visibility, density and search active. | One complete visibility reset; search and its filter representation are synchronized. |
| P1 | Search auto-selected the first result while typing and local search could not reach nodes outside the neighborhood. | Search highlights without changing selection; explicit keyboard/pointer choice; results come from the filtered overview. |
| P1 | Selection replaced simulation arrays and reheated force layout; viewport changes could refit the camera. | Reuse settled coordinates and pin positions; only data changes reheat; camera-fit callbacks use live viewport refs. |
| P1 | Small 2D graphs continued repainting indefinitely; dense interaction work remained expensive. | Event-driven drawing, bounded settling ticks, lighter drawing during gestures, one full-quality repaint after gestures. |
| P1 | Fixed minimum canvas dimensions clipped short/narrow viewports. | ResizeObserver uses actual available dimensions, batched per animation frame. |
| P1 | Reduced-motion 3D still rotated, and rotation-off still rendered every frame. | Rotation off by default; reduced motion prevents ambient spin; skip unchanged WebGL renders; pause when the document is hidden. |
| P1 | Spreading two fingers increased the 3D camera radius and zoomed out instead of in. | Invert the span ratio for both full-sphere and neighborhood camera orbits; test outward and inward gestures plus invalid spans. |
| P2 | WebGL support detection repeatedly created contexts. | Cache the probe result and release the probe context. |
| P2 | Three.js graph rebuilds removed edge objects without disposing their geometry; node resources lacked a content-effect unmount cleanup. | One ownership-scoped cleanup disposes both edge buffers, materials, textures and caches on regrouping and unmount, while preserving Three.js's shared sprite geometry. |
| P2 | `onNodeDblClick` was not an installed 2D library callback. | Handle click detail through the supported node-click callback. |
| P2 | Initial fit occurred before physics settled, leaving the eventual graph cropped. | Fit after the initial engine stops, unless the user has already interacted. |
| P2 | Initial loading ended after the first query completed, causing misleading empty/error states. | Distinguish initial pending data, genuinely empty data, partial failure and full failure; preserve retry. |
| P2 | A newly allocated error array retriggered warning logs during camera updates. | Depend on a stable error summary and limit diagnostic warnings to development. |
| P2 | Canvas-only picking/search had poor keyboard access. | Search combobox, result keyboard navigation, node list, graph zoom/pan keys, visible focus styles and larger touch hit targets. |
| P2 | Several controls and panels did not follow page theme/localization conventions. | Token-based surfaces, improved light-mode text, English/Traditional Chinese workspace copy and touch-sized controls. |
| P2 | Career decisions/network entities used a visual alias to choose the wrong Open destination. | Read original source metadata before visual type; respect hidden Finance/Health/Notes routes. |

## Files changed for this work

- `app/src/app/[locale]/(protected)/brain/page.tsx`: responsive page sizing and removal of the old conflicting map wrapper.
- `app/src/components/brain/BrainView.tsx`: workspace orchestration, fullscreen, panels, selection, search and load/error states.
- New `BrainWorkspaceToolbar.tsx`, `BrainWorkspacePanels.tsx`, `brain-workspace.module.css`, `useBrainCopy.ts` in that component directory.
- `BrainCanvas.tsx`, `BrainSphere3D.tsx`, `BrainSphere3DInner.tsx`: rendering lifecycle and performance changes.
- `BrainDetailPanel.tsx`, `BrainFilters.tsx`, `BrainLegend.tsx`, `SphereFocusZoomControls.tsx`: responsive/accessibility/copy fixes.
- `app/src/components/knowledge/constellation/ConstellationCanvas.tsx`: shared simulation/picking/viewport fixes; Brain opts into the new idle performance mode. Other consumers retain their previous default drawing policy.
- `app/src/stores/brain-store.ts` and new `brain-store.test.ts`: recovery and state regression coverage.
- `app/src/hooks/use-brain-queries.ts`: initial-loading predicate only.
- `app/src/lib/brain/sphereFocusZoom.ts` and new `sphereFocusZoom.test.ts`: correct pinch direction and regression tests.
- New `app/scripts/verify-brain-ux.mjs` and `app/scripts/build-brain-verify.mjs`: repeatable browser/build validation.
- `app/.gitignore`: ignore task-specific `.next-brain-*` build output, including test-access-enabled profiling builds. Existing ignore rules were preserved.

The repository contains many unrelated pre-existing/concurrent changes. They were preserved. No broad clean-up, dependency change or global visual-system rewrite was undertaken.

## Validation and evidence

The browser uses the real local app and graph renderers, but isolated synthetic Supabase rows and auth responses. Database writes are rejected by the fixture router. It is not proof of live account data, realtime subscriptions or AI persistence.

- Fixture screenshots and machine-readable results: `artifacts/brain-ux-2026-09-07/`.
- Baseline: `before/phone.png`, `before/desktop.png`, `before/results.json`.
- Earlier acceptance run: `verified/results.json`, six regular viewport screenshots, six focused viewport screenshots, dark/Traditional Chinese, empty/error/retry, large-graph and 3D cases.
- State retest after repairing synthetic auth fixture setup: `states-verified/results.json` (all seven cases passed). The six responsive interaction cases in `verified/results.json` passed; its older state failures are superseded by this explicit retest, not hidden.
- Production-optimized repeat: `production-verified/results.json` records 14 passing scenarios and one real remaining defect: reversed 3D pinch direction. That defect was repaired, with a separate explicit retest recorded below; the original failure evidence is retained. These runs use a Brain-only, test-access-enabled build served on loopback, with out-of-scope route prefetches and favicon requests intercepted. They test production rendering, not real login or navigation to other feature pages.
- **Final acceptance authority: `production-final/results.json`, all 15 scenarios passed**, with no unexpected console/page errors, no interaction assertion failures and no page overflow. This is a full repeat after the pinch repair, not only a retest of the failing case. Final screenshots are in the same directory; start with `production-final/focus-844x390.png`.
- Standard fixture: 120 tasks, six projects, six goals, plus generated anchors (142 rendered nodes). Stress fixture: 900 tasks plus projects/goals/anchors.
- Viewports: 390×844, 844×390, 768×1024, 1024×768, 1280×720, 1440×900.
- Baseline idle 2D canvas clears over two seconds: phone 38, desktop 40. After settling: 0 in the repeat viewport checks. This is a draw-count observation, not a device FPS/battery benchmark. The baseline fixture initially reported a partial source warning, so layout/load-time numbers are not a controlled before/after benchmark.
- Focus mode checks assert full viewport dimensions, the same canvas DOM node and unchanged zoom; native/fullscreen-rejection paths both exercise settings after expansion.
- Browser checks exercise search Enter, clear search, node list selection, local depth, details dismissal, keyboard zoom/pan, 3D reduced-motion idle and 3D zoom, unsupported WebGL return to Overview, and failure/partial-failure retry.

Commands (from `app/`):

```sh
npx eslint src/components/brain src/components/knowledge/constellation/ConstellationCanvas.tsx src/stores/brain-store.ts src/stores/brain-store.test.ts 'src/app/[locale]/(protected)/brain/page.tsx' src/hooks/use-brain-queries.ts src/lib/brain/sphereFocusZoom.ts src/lib/brain/sphereFocusZoom.test.ts
npm run typecheck
npm run test -- src/stores/brain-store.test.ts src/lib/brain/brainLayout.test.ts src/lib/brain/sphereFocusZoom.test.ts src/lib/knowledge/constellation
node node_modules/vite-node/vite-node.mjs --config vitest.config.ts scripts/test-brain-engine.ts
BRAIN_VERIFY_PHASE=verified BRAIN_VERIFY_EXTENDED=1 node scripts/verify-brain-ux.mjs
node scripts/build-brain-verify.mjs
BRAIN_VERIFY_PROFILE=1 BRAIN_VERIFY_PROFILE_DIR=.next-brain-profile-final node scripts/build-brain-verify.mjs
NEXT_OUTPUT_DIR=.next-brain-profile-final node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3110
BRAIN_VERIFY_URL=http://127.0.0.1:3110 BRAIN_VERIFY_PHASE=production-final BRAIN_VERIFY_EXTENDED=1 BRAIN_VERIFY_SCOPED_BUILD=1 node scripts/verify-brain-ux.mjs
```

The targeted Vitest tests passed (11 tests across four files); the existing Brain engine runner passed all 10 assertions through installed Vite Node. The package's direct `npm run test:brain` command fails under the available Node 24/25 module loader, so that failure is not called a test pass. Focused ESLint passed with no findings.

Build verification includes an explicit route-manifest assertion. Next 16.2.6's CLI debug-path categorizer ignores `src/app` prefixes, and an apparently successful /404-only build does **not** validate Brain. The dedicated local script supplies the installed build entrypoint with the actual route-relative path and checks that the Brain route was emitted. This is a validator workaround, not a production framework patch.

## Remaining limits and next steps

1. Physical iPhone/iPad Safari testing remains necessary. Chrome touch/high-DPI emulation, native fullscreen and an intentionally rejected fullscreen request are covered; this does not establish physical-device FPS, thermal behavior or every Safari version. Browsers without both the Popover and Fullscreen APIs can have a less complete focus-mode fallback inside transformed shells.
2. AI suggestion generation, accepting/rejecting suggestions, persisted manual connections and live realtime behavior were not executed against production. The existing resolver is retained and reachable; credentials/billing/database semantics were not changed.
3. The existing engine still caps overview nodes at 1,200 on narrow screens and 3,500 on desktop, and densely connected graphs thin rendered edges during interaction. Search is within loaded/filtered graph data, not an unbounded server search. A server-backed search and explicit cap disclosure are sensible follow-ups for very large accounts.
4. A node list improves access, but this is not a formal WCAG/screen-reader certification. Some legacy resolver/3D explanatory text and taxonomy labels remain English; full localization and platform-specific assistive-technology checks should follow.
5. Keep 2D the default. Further gains for several thousand nodes should be based on a physical-device profile; candidate next work is worker-based graph construction, cached background drawing and measured rendering budgets. Do not add a new engine solely to resemble a competitor.
6. Review the focused phone-landscape screenshot first, then try the same flow on a physical tablet with real account data. Deployment/push requires explicit approval.
7. The application's global floating capture button and pet remain visible in the normal page shell and can overlap the footer area. Focus/fullscreen lifts the complete Brain workspace above them. Their application-wide placement was not changed in this scoped redesign.

### Final validation receipt

- Focused ESLint: **PASS**, no findings.
- Focused Vitest: **PASS**, 11 tests across state recovery, layout, animation and pinch direction.
- Brain engine assertions via installed Vite Node: **PASS**, 10/10.
- Production Brain route build: **PASS** (network access approved for Google Fonts). Compiler, scoped TypeScript check, static generation and explicit Brain route-manifest assertion completed.
- Whole-repository `npm run typecheck`: **FAIL outside Brain**. Three `RelationshipInsert` argument errors in `app/src/lib/repositories/relationships-compatibility.test.ts`, lines 13, 19 and 24. No Brain errors were reported. Unrelated changes were not altered.
- Browser acceptance repeat run: **PASS, 15/15 scenarios**, including six responsive viewports, dark/Traditional Chinese, 922-node stress data, empty and retry states, three sphere cases and filter/recovery actions. Final artifact: `artifacts/brain-ux-2026-09-07/production-final/results.json`.
- Final Three.js browser gesture check: zoom **41% → 99%** when fingers spread, then **99% → 41%** when fingers come together. Both outer and focused orbit calculations also have a shared unit-tested pinch helper.
- Task-only test servers on ports 3107–3110 stopped after verification; the pre-existing development server was left alone. Temporary Brain build includes were removed from `tsconfig.json`, preserving unrelated user changes. Build outputs and earlier failure evidence were retained, not deleted.
- No push or deployment. No physical-device or live AI/persistence claim.

The available shells use Node 25 (a bundled Node 24 is also available), not the project's requested Node 22. The successful build/test runtime is therefore not a Node 22 parity check. Doctor was run before implementation; no dependency/runtime upgrade was performed.

Deployment tooling note: the Vercel plugin reports CLI 54.18.3 is outdated versus 59.11.7 and recommends `npm i -g vercel@latest` before a future deployment. No global upgrade was performed, and it was not required for these local checks.

### Three.js profiling method

The profiler-driven regression repeatedly alternates sphere grouping with edges enabled at 1024×768, emulated touch/DPR 3 and reduced motion. WebGL `createBuffer`/`deleteBuffer` and texture ownership are tracked using object sets, not guessed from JS heap usage. The before-cleanup production renderer accumulated 6, 8, 10, 12, 14 and 16 live buffers through six grouping changes; textures alternated consistently between 9 and 12. That isolates an edge-buffer disposal defect rather than a texture-growth problem. The baseline run also caught a one-pixel fractional CSS/drawing-buffer rounding difference (the final resize assertion allows one pixel) and unrelated prefetch 404s from the intentionally Brain-only build. These fixture issues are not counted as Brain rendering regressions.

After cleanup, the final optimized renderer held **4 live buffers through all six grouping changes**, with textures still alternating between 9 and 12. The sphere drawing buffer followed the focused viewport with coarse-pointer DPR capped at 1 (1022×644 buffer against a 1022×645 rounded CSS box). Reduced-motion idle rendered **0 WebGL clears over two seconds**, while the explicit zoom action did redraw. These measurements show the targeted fixes; they are not a physical-device FPS or total-memory benchmark.

Optimized profiling builds were generated with `BRAIN_VERIFY_PROFILE=1`, include test-only page access, and must **never** be deployed. They are separate from normal build output and are served only on `127.0.0.1`. No application environment file or production access setting was changed.
