# Doc Oracle UI Redesign Plan

## Existing Problems Found
- Mobile navigation is too dominant: ten large tabs compete with the document content.
- Overview repeats document title, parser metadata, summary, stats, and navigation across the page header, snapshot card, quick nav, tree map, and content sections.
- Buttons are inconsistent in height, radius, icon size, label length, and color treatment.
- The interface mixes hard-coded lime, sky, violet, amber, teal, emerald, black glass, and muted gray accents instead of one calm OS accent system.
- Mobile spacing is double padded by the protected layout plus Doc Oracle's own shell and nested cards.
- Chat composer is visually heavy, stacks the Send button under the textarea on mobile, and risks collision with floating OS UI.
- Tree map is a useful desktop affordance but too decorative and hard to tap on 390px mobile.
- CJK and mixed-language content needs better wrapping, shorter labels, and less metadata repetition.

## New Information Architecture
- Top shell owns document identity: back link, document title, parser/status metadata, primary Ask action, optional Source action.
- Primary navigation: Overview, Chat, Pages, Sections, Source.
- Secondary tools: Mind Map, Glossary, Visuals, Infographic, Audio Summary behind a More affordance or compact overflow.
- Overview becomes a clean dashboard:
  1. Intelligence summary and one metadata/stat row.
  2. Suggested next actions, max 3-5.
  3. Document structure: compact list on mobile, optional tree map on desktop/collapsed.
  4. Key topics + TOC visually connected, not two competing outline surfaces.
  5. Visual highlights and suggested questions below the fold and only when useful.
- Chat becomes the primary Oracle experience: quiet history controls, compact starter chips, readable answers, secondary citation metadata.

## Component-Level Change List
- `DocOracleWorkspace`: convert shell to OS-style mobile-first layout; use shared GSAP registration; keep data props and tab state unchanged.
- `DocOracleTabBar`: replace mobile two-column tab grid with compact horizontal segmented navigation and secondary tool strategy.
- `DocumentSnapshotCard`: remove duplicated summary/title behavior; keep only compact intelligence summary/stat/action surface or merge into overview card.
- `DocOracleOverviewPanel`: single summary source, collapsed source preview, collapsed/desktop tree map, reduced section noise.
- `ClickableTableOfContents`: remove repeated keyword lines from overview; keep detail-heavy metadata in Sections.
- `ClickableKeyTopics`: remove random color tones; use one OS accent and stable chip styling.
- `DocOracleChatPanel`: align history row, quiet starter prompts, sticky glass composer in one row, safe-area/floating-ui padding.
- `DocOraclePagesPanel`, `DocOracleSectionsPanel`, `DocOracleVisualsPanel`, `DocOracleGlossaryPanel`, `DocOracleSourcePanel`: align search/filter/control styling and empty states without changing queries or callbacks.
- Modals: keep behavior, align surfaces/buttons with OS primitives, preserve focus and close behavior.

## Mobile Layout Rules
- Design for 390px first.
- Page horizontal padding: app-standard 16px; avoid nested extra page gutters.
- Card padding: 16px mobile, 20px tablet, 24px desktop.
- Section gap: 16px mobile, 20-24px desktop.
- Control gap: 8px.
- Primary controls min-height 44px.
- Long labels shorten on mobile; full meaning moves to `aria-label`.
- Tree map is collapsed or replaced by a structure list on mobile.
- Chat composer remains a single aligned row, safe-area aware, with room for floating OS UI.

## Desktop Layout Rules
- Keep max width aligned to protected app shell.
- Navigation may become two-tier segmented control, but must not exceed one compact row plus overflow.
- Overview can use two-column composition only when it improves scanning.
- Tree map may be a desktop enhancement, never a required control.
- Reading content uses comfortable max widths; control panels may be denser.

