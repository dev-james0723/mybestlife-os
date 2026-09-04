# Neural Skill distillation repair receipt

Date: 2026-09-03

Execution state: deployed to production and live-validated.

## Reported failure

`Generate Neural Skill` on the Role Models page returned `Could not create a Neural Skill. Please try again.`

## Confirmed cause

- The production distillation requests returned HTTP 502.
- The underlying Gemini request selected `gemini-2.5-pro`, which returned HTTP 429 with a model-specific quota limit of zero.
- The shared Gemini client treated 429 as terminal, so it never attempted the explicitly configured Flash fallback.
- The live `role_model_neural_skills` table, RLS policy, ownership default, index, and trigger are present. At the failure timestamp the app successfully read the table, but generation failed before the client could persist a row.

## Repair

- Retry model-specific 429 failures through the explicit Gemini model fallback chain, while preserving terminal handling for depleted prepaid-credit errors.
- Implement the Nuwa sequence as separate grounded-research and structured-synthesis stages.
- Keep private Life OS data out of web research; use it only during private synthesis.
- Add identity disambiguation, evidence labels, decision heuristics, communication DNA, anti-patterns, blind spots, and non-impersonation boundaries.
- Fall back to a cautious saved-profile lens if all live AI paths are unavailable, so an arbitrary or private person can still produce a usable, honest lens.
- Clamp provider output before validation, distinguish generation from save failures, handle non-JSON gateway errors, and synchronously seed the query cache before opening Mind Council.
- Feed the complete distilled lens into Mind Council instead of discarding all but the short system-prompt seed.

## Validation evidence

- Direct Gemini Pro probe: reproduced HTTP 429 model quota failure.
- Direct Gemini Flash structured-output probe: passed in approximately 11 seconds.
- Direct Gemini Flash grounded-research probe: passed in approximately 13 seconds.
- Full strengthened Nuwa synthesis with output coercion: passed in approximately 18 seconds with 6 decision principles, 5 blind spots, and the impersonation guardrail.
- Focused ESLint on all changed Neural Skill files: passed.
- `npm run typecheck`: passed.
- Focused Vitest suite in the isolated deploy tree: 23 tests passed, including 18 newly added regression tests.
- `npm run build`: passed; Next.js compiled, typechecked, and generated 189 static pages.
- `git diff --check`: passed.
- Full Vitest suite: 634 passed, 3 unrelated existing failures (`document-oracle`, `google/calendar`, and `os-buddy`).
- `./scripts/doctor.sh`: completed; warned that local Node 25 differs from the pinned Node 22 and that the installed Vercel CLI is behind current.
- Exact-commit Vercel preview: READY; Role Models page returned HTTP 200 and the distillation route enforced its unauthenticated boundary.
- Production Justin Bieber flow: generated, persisted, routed to Mind Council chat, and remained after a full reload.
- Production 馮唐 flow: generated, persisted, routed to Mind Council chat, and remained after a full reload. Grounded research returned invalid output, so the route correctly degraded to saved-profile synthesis instead of failing.
- Live database receipt: both rows are `ready` and used `gemini-2.5-flash`; Justin has 6 decision principles / 6 blind spots, and 馮唐 has 6 / 5.
- Production logs: both distillation requests returned HTTP 200; no runtime error cluster was found after deployment.

## Deployment

- Commit: `d0f49d2b51edb907731281faecfacaa6db6dfd02` (`Fix Neural Skill distillation`)
- Preview: `https://mybestlife-eeoj8kxpw-jamesau0723-6572s-projects.vercel.app` — READY
- Production deployment: `dpl_Cd3ArEpSxxB6HpX9TafPhWykq3uX` — READY
- Production domains: `https://www.mybestlife-os.com` and `https://mybestlife-os.com`
- No database migration was run.

## Files changed for this repair

- `src/lib/ai/gemini-text.ts`
- `src/app/api/ai/role-model/_shared-intelligence.ts`
- `src/app/api/ai/role-model/distill-skill/route.ts`
- `src/lib/relationships/neural-skill-generation.ts`
- `src/hooks/use-role-model-neural-skills.ts`
- `src/hooks/use-role-model-talk.ts`
- `src/components/relationship/role-models/role-model-intelligence-modal.tsx`
- `src/lib/ai/gemini-text.test.ts`
- `src/app/api/ai/role-model/_shared-intelligence.test.ts`
- `src/lib/relationships/neural-skill-generation.test.ts`

## Follow-up

- The global Vercel CLI remains outdated; the deployment used pinned CLI `59.11.2`. Upgrade separately with `npm i -g vercel@latest`.
- Consider adding an explicit in-app regenerate action for lenses created in profile-fallback mode.
- The isolated 3.0 GB deployment worktree remains at `/tmp/mybestlife-neural-deploy-20260903`; it was not deleted because repository policy requires explicit deletion approval.

## Residual risk

- A profile-only lens is intentionally less specific than a grounded public-person lens; the UI discloses when this degraded mode was used.
- A private or obscure person's lens is deliberately limited to saved evidence when public identity cannot be verified; it will not invent private motives or merge namesakes.
