# Knowledge Base Production Save Inspection - 2026-06-08

## Execution State

- REAL read-only production inspection of Supabase project `aprjlwajbubjddtbqufk` and Vercel project `mybestlife-os`.
- REAL safe production browser reproduction using only the `mylifeos_dev_bypass=1` cookie.
- CANDIDATE local code patch applied. It has not been deployed.
- No production database writes were performed.

## User Report

The user reported that they were logged in with `fantasia.studio@gmail.com` but still could not save anything on the Knowledge Base page at `mybestlife-os.com`.

## Main Findings

- The live site redirects `https://mybestlife-os.com` to `https://www.mybestlife-os.com`.
- The live production bundle points at Supabase project `aprjlwajbubjddtbqufk`.
- Supabase Auth does not contain `fantasia.studio@gmail.com`.
- Supabase Auth does contain `fantasia.studio88@gmail.com`:
  - User id: `6803b5b9-cb11-4ce6-8489-4940ce1a6d65`
  - Provider: Google
  - Last sign-in: `2026-06-07T08:53:02.091292Z`
- The `profiles` table also contains `fantasia.studio88@gmail.com`, not `fantasia.studio@gmail.com`.
- That user owns 173 Knowledge Base rows.
- Latest successful Knowledge Base row for that user was created on `2026-06-06T06:24:08.667574Z`.
- There were no new Knowledge Base rows for that user on `2026-06-08`.
- Vercel production error logs for the last 24 hours did not show Knowledge Base save errors.

## Root Cause Candidate

Production currently allows Dev Login Bypass because `isDevLoginBypassFeatureEnabled()` enabled it automatically whenever `NEXT_PUBLIC_VERCEL === "1"`. The Vercel production environment did not have `NEXT_PUBLIC_HIDE_DEV_LOGIN_BYPASS=true`.

With only the `mylifeos_dev_bypass=1` cookie set on `https://www.mybestlife-os.com/en/knowledge-base`, the protected Knowledge Base page loaded as:

- Auth mode: `DB / Dev Bypass`
- Email: `dev-bypass@mylifeos.local`

Attempting to save from that state is blocked before any database insert with this toast:

```text
You're in Dev / Skip-login mode. Saving Knowledge needs a real Supabase account. Log in with Google or email, then try again.
```

This explains why the user can appear to be inside the app while no new rows reach the database and no server-side save error appears.

## Candidate Patch Applied Locally

Files changed:

- `app/src/lib/dev-login-bypass.ts`
- `app/src/app/[locale]/(auth)/login/login-form.tsx`

Patch behavior:

- Dev Login Bypass remains enabled for local `NODE_ENV=development`.
- Dev Login Bypass can still be explicitly enabled with `NEXT_PUBLIC_DEV_LOGIN_BYPASS=true`.
- Dev Login Bypass is no longer automatically enabled on every Vercel build.
- Login page clears stale `mylifeos_dev_bypass` cookies when the bypass feature is hidden or disabled.

## Validation

Commands run from `/Users/ouxianxing/My_life_os/app`:

```bash
npx tsc --noEmit --pretty false
npx eslint src/lib/dev-login-bypass.ts 'src/app/[locale]/(auth)/login/login-form.tsx'
```

Result:

- TypeScript passed.
- Targeted ESLint passed.

Note: `npm run lint -- --file ...` was attempted first, but this repo uses `eslint.config.js`, where the `--file` flag is invalid. The validation was rerun with direct ESLint file paths.

## Not Done

- The candidate patch has not been deployed to production.
- Vercel production env has not been changed.
- No production database writes were made to test insertion.

## Recommended Next Action

Deploy the candidate patch, or set `NEXT_PUBLIC_HIDE_DEV_LOGIN_BYPASS=true` in Vercel production and redeploy. After deployment, sign in through Google with the real Supabase account and verify the top-right account badge is not `Dev Bypass` / `dev-bypass@mylifeos.local`, then run one real Knowledge Base save.
