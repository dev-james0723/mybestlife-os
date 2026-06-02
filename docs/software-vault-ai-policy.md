# Software Vault -> Tool Stack Intelligence OS - AI Policy

**Phase 0 Architecture Lock.** This policy governs AI behavior for the Software Vault and
all future Tool Stack Intelligence OS phases. It is grounded in the current codebase and
does not add or change implementation in Phase 0.

Companions:

- [`software-vault-tool-stack-os-architecture.md`](./software-vault-tool-stack-os-architecture.md)
- [`software-vault-tool-stack-os-roadmap.md`](./software-vault-tool-stack-os-roadmap.md)
- [`software-vault-data-model.md`](./software-vault-data-model.md)

---

## 1. Current AI Stack

The existing vault AI stack uses server-side Gemini helpers from
`app/src/lib/ai/gemini-text.ts`.

Current Software Vault AI routes:

- `POST /api/vault/identify`
- `POST /api/vault/autofill`
- `POST /api/vault/stack-recommend`

Current supporting systems:

- `resolveCandidates()` detects URL, GitHub URL, name, or description.
- `fetchPageMeta()` and `safe-fetch` gather page metadata safely.
- `searchDuckDuckGo()` gathers search hints.
- `buildGitHubVaultContext()` reads GitHub README/repo context where available.
- `resolveIcon()` and `uploadVaultIconFromRemoteUrl()` fetch/store icons.
- `vaultAutofillExtractionSchema` validates extracted product fields.
- `consumeVaultAutofillQuota()` enforces per-user rate limits.

Any new AI route must reuse these patterns unless there is a clear reason to introduce a
new helper.

---

## 2. Core AI Contract

AI may:

- Identify products and candidate products.
- Draft vault fields.
- Summarize source-backed product facts.
- Suggest alternatives.
- Suggest overlap and missing capabilities.
- Suggest project relevance.
- Suggest default tools.
- Generate review-only recommendations.
- Generate manual-style illustration prompts or images from confirmed facts.

AI must not:

- Save changes without user confirmation.
- Delete, retire, or archive tools automatically.
- Cancel, downgrade, purchase, or subscribe to anything.
- Open external accounts.
- Change billing.
- Present unsourced facts as verified.
- Invent pricing, logos, screenshots, features, GitHub stats, licenses, or repo activity.
- Treat a recommendation as a command.

The user remains the final authority at every persistence boundary.

---

## 3. Source Priority

Research routes should prioritize sources in this order:

1. Official product website.
2. Official documentation.
3. Official GitHub repository.
4. Official pricing page.
5. App Store / Google Play listing.
6. README file.
7. Official screenshots or demo videos.
8. Official brand asset page.
9. High-quality public reviews only when useful and clearly labeled as review sources.

If official sources are unavailable, say so. Do not fill the gap with confident-sounding
guesses.

---

## 4. Fact Categories

AI output must separate these categories:

| Category | Meaning | Can be saved directly? |
| --- | --- | --- |
| Confirmed facts | Facts backed by official or high-quality source URLs. | Only after review. |
| Source-backed findings | Facts from sources with lower confidence or indirect support. | Only after review and with confidence/source metadata. |
| Analysis | AI interpretation of confirmed/source-backed facts and vault context. | As report text only, after review. |
| Recommendation | Suggested action such as add, skip, trial, replace, downgrade-review, cancel-review. | As suggestion only. |
| Unknowns | Missing or unresolved facts. | Yes as report unknowns, not as product fields. |
| Warnings | Risk, uncertainty, stale pricing, privacy, cost, license, maintenance, or destructive-action warning. | Yes as warnings. |

Saved row fields should never imply stronger certainty than the supporting evidence.

---

## 5. Pricing Rules

Pricing is high-risk because it changes often.

Rules:

- Pricing must be sourced to an official pricing page, app-store listing, GitHub/license
  source, or clearly labeled as an estimate/unknown.
- `pricing_last_checked_at` must be set when pricing fields are saved from a research or
  autofill flow.
- `field_sources` should include pricing source type and source URL when available.
- If pricing is inferred from search snippets or AI context, mark confidence low or needs
  confirmation.
- Do not present AI pricing as verified unless source and confidence are shown.
- Do not recommend cancel/downgrade as an instruction. Use `cancel-review`,
  `downgrade-review`, or similar language.