## Motion Rules
- Use GSAP only for orientation: shell entrance, tab panel continuity, below-fold card reveal where helpful.
- Register GSAP through `app/src/lib/motion/register-gsap.ts`.
- Use `@gsap/react` `useGSAP()` scoped to local refs.
- Use `gsap.matchMedia()` for desktop/mobile and reduced-motion branches.
- Respect `prefers-reduced-motion`; reduced motion renders static or opacity-only.
- Animate transforms and opacity only.
- No endless decorative loops near reading or input content.
- No ScrollTrigger pinning or scroll-jacking in Doc Oracle.

## Accessibility Checks
- All tabs expose `role=tab`, `aria-selected`, `aria-controls`, and stable ids.
- Any overflow/More navigation must remain keyboard reachable.
- Dialogs keep `aria-modal`, labelled titles, and close affordances.
- Buttons with shortened labels keep descriptive `aria-label`.
- Color contrast checked in light and dark modes.
- CJK titles use wrapping that avoids clipping and horizontal overflow.
- Reduced motion works and does not hide state changes.

## QA Checklist
- Overview, Chat, Pages, Sections, Glossary, Visuals, Mind Map, Infographic, Audio Summary, Source.
- Page detail modal, visual preview modal, glossary term modal.
- Empty/loading/not-ready states.
- Long Chinese titles, mixed-language summaries, long summaries.
- No pages/no sections/no visuals/no glossary.
- Mobile 390px, tablet, desktop.
- Light and dark mode.
- Source page jumping, citations, related visuals, generated image explanation, suggested questions.
- `npm run lint --prefix app`
- `npm run build --prefix app`
- Browser smoke test with console checked for errors/hydration warnings.

## Implementation Receipt - 2026-06-04
- Execution state: real local code edits, not a mock or dry run.
- Skills routed: `design-taste-frontend`, `gpt-taste`, `gsap`, `gsap-react`, `redesign-existing-projects`.
- Scope: Doc Oracle UI surfaces and global Doc Oracle focus styling only; existing OS Buddy worktree changes were left untouched.
- Implemented: two-tier Doc Oracle tab bar, de-duplicated overview snapshot, compact quick navigation, token-based accent styling, aligned chat composer, collapsed structure/source-heavy overview sections, corrected TOC nested-button semantics, and light GSAP shell/tab-panel motion.
- Validation passed: `cd app && git -C .. diff --name-only -- app/src/components/document-oracle | grep -E '\\.(ts|tsx)$' | sed 's#^app/##' | xargs npx eslint --max-warnings=0`.
- Validation passed: `cd app && npx tsc --noEmit --pretty false`.
- Validation passed: `git diff --check`.
- validation_unavailable: production build. `npm run build --prefix app` failed earlier in this pass with `ENOSPC: no space left on device, write`; `df -h .` later showed the project filesystem at 100% capacity with 762MiB available.
- validation_unavailable: authenticated visual runtime pass. The existing Next dev server was on `http://localhost:3000`, but dev-bypass had zero Doc Oracle items and no reusable authenticated browser cookies were found.
- Residual risk: final mobile screenshot verification still needs a real authenticated document item after disk space and test data are available.

## Follow-up Receipt - 2026-06-05
- Execution state: real cache cleanup and local validation after user confirmation.
- Deleted exactly these regenerable paths: `app/.next`, `~/.npm/_npx`, `~/.cache/uv`, `~/Library/Caches/pip`, `~/Library/Caches/Homebrew`, `~/Library/Caches/ms-playwright`, `~/Library/Caches/ms-playwright-go`.
- Disk result: project filesystem free space increased from about 2.7GiB to about 11GiB.
- Validation passed: `npm run build --prefix app`; Next compiled, completed TypeScript, generated 163 static pages, and collected build traces.
- Runtime smoke: started `NEXT_PUBLIC_DEV_LOGIN_BYPASS=true npm run start -- -p 3100`.
- Runtime evidence: `app/.next/doc-oracle-runtime/knowledge-base-bypass-mobile.png`.
- Runtime limitation: dev-bypass user reached Knowledge Base successfully but had no knowledge/document items, so no Doc Oracle route link existed to screenshot.
