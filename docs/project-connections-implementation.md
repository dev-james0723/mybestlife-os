# Project connections implementation

Replaces only the Projects Map view. The other views and original project-detail modal remain unchanged. No demo relationships, sample personal data, or browser-only connection store is included.

## Behavior

Readable project cards with full-name inspection, status text and Connect buttons. A searchable two-project form explains direction before saving. Labeled edges are tappable without hover. Persistent selection, direct-neighbor focus, fit, arrange, pan buttons, pinch zoom and keyboard controls complement the map. At phone width the same data opens in a readable connection list; tablet inspection uses a dismissible sheet.

Manual connections support create, edit, confirmed removal and compensating Undo. Success is reported only after an acknowledged server write. Failed saves keep selections; stale updates/removals fail using the server timestamp rather than silently overwriting another device. Shared-idea links stay derived and read-only, with source idea counts. Filtered projects remain in the validation dataset, and hidden connections are counted rather than deleted. Relationship data never lives in localStorage.

English, Traditional Chinese and Simplified Chinese copy is provided through the existing locale helper. Other app locales use the helper's English fallback. All base project status labels continue using ProjectsUiCopy.

## Data decision and required rollout

The repository's existing brain_edges model is polymorphic and uses an undirected identity helper; its edge taxonomy does not define project dependencies, blockers or containment. Rather than silently reinterpret those records or change the Brain renderer, this feature uses a small project_connections table with owned, strongly referenced project endpoints. No Brain rows are migrated or removed.

Apply **app/supabase/migrations/20271025000000_project_connections.sql** before releasing this frontend. Its version follows the repository's existing highest migration. Do not automatically push all unrelated pending migrations to production. Inspect migration history and use the project's reviewed deployment process. This change does not itself apply a production migration or deploy.

The migration includes owner RLS, authenticated-only CRUD, endpoint ownership validation, project deletion cascades, no-self constraints, canonical symmetric links, uniqueness, timestamps and cycle validation. A per-owner advisory transaction lock coordinates writes. The app uses all owned projects for validation and a separate owner-keyed paginated query. Missing storage is an explicit blocking error, never a fake empty or successfully saved map.

- related: symmetric association, no required order.
- depends-on: source requires target; the arrow is read as a dependency, not execution order.
- blocks: source prevents target progressing.
- parent-child: source contains target. This is a relationship, not an automatic edit to project tasks.

Distinct types may coexist between a pair. Exact duplicates and reverse duplicates of symmetric links are rejected. Dependency/blocker cycles use prerequisite order; containment cycles are checked separately. Undo inserts a new relationship after validation and does not overwrite one created on another device.

## Validation

Local: 24 production-model tests pass using the TypeScript compiler and node:test. The five production TypeScript/TSX files pass syntax transpilation. These are not a full application typecheck, browser test or production persistence test.

The pull-request workflow runs those tests, scoped dependency-aware TypeScript, lint, and the actual SQL migration against a disposable PostgreSQL 16 fixture with two users. The SQL fixture verifies ownership, duplicate/self/cycle rejection, compare-and-swap timestamps, removal without project deletion, and endpoint cascade cleanup. Its minimal auth.uid fixture is not a claim to have tested the deployed Supabase configuration.

Commands from app/:

```sh
node --test scripts/test-project-connections.mjs
npx tsc --project tsconfig.project-map.json --noEmit
npx eslint src/components/projects/map-view.tsx src/components/projects/project-map-canvas.tsx src/hooks/use-project-map-connections.ts src/lib/projects/connections.ts src/lib/i18n/project-map-ui.ts
```

The SQL test refuses any database name other than project_connections_fixture and requires an empty disposable instance. Never point it at production.

Before merge/release: verify CI, test the actual Projects page in preview, check physical iPad Safari and VoiceOver, and verify create/edit/remove/Undo plus refresh and second-device persistence against the migrated staging database. Concurrent transaction stress testing and dense-graph label routing are not covered by the local model tests. No full app build, physical-device test or production migration is claimed here.