The app must not change external billing state.

---

## 6. Logo and Icon Rules

Icon/logo fetching must prefer:

1. Official brand asset page.
2. Official website logo.
3. App Store icon.
4. Google Play icon.
5. GitHub avatar.
6. Favicon.
7. Documentation logo.

Returned icon/logo metadata must include:

- Image URL.
- Source URL.
- Source type.
- Confidence.
- Notes when low resolution or uncertain.

If only a favicon is available, say it may be low resolution. Do not hallucinate brand
assets. Do not generate a fake official logo.

---

## 7. GitHub and Open-Source Rules

GitHub stats and technical details must be fetched or marked unknown.

Never hallucinate:

- Stars.
- Forks.
- Open issues.
- License.
- Primary language.
- Repo activity.
- Installation process.
- Tech stack.
- Maintainer activity.

Technical GitHub analysis may infer documentation quality or developer experience only from
source-backed README/docs/repo metadata and must phrase subjective analysis as analysis, not
fact.

Repo activity should be:

- `active`
- `slow`
- `inactive`
- `unknown`

Use `unknown` when reliable metadata is unavailable.

---

## 8. Should-I-Add Recommendation Rules

`POST /api/vault/should-add` should return one of:

- `add`
- `trial_first`
- `skip`
- `replace_existing`
- `use_free_tier`
- `wait`

The recommendation must include:

- Reason.
- Existing overlap.
- Tools it might replace.
- Project relevance.
- Cost warning.
- Learning curve.
- Suggested trial period.
- Fields to save if user confirms.

Safety requirements:

- `replace_existing` means "review replacing"; it must not retire or delete tools.
- Cost warning must be marked as source-backed, estimate, or unknown.
- Project relevance must name the project/goal/task evidence when available.
- If the vault context is too thin, say so.

---

## 9. Product Research Report Rules

The Product Research Agent output must include active toggle settings at the top so the user
can see what was generated and what was skipped.

If a toggle is off, do not generate that section.

Report sections:

- Product / project name.
- Official links.
- Icon/logo source.
- One-sentence summary.
- Full analysis report.
- Core feature breakdown.
- User workflow.
- Pros and cons.
- Similar products / alternatives.
- Technical GitHub analysis.
- Final verdict.
- Manual illustration prompt.
- Generated manual illustration.
- Sources.
- Unknowns / warnings.

Reports are persisted only after review.

---

## 10. Manual Illustration Rules

Manual-style feature explanation images should be:

- 16:9 horizontal.
- Beginner-friendly.
- Clean and modern.
- Explanatory, not decorative only.
- Based on confirmed features.
- Labeled with product name.
- Able to include official icon/logo only if icon fetching is enabled and source-backed.
- Structured with labels, arrows, callouts, and UI-style panels.

If image generation is unavailable, generate a prompt only.

If official UI screenshots are available, use them only as reference. If screenshots are not
available, simplified interface mockups may be created from confirmed feature descriptions.
Do not invent fake UI features.

---

## 11. Persistence Rules

AI output can enter persistence only through one of these review gates:

- User confirms a new vault entry.
- User confirms updates to an existing vault entry.
- User confirms saving a research report.
- User confirms setting a fetched logo as icon.
- User confirms saving alternatives.
- User confirms saving a stack blueprint.
- User confirms saving a workflow recipe.
- User confirms applying default-tool rules.

Every route that mutates data must require auth, validate input, and write only rows owned by
the authenticated user.

For destructive or financial recommendations, persistence should store suggestion state only,
never execute the external action.

---

## 12. Data Sharing and Privacy

AI/search/research routes may send only the context needed for the requested analysis:

- User query.
- Selected candidate/product URL.
- Relevant existing vault rows for overlap.
- Relevant project/task/goal names and summaries when project relevance is requested.
- Screenshot/image bytes only when the user explicitly provides them for the flow.

Do not send unrelated Life OS data to product research routes. Use narrow context builders.

When a flow uses projects, tasks, goals, or Brain context, the UI should make that context use
visible where practical.

---

## 13. Structured Output and Validation

Gemini response shaping is not enough. New routes must validate with Zod at the route
boundary.

Validation rules:

