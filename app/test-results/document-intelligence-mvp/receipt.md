# Document Intelligence MVP — implementation receipt

Date: 2026-09-03

Execution state: implemented and validated locally. The Supabase migration and
Vercel cron configuration are candidate changes only; neither was applied or
deployed from this task.

## Delivered

- Upload-first Add Document dialog with drag/drop, file picker, camera capture,
  and External link as a secondary source.
- AI analysis is opt-in and off by default. Suggestions for title, document
  type, expiry, and notes remain editable and include confidence/warnings.
- Existing Assets can be searched, linked, and assigned a document role.
- Explicit format tiers and limits are shown in the dialog: AI-ready formats,
  upload-only formats, 18 MiB binary AI-analysis limit, and 25 MiB upload limit.
- Direct signed upload to a private Supabase bucket, server-side content
  validation, short-lived open URLs, deletion lifecycle, durable reservations,
  and stale-upload cleanup.
- Upload cancellation is abortable; stale cleanup uses an atomic cutoff check;
  cancelled tombstones remain retryable if Storage deletion temporarily fails.
- Retry actions have both busy-state disabling and a synchronous operation guard
  so a rapid double click cannot wedge the dialog in cleanup state.

## Main files

- `src/components/documents/DocumentIntakeDialog.tsx`
- `src/components/documents/ConnectedDocumentIntakeDialog.tsx`
- `src/app/api/documents/intake/route.ts`
- `src/app/api/cron/document-upload-cleanup/route.ts`
- `src/lib/documents/`
- `src/lib/repositories/documents.ts`
- `src/components/resources/documents/DocumentsView.tsx`
- `supabase/migrations/20271023000000_document_intelligence_mvp.sql`
- `vercel.json`

## Validation

- Focused document tests: 42/42 passed.
- TypeScript: `npm run typecheck` passed.
- Production build: `npm run build` passed on Next.js 16.2.6.
- Targeted ESLint: passed with zero warnings.
- Full ESLint: zero errors; 148 existing warnings elsewhere in the application.
- SQL static parse: pgsql-parser 18.2.6 parsed all 65 statements.
- Vercel cron configuration: valid JSON; both configured route files exist.
- Browser review: desktop and 390 x 844 mobile layouts fit without horizontal
  overflow; footer actions remained visible; AI default-off switch and close
  behavior were exercised.
- Full repository test suite: 692 passed and 3 unrelated existing tests failed
  (`os-buddy-companion`, `docOracleFixture`, and a timezone-sensitive Google
  Calendar encoding expectation). All 42 document-intake tests passed in that
  run.

## Validation unavailable

Live local Supabase migration apply/database lint could not run because the
Docker daemon is not running. Static SQL parsing and focused schema contracts
passed, but a local database reset remains required before deployment.

## Residual risks / not done

- Structural file validation is implemented, but antivirus scanning or CDR is
  not included in this MVP.
- Storage deletion and document-row deletion are centralized in one server
  request but cannot be one database transaction across Supabase Storage and
  Postgres. A failed row deletion can require a user retry.
- No production migration, cron deployment, push, or release was performed.

## Next action

Start Docker, run the migration against a local Supabase stack, exercise one
real upload/AI/asset-link/delete journey, then review and explicitly approve the
production migration and deployment.
