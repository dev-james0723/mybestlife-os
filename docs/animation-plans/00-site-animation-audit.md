# Site Animation Audit

## Framework and router
- Framework: Next.js App Router.
- App root: `app/src/app`.
- Next version: `^16.2.6`.
- React version: `^19.2.6`.
- Package manager: npm, based on `app/package-lock.json`.
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss`, global CSS in `app/src/app/globals.css`, shared UI primitives under `app/src/components/ui`.

## Existing animation surface
- Framer Motion is already installed and used in analytics, dashboard-adjacent surfaces, bucket-list/travel, bio-lab ritual scenes, journal, vault, and shared OS primitives.
- `tw-animate-css` is imported globally for data-state component transitions.
- Reduced-motion CSS is already present in multiple blocks in `globals.css`.
- Existing helpers live in `app/src/lib/animation` and hooks such as `use-ssr-safe-reduced-motion` and `use-parallax`.
- GSAP was not present before this work; the new GSAP layer should coexist with existing Framer Motion rather than replace it.

## Shared layouts and chrome
- Root layout: `app/src/app/layout.tsx`.
- Locale layout: `app/src/app/[locale]/layout.tsx`.
- Protected shell: `app/src/app/[locale]/(protected)/layout.tsx`.
- Scroll container and mobile topbar behavior: `app/src/components/protected-scroll-layout.tsx`.
- Sidebar navigation: `app/src/components/app-sidebar.tsx`.
- Topbar and command/search utility row: `app/src/components/app-topbar.tsx`.
- Shared page header wrapper: `app/src/components/shared/page-shell.tsx`.

## Route inventory
| `/[locale]/login` | `app/src/app/[locale]/(auth)/login/page.tsx` | `locale-param-login.md` |
| `/[locale]/about-me` | `app/src/app/[locale]/(protected)/about-me/page.tsx` | `locale-param-about-me.md` |
| `/[locale]/ai-assistant` | `app/src/app/[locale]/(protected)/ai-assistant/page.tsx` | `locale-param-ai-assistant.md` |
| `/[locale]/ai-knowledge/[id]` | `app/src/app/[locale]/(protected)/ai-knowledge/[id]/page.tsx` | `locale-param-ai-knowledge-id-param.md` |
| `/[locale]/ai-knowledge/create/blank` | `app/src/app/[locale]/(protected)/ai-knowledge/create/blank/page.tsx` | `locale-param-ai-knowledge-create-blank.md` |
| `/[locale]/ai-knowledge/create` | `app/src/app/[locale]/(protected)/ai-knowledge/create/page.tsx` | `locale-param-ai-knowledge-create.md` |
| `/[locale]/ai-knowledge/create/wizard` | `app/src/app/[locale]/(protected)/ai-knowledge/create/wizard/page.tsx` | `locale-param-ai-knowledge-create-wizard.md` |
| `/[locale]/ai-knowledge` | `app/src/app/[locale]/(protected)/ai-knowledge/page.tsx` | `locale-param-ai-knowledge.md` |
| `/[locale]/analytics` | `app/src/app/[locale]/(protected)/analytics/page.tsx` | `locale-param-analytics.md` |
| `/[locale]/brain` | `app/src/app/[locale]/(protected)/brain/page.tsx` | `locale-param-brain.md` |
| `/[locale]/bucket-list/map` | `app/src/app/[locale]/(protected)/bucket-list/map/page.tsx` | `locale-param-bucket-list-map.md` |
| `/[locale]/bucket-list` | `app/src/app/[locale]/(protected)/bucket-list/page.tsx` | `locale-param-bucket-list.md` |
| `/[locale]/business-analyst` | `app/src/app/[locale]/(protected)/business-analyst/page.tsx` | `locale-param-business-analyst.md` |
| `/[locale]/calendar` | `app/src/app/[locale]/(protected)/calendar/page.tsx` | `locale-param-calendar.md` |
| `/[locale]/career/analytics` | `app/src/app/[locale]/(protected)/career/analytics/page.tsx` | `locale-param-career-analytics.md` |
| `/[locale]/career/coach/[promptId]/use` | `app/src/app/[locale]/(protected)/career/coach/[promptId]/use/page.tsx` | `locale-param-career-coach-promptId-param-use.md` |
| `/[locale]/career/coach` | `app/src/app/[locale]/(protected)/career/coach/page.tsx` | `locale-param-career-coach.md` |
| `/[locale]/career/coach/profile` | `app/src/app/[locale]/(protected)/career/coach/profile/page.tsx` | `locale-param-career-coach-profile.md` |
| `/[locale]/career/compass` | `app/src/app/[locale]/(protected)/career/compass/page.tsx` | `locale-param-career-compass.md` |
| `/[locale]/career/journal` | `app/src/app/[locale]/(protected)/career/journal/page.tsx` | `locale-param-career-journal.md` |
| `/[locale]/career/network` | `app/src/app/[locale]/(protected)/career/network/page.tsx` | `locale-param-career-network.md` |
| `/[locale]/career` | `app/src/app/[locale]/(protected)/career/page.tsx` | `locale-param-career.md` |
| `/[locale]/career/pipeline/[opportunityId]` | `app/src/app/[locale]/(protected)/career/pipeline/[opportunityId]/page.tsx` | `locale-param-career-pipeline-opportunityId-param.md` |
| `/[locale]/career/pipeline` | `app/src/app/[locale]/(protected)/career/pipeline/page.tsx` | `locale-param-career-pipeline.md` |
| `/[locale]/career/profile` | `app/src/app/[locale]/(protected)/career/profile/page.tsx` | `locale-param-career-profile.md` |
| `/[locale]/career/timeline` | `app/src/app/[locale]/(protected)/career/timeline/page.tsx` | `locale-param-career-timeline.md` |
| `/[locale]/career/vault/[fileId]/compare` | `app/src/app/[locale]/(protected)/career/vault/[fileId]/compare/page.tsx` | `locale-param-career-vault-fileId-param-compare.md` |
| `/[locale]/career/vault/[fileId]/history` | `app/src/app/[locale]/(protected)/career/vault/[fileId]/history/page.tsx` | `locale-param-career-vault-fileId-param-history.md` |
| `/[locale]/career/vault/[fileId]` | `app/src/app/[locale]/(protected)/career/vault/[fileId]/page.tsx` | `locale-param-career-vault-fileId-param.md` |
| `/[locale]/career/vault/bundles/[bundleId]` | `app/src/app/[locale]/(protected)/career/vault/bundles/[bundleId]/page.tsx` | `locale-param-career-vault-bundles-bundleId-param.md` |
| `/[locale]/career/vault/bundles/new` | `app/src/app/[locale]/(protected)/career/vault/bundles/new/page.tsx` | `locale-param-career-vault-bundles-new.md` |
| `/[locale]/career/vault/bundles` | `app/src/app/[locale]/(protected)/career/vault/bundles/page.tsx` | `locale-param-career-vault-bundles.md` |
| `/[locale]/career/vault` | `app/src/app/[locale]/(protected)/career/vault/page.tsx` | `locale-param-career-vault.md` |
| `/[locale]/career/vault/shares` | `app/src/app/[locale]/(protected)/career/vault/shares/page.tsx` | `locale-param-career-vault-shares.md` |
| `/[locale]/career/vault/tags` | `app/src/app/[locale]/(protected)/career/vault/tags/page.tsx` | `locale-param-career-vault-tags.md` |
| `/[locale]/daily-planner` | `app/src/app/[locale]/(protected)/daily-planner/page.tsx` | `locale-param-daily-planner.md` |
| `/[locale]/dashboard` | `app/src/app/[locale]/(protected)/dashboard/page.tsx` | `locale-param-dashboard.md` |
| `/[locale]/finance` | `app/src/app/[locale]/(protected)/finance/page.tsx` | `locale-param-finance.md` |
| `/[locale]/garden` | `app/src/app/[locale]/(protected)/garden/page.tsx` | `locale-param-garden.md` |
| `/[locale]/goals` | `app/src/app/[locale]/(protected)/goals/page.tsx` | `locale-param-goals.md` |
| `/[locale]/google-calendar` | `app/src/app/[locale]/(protected)/google-calendar/page.tsx` | `locale-param-google-calendar.md` |
| `/[locale]/grateful-things` | `app/src/app/[locale]/(protected)/grateful-things/page.tsx` | `locale-param-grateful-things.md` |
| `/[locale]/habits` | `app/src/app/[locale]/(protected)/habits/page.tsx` | `locale-param-habits.md` |
| `/[locale]/health` | `app/src/app/[locale]/(protected)/health/page.tsx` | `locale-param-health.md` |
| `/[locale]/ideas` | `app/src/app/[locale]/(protected)/ideas/page.tsx` | `locale-param-ideas.md` |
| `/[locale]/japanese-study` | `app/src/app/[locale]/(protected)/japanese-study/page.tsx` | `locale-param-japanese-study.md` |
| `/[locale]/journal` | `app/src/app/[locale]/(protected)/journal/page.tsx` | `locale-param-journal.md` |
| `/[locale]/knowledge-base/[itemId]/oracle` | `app/src/app/[locale]/(protected)/knowledge-base/[itemId]/oracle/page.tsx` | `locale-param-knowledge-base-itemId-param-oracle.md` |
| `/[locale]/knowledge-base` | `app/src/app/[locale]/(protected)/knowledge-base/page.tsx` | `locale-param-knowledge-base.md` |
| `/[locale]/knowledge/software-vault` | `app/src/app/[locale]/(protected)/knowledge/software-vault/page.tsx` | `locale-param-knowledge-software-vault.md` |
| `/[locale]/mind-council` | `app/src/app/[locale]/(protected)/mind-council/page.tsx` | `locale-param-mind-council.md` |
| `/[locale]/os-buddy/air-remote` | `app/src/app/[locale]/(protected)/os-buddy/air-remote/page.tsx` | `locale-param-os-buddy-air-remote.md` |
| `/[locale]/privacy` | `app/src/app/[locale]/(protected)/privacy/page.tsx` | `locale-param-privacy.md` |
| `/[locale]/projects` | `app/src/app/[locale]/(protected)/projects/page.tsx` | `locale-param-projects.md` |
| `/[locale]/quick-save/[captureId]` | `app/src/app/[locale]/(protected)/quick-save/[captureId]/page.tsx` | `locale-param-quick-save-captureId-param.md` |
| `/[locale]/quick-save/setup` | `app/src/app/[locale]/(protected)/quick-save/setup/page.tsx` | `locale-param-quick-save-setup.md` |
| `/[locale]/quick-save/success` | `app/src/app/[locale]/(protected)/quick-save/success/page.tsx` | `locale-param-quick-save-success.md` |
| `/[locale]/quote-library` | `app/src/app/[locale]/(protected)/quote-library/page.tsx` | `locale-param-quote-library.md` |
| `/[locale]/relationship` | `app/src/app/[locale]/(protected)/relationship/page.tsx` | `locale-param-relationship.md` |
| `/[locale]/relationships` | `app/src/app/[locale]/(protected)/relationships/page.tsx` | `locale-param-relationships.md` |
| `/[locale]/resources` | `app/src/app/[locale]/(protected)/resources/page.tsx` | `locale-param-resources.md` |
| `/[locale]/role-models` | `app/src/app/[locale]/(protected)/role-models/page.tsx` | `locale-param-role-models.md` |
| `/[locale]/settings/ai-preferences` | `app/src/app/[locale]/(protected)/settings/ai-preferences/page.tsx` | `locale-param-settings-ai-preferences.md` |
| `/[locale]/settings` | `app/src/app/[locale]/(protected)/settings/page.tsx` | `locale-param-settings.md` |
| `/[locale]/signals` | `app/src/app/[locale]/(protected)/signals/page.tsx` | `locale-param-signals.md` |
| `/[locale]/software-vault` | `app/src/app/[locale]/(protected)/software-vault/page.tsx` | `locale-param-software-vault.md` |
| `/[locale]/tasks` | `app/src/app/[locale]/(protected)/tasks/page.tsx` | `locale-param-tasks.md` |
| `/[locale]/vault` | `app/src/app/[locale]/(protected)/vault/page.tsx` | `locale-param-vault.md` |
| `/[locale]/weather` | `app/src/app/[locale]/(protected)/weather/page.tsx` | `locale-param-weather.md` |
| `/[locale]/weekly-review` | `app/src/app/[locale]/(protected)/weekly-review/page.tsx` | `locale-param-weekly-review.md` |
| `/[locale]/youtube-radar` | `app/src/app/[locale]/(protected)/youtube-radar/page.tsx` | `locale-param-youtube-radar.md` |
| `/[locale]/quick-save-login` | `app/src/app/[locale]/quick-save-login/page.tsx` | `locale-param-quick-save-login.md` |
| `/` | `app/src/app/page.tsx` | `root.md` |
| `/share/[token]` | `app/src/app/share/[token]/page.tsx` | `share-token-param.md` |

## Repeated UI patterns
- Page headers and action rows.
- Card grids and card rows.
- Loading skeletons and empty states.
- Dialogs, sheets, popovers, tabs, and dropdowns.
- Graph/chart visualizations.
- Form and validation surfaces.
- Feature dashboards with statistics and summaries.

## Where GSAP should live
- Shared motion utilities: `app/src/lib/motion`.
- React motion wrappers: `app/src/components/motion`.
- Route-level wrapper: protected scroll layout and, later, auth/share wrappers where needed.
- Page-specific GSAP only in small client components with local refs.

## Where GSAP should not be added
- Server components that redirect, fetch, or only compose static metadata.
- Data hooks, stores, Supabase clients, API route handlers, and business logic.
- Long lists without batching or virtualization.
- Auth and form submission logic.

## Current risks
- The app already has Framer Motion in many features, so double-animating the same element could feel noisy.
- Protected pages share one scroll region, so ScrollTrigger must account for a non-window scroller if used inside that region.
- Dense data pages can generate too many animations if selector scopes are broad.
- Dynamic route detail pages must prioritize readability and editing over decorative motion.

## Initial implementation order
1. Motion foundation and feature flag.
2. Protected route transition wrapper.
3. Shared reveal/stagger/counter/magnetic components.
4. Highest-impact pages: dashboard, login, habits, journal, analytics.
5. Remaining route-specific implementations in domain batches.
6. QA: build, reduced motion, mobile, console, and visual smoke testing.