- Accept partial results where the UI can show unknowns.
- Reject malformed recommendations that could imply destructive action.
- Coerce safe strings only where already allowed by schema.
- Bound arrays and text lengths.
- Validate URLs before saving or rendering as links.
- Mark low-confidence fields as `needs_user_confirmation` when required fields are blank or
  uncertain.

Existing patterns to reuse:

- `vaultAutofillExtractionSchema`
- `normalizePricingPlans()`
- `normalizeAlternatives()`
- `buildFieldSources()`
- `computeNeedsConfirmation()`
- `sanitizeVaultFormPatch()`
- `buildCreatePayload()`

---

## 14. Confidence and Source Metadata

Existing confidence levels:

- `high`
- `medium`
- `low`
- `user_confirmed`
- `needs_user_confirmation`

Existing source types:

- `official_site`
- `pricing_page`
- `github`
- `marketplace`
- `search`
- `llm_inference`
- `user_input`
- `fallback`

Future routes may add more source types only if necessary, such as:

- `app_store`
- `google_play`
- `documentation`
- `brand_asset_page`
- `screenshot`
- `review`
- `video`

When extending the source type union, update types, route schemas, UI labels, and tests in
the same phase.

---

## 15. Quotas and Cost Control

Existing vault AI usage uses `vault_autofill_rate_limit`, one row per user per hour window.

Recommended future quota model:

- Keep `vault_autofill_rate_limit` for backward compatibility.
- Add a daily/per-kind ledger only if product research and image generation need separate
  caps.
- Suggested kinds:
  - `identify`
  - `autofill`
  - `should_add`
  - `product_research`
  - `github_analysis`
  - `logo_fetch`
  - `manual_illustration_prompt`
  - `manual_illustration_image`
  - `overlap_audit`
  - `subscription_audit`
  - `project_stack`
  - `workflow_recipe`

Quota-exhausted routes should return HTTP 429 with reset time where possible.

---

## 16. Error Handling

Routes should return typed errors:

- `unauthorized` -> 401.
- `invalid_json` -> 400.
- `invalid_request` -> 400.
- `rate_limited` -> 429.
- `missing_gemini_key` -> 503.
- `research_unavailable` -> 502 or 503 depending on cause.
- `invalid_model_output` -> 422 or 502.
- `upstream_fetch_failed` -> 502.

UI should degrade to manual entry, source-limited output, or saved-report-only behavior where
appropriate.

---

## 17. Prompting Conventions

Prompts should:

- State the user's requested mode.
- State whether facts must be source-backed.
- Explicitly forbid invented pricing, stats, logos, screenshots, and features.
- Ask for unknowns when facts are missing.
- Ask for review suggestions, not commands.
- Keep output locale-aware where the UI expects localized user-facing text.
- Return JSON only when structured output is required.

For product research, use a two-pass pattern when needed:

1. Gather research notes from sources.
2. Extract validated structured JSON from those notes.

---

## 18. Testable AI Contracts

Each AI phase should add tests for:

- Unauthenticated request failure.
- Invalid request failure.
- Missing API key behavior.
- Rate limit behavior when applicable.
- Malformed AI output.
- Toggle gating.
- No write before confirmation.
- Unknown handling when sources are missing.
- Pricing not marked high confidence without source.
- GitHub stats marked unknown when not fetched.

Manual QA should include at least:

- Add by tool name.
- Add by official URL.
- Add by GitHub URL.
- Need-based input.
- Should-I-Add review.
- Product research with all toggles on.
- Product research with selected toggles off.
- Icon/logo fetch fallback.
- Report save and attach.

---

## 19. Binding Non-Negotiables

These are not copy guidelines; they are product rules:

- Do not create fake placeholder buttons.
- Do not create UI that looks finished but has no persistence.
- Do not bypass RLS.
- Do not auto-delete tools.
- Do not auto-retire tools.
- Do not auto-cancel subscriptions.
- Do not auto-purchase anything.
- Do not auto-subscribe to anything.
- Do not open external accounts.
- Do not change billing.
- Do not break existing Software Vault functionality.
- Do not remove existing working features.
- Do not duplicate existing schema fields unnecessarily.
- Do not add unnecessary dependencies.
- Do not present AI pricing as verified unless source and confidence are shown.
- Clearly separate confirmed facts, source-backed findings, analysis, interpretation,
  recommendation, unknowns, and warnings.
- All AI output that changes data must be reviewed before saving.
- All destructive or financial recommendations must be review suggestions, not commands.
