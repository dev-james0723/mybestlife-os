# Project connections rollout

Replaces the Projects map only. Uses existing React Flow/Dagre, UI primitives, account authentication, and locale helpers. Other project views and sidebar are unchanged. No sample relationships are written.

## Included
Readable project cards, persistent tap selection, labeled directional edges, explicit connection editor with sentence preview and search for larger project sets, inspector/small-screen sheet, mobile-first list alternative, zoom/Fit/Arrange/pan controls, reduced motion, error states, versioned account saves, removal and server-backed Undo. Related connections are symmetric; depends-on points from dependent to prerequisite; blocks points from blocker to blocked; contains points from parent to child. One active manual connection per unordered project pair in v1; use Edit to change its meaning. Shared-idea links remain separate read-only derived evidence and are aggregated by pair.

## Storage and security
An additive `project_connections` table is used instead of overloading polymorphic `brain_edges`. The inspected general-purpose graph table does not enforce real project endpoints or this feature's duplicate/version/cycle rules. Existing Brain data is deliberately untouched. This table uses project foreign keys, owner-scoped reads and cache keys, and a guarded RPC backed by a private security-definer helper. Direct authenticated table writes are revoked. The RPC verifies both endpoint owners, serializes each owner's writes, rejects invalid/duplicate/cyclic relationships and stale versions, and handles repeated requests. Undo restores a tombstone using its current version and revalidates constraints. Deleting a project cascades its connections. Filtering never deletes anything.

## Release gate
The code is on a feature branch. No production migration, merge, or deployment is authorized or performed by this change. Review `app/supabase/migrations/20260910210000_project_connections.sql` and the target database migration history before applying this one additive migration. This repository includes future-dated historical migrations; do not blindly apply an outstanding migration backlog. Until the new table/RPC are available, the map displays a storage-unavailable error, never a fake Saved state.

## Verification
The PR workflow installs the locked dependencies, runs the connection semantics/projection tests, runs real PostgreSQL authorization and mutation tests in a disposable database, lints the feature and runs the full application TypeScript check. Read the actual CI results; adding tests is not proof that they passed. `project-map-db.test.sql` refuses to run unless the database is named `project_map_ci` and must never run against production.

Physical iPad Safari, VoiceOver, production account refresh/cross-device persistence and a production build remain explicit release checks. Browser layout/interaction testing is separate from the standalone prototype's old 37-check result. No previous prototype test result is being claimed for this implementation.
