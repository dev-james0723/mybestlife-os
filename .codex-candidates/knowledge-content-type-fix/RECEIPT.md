# Knowledge Base Save Failure Candidate

## Execution State

real_execution. Production Supabase migration has been applied.

## Evidence

- Screenshot symptom: Knowledge Base Add URL modal shows `Failed to add URL` for an Instagram Reel.
- Supabase project checked: `Mybestlifeos` / `aprjlwajbubjddtbqufk`.
- Supabase API logs: `POST /rest/v1/knowledge_items?select=*` returned `400`.
- Supabase Postgres logs: `new row for relation "knowledge_items" violates check constraint "knowledge_items_content_type_check"`.
- Current production constraint only allows:
  `podcast`, `article`, `video`, `file`, `photo`, `note`.
- App code writes `content_type = 'social'` for:
  `social_instagram_post`, `social_instagram_reel`, X, Facebook, Threads, Reddit.

## Candidate Fix

Applied `.codex-candidates/knowledge-content-type-fix/production_migration.sql` to production Supabase as a migration.

This SQL matches the existing repo migration:
`app/supabase/migrations/20260607153816_knowledge_items_content_type_current_values.sql`.

## Production Migration

- Project: `Mybestlifeos` / `aprjlwajbubjddtbqufk`
- Migration record: `20260621114741 knowledge_content_type_current_values`

## Validation Result

1. Re-queried `knowledge_items_content_type_check`; it now allows:
   `article`, `link`, `video`, `social`, `podcast`, `document`, `paper`, `book`, `code`, `repository`, `dataset`, `presentation`, `photo`, `quote`, `note`, `file`.
2. Ran a rollback-only insert smoke test for:
   `content_type = 'social'`, `source_type = 'social_instagram_reel'`.
3. Smoke test result: inserted 1 row inside the transaction, then rolled back.
4. Verified no smoke-test row remained: `leftover_smoke_rows = 0`.

## Not Done

- No browser UI save was performed from the live logged-in session. Database-level validation passed.
