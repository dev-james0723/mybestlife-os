# Career UI Consistency Audit

Date: 2026-06-06

Scope: main and nested routes under `/career` in `app/src/app/[locale]/(protected)/career`.

Status values: `Pending`, `Partial`, `Verified`, `Deferred`, `Reference`.

| Route | Current component | Uses `PageShell` | Shared OS primitives | Title/header status | Main UX problem | Hidden states/modals/dropdowns to check | Mobile risks | Recommended fix | Final status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/career` | `career/page.tsx` with dashboard widgets | Yes | Yes, mixed with local widgets | Clear command-center title | Good base, but needs stronger “what next” orientation and route cards | Omnisearch trigger/dialog, widget empty/loading states | Widget stacking and search trigger width | Keep as command center, add clearer workspace guidance and shared metric/action patterns | Partial |
| `/career/compass` | `CareerCompassView` | Yes | Minimal | Uses submenu label and generic dashboard description | Too thin for strategic direction; does not explain hypothesis/blockers/next move | Profile thin state, identity map loading/empty state | Two large widgets can feel abrupt on small screens | Reframe as Career Compass with helper/status panels and honest profile-derived empty states | Partial |
| `/career/profile` | `CareerMirrorProfile` | Yes | Yes | Reference quality | Reference page; avoid regressions | Wizard launch, AI suggestions, profile controls, scenario simulator | Preserve existing polished responsive shell | Treat as visual reference; extract patterns only when safe | Reference |
| `/career/vault` | `VaultView` | No outer `PageShell` in component | Mixed; local header/control bar | Local breadcrumb title row | Feels like a local file manager rather than Career OS asset library | Upload modal, delete confirm, select menu, view toggle, category chips, quick access actions | Header actions and controls can crowd at 320px | Wrap in `PageShell`, use OS actions/control bar/metric cards, preserve upload/delete/star/download/detail flows | Partial |
| `/career/coach` | `CoachView` | Yes | Mixed; shadcn tabs/buttons | Breadcrumb variable is defined; header copy is too chat-like | Purpose is not explicit enough as prompt/action library | Custom prompt modal, delete confirm, tabs, filters, favorites, settings link | Tabs/category chips can wrap awkwardly | Clarify prompt-library purpose, use OS controls/chips/surfaces, preserve prompt use/favorite/edit/delete | Partial |
| `/career/pipeline` | `KanbanBoard` | No | Mostly local buttons/cards | Local breadcrumb title row | Kanban is exposed without workspace framing or summary | New opportunity modal, drag/drop stage change, opportunity links | Intentional horizontal scroll must be stable; empty columns lack help | Wrap in `PageShell`, add summary cards, stage guidance, empty state, and mobile-safe Kanban scroller | Partial |
| `/career/timeline` | `CareerTimeline` | Yes | Mixed; local filter chips/cards | `PageShell` can misresolve nested title as Career home in themed mode | Timeline purpose and sources are underexplained | Event modal, delete confirm, filters, generated rows | Filter chips and timeline cards can overflow | Fix title resolver, use OS filter chips/panels, add “what appears here” helper and strong empty CTA | Partial |
| `/career/network` | `NetworkGraph` | Yes | Mixed; raw SVG panel/local chips | Clear title but sparse explanation | Graph lacks legend and next-action framing | Add node modal, add edge modal, node detail panel, filters | SVG labels and controls need touch clarity | Add stats/legend/helper panels, OS chips/actions, preserve graph layout and node selection | Partial |
| `/career/journal` | `JournalView` | Yes | Mixed; local cards/buttons | Title says Decision Journal, should be Career Decision Journal | Reads like a list of notes, not a decision-improvement system | Decision form, review form, delete confirm, chart empty state | Card action cluster can crowd | Reframe as Career Decision Journal, improve cards, empty state, review CTA hierarchy | Partial |
| `/career/analytics` | `CareerAnalyticsView` | Yes | Mostly local chart cards | Clear title but sparse context | Charts lack interpretation and low-data guidance | Quarterly report generation/error, chart empty states | Chart labels/tables may squeeze | Add analytics helper context, consistent panels, low-data explanation, report CTA framing | Partial |
| `/career/vault/[fileId]` | `VaultDetailView` | No evidence of `PageShell` in route family | Mixed local vault detail components | Should use explicit detail title, not nav fallback | Detail route may drift from vault shell | Preview, download, edit metadata, upload version, delete/star actions | Preview/detail columns may overflow | Keep explicit detail title; align surfaces/actions where safe in later pass | Pending |
| `/career/vault/[fileId]/history` | `VersionTimeline` | No evidence of `PageShell` in route family | Mixed local version components | Explicit history title should win | Version history needs route-family consistency | Restore confirm, load more, version actions | Timeline/list density | Align with vault shell and PageShell in later pass | Pending |
| `/career/vault/[fileId]/compare` | `VersionCompareView` | No evidence of `PageShell` in route family | Mixed compare UI | Explicit compare title should win | Compare tool likely has local chrome | Version selectors, image divider, fallback previews | Side-by-side compare can overflow | Preserve tool behavior; add PageShell/breadcrumb treatment later | Pending |
| `/career/vault/bundles` | `BundlesList` | No evidence of `PageShell` in route family | Mixed bundle components | Explicit bundles title should win | Bundle library should feel attached to Vault | Create bundle, card actions, export/share/delete | Cards/actions can wrap | Align with vault subpage shell and OS empty states | Pending |
| `/career/vault/bundles/new` | `BundleWizard` | No evidence of `PageShell` in route family | Mixed wizard components | Explicit wizard title should win | Wizard is high-risk for layout regressions | Multi-step wizard, file selector, cover editor, export format | Stepper and file selection on mobile | Defer heavy wizard restyle until dedicated verification | Pending |
| `/career/vault/bundles/[bundleId]` | `BundleDetailView` | No evidence of `PageShell` in route family | Mixed bundle detail components | Explicit bundle title should win | Detail actions need shell consistency | Export, duplicate, share, delete | File list and actions | Align surfaces/actions in later pass | Pending |
| `/career/vault/shares` | `SharesDashboard` | No evidence of `PageShell` in route family | Mixed share components | Explicit shares title should win | Sharing dashboard needs vault context | Create share modal, access log modal, copy link, revoke/delete | Share cards and modals | Align with vault shell and OS dialogs later | Pending |
| `/career/vault/tags` | `TagManager` | No evidence of `PageShell` in route family | Mixed tag components | Explicit tags title should win | Tag maintenance is utility-heavy | Rename, merge, delete, autocomplete, view files | Search/actions wrap | Align utility surface and controls later | Pending |
| `/career/pipeline/[opportunityId]` | `OpportunityDetailView` | No evidence of `PageShell` in route family | Mixed pipeline detail components | Explicit opportunity title should win | Detail page may drift from new workspace frame | Edit/delete, add interaction, attach vault files, AI actions | Detail panels and forms | Keep behavior; align shell in later pass | Pending |
| `/career/coach/profile` | `CareerProfileEditor` | Yes | Mixed form controls | Explicit profile editor title should win | Form page should connect to Coach/Profile model | Save/cancel, form validation | Long form fields | Preserve flow; later align with shared Career help panels | Pending |
| `/career/coach/[promptId]/use` | `UseFlowView` | Yes | Mixed stepper/action controls | Explicit prompt-use title should win | Prompt workflow is high-risk and should not inherit wrong nav title | Variables, attachments, AI tool picker, preview/copy/dispatch | Stepper and preview can overflow | Fix title fallback, defer heavy visual changes until flow-specific audit | Pending |

Notes:

- The concrete title bug is in `PageShell`: it derives the themed title from only the first path segment, so `/career/timeline` can resolve through the `career` item label (`Home Page`).
- Main route work should prioritize wrapper/header/surface consistency and avoid changing business logic, hooks, mutations, upload behavior, drag-and-drop, or prompt execution.
- Nested route work needs separate runtime evidence because file previews, wizards, compare tools, and share flows have hidden states that are not safe to mark verified from static review.

## 2026-06-06 Implementation Evidence

Files changed in this pass:

- `app/src/lib/navigation/page-title.ts`
- `app/src/lib/navigation/page-title.test.ts`
- `app/src/components/shared/page-shell.tsx`
- `app/src/components/career/career-page-ui.tsx`
- `app/src/app/[locale]/(protected)/career/page.tsx`
- `app/src/components/career-pipeline/KanbanBoard.tsx`
- `app/src/components/career-pipeline/StageColumn.tsx`
- `app/src/components/career-pipeline/OpportunityCard.tsx`
- `app/src/components/career-timeline/CareerTimeline.tsx`
- `app/src/components/career-vault/VaultView.tsx`
- `app/src/components/ai-coach/CoachView.tsx`
- `app/src/components/career-compass/CareerCompassView.tsx`
- `app/src/components/career-network/NetworkGraph.tsx`
- `app/src/components/career-journal/JournalView.tsx`
- `app/src/components/career-analytics/CareerAnalyticsView.tsx`
- `app/src/components/sidebar/TodayCompanionPanel.tsx`
- `app/src/lib/i18n/ai-coach-ui.ts`
- `app/src/lib/i18n/career-phase5-ui.ts`
- `app/src/lib/i18n/career-vault-ui.ts`

Validation run:

- `npm test -- src/lib/navigation/page-title.test.ts` — pass, 5 tests.
- `npx eslint --max-warnings=0 ...` on touched Career/title files — pass after fixes.
- `npx tsc --noEmit --pretty false` — pass.
- `git diff --check` — pass.
- Runtime audit first attempt with the requested 10 main Career routes and `--timeout-ms=180000` reached 22 checks before timeout; it exposed shared sidebar `20px` customize targets.
- Runtime audit rerun with all 10 main Career routes and `--timeout-ms=600000` reached 78 checks before timeout. `/career`, `/career/profile`, `/career/pipeline`, `/career/timeline`, `/career/vault`, `/career/compass`, `/career/network`, and `/career/journal` passed all required viewport checks in that run. `/career/coach` had a desktop breadcrumb target under 24px; `/career/analytics` was incomplete at 1440/reduced because the timeout landed on the final route.
- Targeted runtime audit rerun for `/en/career/coach,/en/career/analytics` with `--timeout-ms=180000` passed 16 checks, 0 failures, 0 warnings.

Evidence paths:

- Runtime summary: `app/.next/liquid-glass-audit/summary.md`
- Screenshots: `app/.next/liquid-glass-audit/*.png`

Not done:

- Nested Career routes remain `Pending` because their hidden states, file previews, wizards, compare UI, share flows, and destructive confirmations need route-specific runtime evidence.
- Main routes remain `Partial`, not `Verified`, because dangerous/actionful hidden states such as upload/create/delete/dispatch flows were intentionally not exercised by the runtime harness.
