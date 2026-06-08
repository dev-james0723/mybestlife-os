# Knowledge Base Save Database Inspection - 2026-06-08

## Execution State

- Real read-only inspection of Supabase project `Mybestlifeos` (`aprjlwajbubjddtbqufk`) via service-role REST/OpenAPI using the valid root env key.
- Real local Playwright reproduction of the Knowledge Base page in dev-bypass mode.
- No database writes, no migrations, no storage writes, no env-file edits.

## Routing

- Used Supabase skill because the failure involves Supabase Database/Auth/Storage.

## Findings

1. The live `knowledge_items` table exists and is not missing the current app columns.
   - Live row count: 177.
   - Required columns from live OpenAPI: `id`, `user_id`, `title`, `content_type`, `status`, `date_added`, `date_modified`.
   - Current app-written columns are present, including `source_type`, `provider`, `category`, `render_mode`, `preview_status`, `checked_at`, `screenshot_url`, `youtube_transcript`.

2. The latest successful live Knowledge Base insert found was `2026-06-06T06:24:08.667574Z`.
   - Recent rows since `2026-06-01T00:00:00Z`: 13.
   - All recent rows were `ready|success`; no stuck `processing` or `error` rows were found.
   - No rows from `2026-06-08` were found in the recent sample.

3. Dev-bypass mode reproduces a save refusal before any database insert.
   - Clean browser is redirected from `/en/knowledge-base` to `/en/login`.
   - With `mylifeos_dev_bypass=1`, the page loads as synthetic user `dev-bypass@mylifeos.local`, shows `0` knowledge items, and save shows:
     `You're in Dev / Skip-login mode. Saving Knowledge needs a real Supabase account. Log in with Google or email, then try again.`
   - This is intentional in code: page rendering allows dev bypass, but mutations call real Supabase auth.

4. `app/.env.local` has an invalid `SUPABASE_SERVICE_ROLE_KEY`.
   - Root `../.env.local` service-role key works against `aprjlwajbubjddtbqufk.supabase.co`.
   - `app/.env.local` service-role key returns `Invalid API key`.
   - The publishable key fingerprint matched between root and app env files, so the browser/client key is not the mismatch.
   - This stale service key can break server-side storage downloads and document/PDF extraction paths after a real login.

5. Supabase CLI and Supabase MCP SQL access are currently unavailable in this session.
   - MCP project listing worked, but migration/SQL actions require reauthentication.
   - Local Supabase CLI is not logged in and the app directory is not linked.

## Commands / Checks

- `npx --yes supabase@latest --version`
- `npx --yes supabase@latest projects list --output json`
- Supabase REST/OpenAPI probes using valid root service-role env.
- Supabase table probes for `knowledge_items`, `knowledge_assets`, `profiles`.
- Supabase storage bucket listing.
- Playwright clean session check against `http://127.0.0.1:3000/en/knowledge-base`.
- Playwright dev-bypass save preflight reproduction.
- Source inspection of:
  - `app/src/lib/knowledge/mutations.ts`
  - `app/src/components/knowledge/AddKnowledgeModal.tsx`
  - `app/src/lib/supabase/*`
  - `app/src/lib/dev-login-bypass.ts`

## Validation Result

- Database shape: passed for current app insert payload columns.
- Recent row health: passed; no stuck/error recent knowledge rows found.
- Storage bucket existence: passed; `knowledge-files` exists, private, 1GB limit.
- Dev-bypass reproduction: passed; save is blocked before DB write with explicit real-login message.
- Service-role env check: failed for `app/.env.local`, passed for root `../.env.local`.

## Files Changed

- Added this receipt file only.

## Not Done

- No real authenticated user insert test was run because this thread does not have your browser's active Supabase session.
- No database policy SQL was inspected directly because MCP/CLI SQL access needs reauthentication.
- No `.env.local` secret was changed.

## Next Action

Use a real Supabase login instead of Dev / Test mode for Knowledge saves. Then synchronize `app/.env.local`'s `SUPABASE_SERVICE_ROLE_KEY` with the valid root env key so file/PDF processing can work after save.
