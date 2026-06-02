# Software Vault -> Tool Stack Intelligence OS - Architecture

**Phase 0 Architecture Lock.** This document defines the target architecture for evolving
the existing Software Vault into an AI-powered Tool Stack Intelligence OS. It is grounded
in the current codebase as of this Phase 0 pass and intentionally makes no application,
UI, API, or migration changes.

Companion documents:

- [`software-vault-tool-stack-os-roadmap.md`](./software-vault-tool-stack-os-roadmap.md)
- [`software-vault-ai-policy.md`](./software-vault-ai-policy.md)
- [`software-vault-data-model.md`](./software-vault-data-model.md)

Phase rule: each future phase is implemented, tested, reported, and stopped before the
next phase begins.

---

## 1. Current Software Vault System Summary

The Software Vault is already a real persisted feature. It is not just a gallery.

### 1.1 Primary UI Surface

`VaultInterior` is the page orchestrator. It wires:

- `VaultChrome` and `PageShell` for the vault frame.
- `VaultSoftwareModeTabs` for the four current modes:
  `my-vault`, `recommended-stacks`, `compare`, and `build-stack`.
- `VaultFilterBar`, `VaultOverlapInsightsCard`, `VaultGallery`, and
  `VaultCostDashboard` for the personal vault.
- `VaultRecommendedStacksPanel` for curated stack templates.
- `VaultBuildMyStackPanel` for AI stack generation.
- `VaultComparePanel` for deterministic side-by-side comparison.
- `VaultDetailModal`, `VaultAddDialog`, and `VaultEditDialog` for row operations.

The page state lives in `app/src/stores/vault-store.ts`. It stores unlock state,
filters, sort, view mode, selected entry id, add dialog state, software mode, and compare
selection.

### 1.2 Add, Edit, Review, and Deposit Flow

`VaultAddDialog` already implements a multi-stage Smart Add flow:

1. Prompt input.
2. `/api/vault/identify` candidate resolution.
3. `AppCandidatePickerModal` when multiple candidates exist.
4. `/api/vault/autofill` structured data extraction.
5. Optional `PlanPickerSteps` for subscription plan/cycle selection.
6. `VaultReviewStep` for confirmation and confidence/source review.
7. `softwareVaultRepository.create()` for persistence after user confirmation.

`VaultEntryForm` is shared by add/edit. It normalizes enum values, coerces AI output into
safe form strings, supports local icon upload through `/api/vault/icon-upload`, and builds
the Supabase insert/update payload. `VaultEditDialog` reuses the same form and preserves
stored AI metadata.

### 1.3 Detail, Gallery, Cost, Compare, and Insights

`VaultDetailModal` shows the saved entry, website, icon, status, priority, cost, summary,
field blocks, related apps by category/default job, edit/delete actions, and the default
stack toggle.

`VaultGallery` filters and sorts real rows from `software_vault`, then renders cards with
status, priority, cost, and default-stack state.

`VaultCostDashboard` deterministically sums active paid/subscription tools into a monthly
spend pill and counts default stack tools.

`VaultComparePanel` uses `buildVaultCompareMatrix()` to compare selected vault rows across
summary, best-for, downsides, cost, ease, integration, privacy, and workflow fit.

`VaultOverlapInsightsCard` uses `analyzeVaultStackInsights()` for deterministic warnings:
duplicate names, high recurring spend, missing documentation layer, and AI-tool overlap.

### 1.4 Current Data and Persistence

The core table is `public.software_vault`. The current typed row is
`SoftwareVaultEntry` in `app/src/types/database.ts`.

Current columns include:

- Identity and ownership: `id`, `user_id`, `created_at`, `updated_at`.
- Product fields: `app_name`, `website_url`, `icon_url`, `category`, `platforms`,
  `summary`.
- Usage fields: `use_cases`, `status`, `priority`, `why_i_use_it`, `best_feature`,
  `biggest_downside`, `best_alternative`, `replaces`, `tags`, `default_tool_for`.
- Cost fields: `cost_type`, `cost_amount`, `cost_period`, `cost_currency`,
  `billing_cycle`, `selected_plan_id`, `pricing_plans`, `pricing_last_checked_at`.
- AI/provenance fields: `ai_generated_fields`, `alternative_options`, `field_sources`,
  `field_confidence`.
- Usage/default fields: `is_default_stack`, `launch_count`, `last_opened_at`.

Existing migrations:

- `20260422000000_software_vault_expansion.sql` adds `summary`,
  `ai_generated_fields`, `is_default_stack`, `launch_count`, `last_opened_at`,
  vault icon storage, indexes, and `vault_autofill_rate_limit`.
- `20270901120000_software_vault_smart_autofill.sql` adds pricing plans, selected plan,
  billing cycle, currency, alternatives, field sources, confidence, and pricing checked
  timestamp.

The repository is `app/src/lib/repositories/software-vault.ts`. It uses the browser
Supabase client, scopes inserts to the authenticated user, and exposes `getAll`, `getById`,
`create`, `update`, `delete`, and `markOpened`.

### 1.5 Current AI and Research Flow

Current routes:

- `POST /api/vault/identify`
- `POST /api/vault/autofill`
- `POST /api/vault/stack-recommend`
- `POST /api/vault/icon-upload`
- `GET /api/vault/icon-proxy`

`/api/vault/identify` authenticates the user, validates input with Zod, enforces the
autofill quota, and uses `resolveCandidates()` to detect URL, GitHub URL, name, or
description input.

`/api/vault/autofill` authenticates the user, validates input, enforces quota, checks the
Gemini key, resolves official/GitHub context, gathers page metadata and search hints, uses
Gemini grounded/structured helpers, validates/coerces with `vaultAutofillExtractionSchema`,
normalizes pricing plans and alternatives, computes confirmation requirements, resolves
icons, uploads icons where possible, and returns reviewable fields with sources and
confidence.

`/api/vault/stack-recommend` accepts a stack-building request, uses Gemini to suggest real
tools, normalizes output, and returns a stack proposal. The client lets the user select
tools before depositing them.

### 1.6 Curated Library and Stack System

`software-library-schema.ts` defines:

- Curated stack industries.
- Library tool shape.
- Curated stack template shape.
- Build-my-stack request/response contracts.
- Compare snapshot and overlap insight contracts.
- Library import input shape.

`stack-templates.ts` validates batches under `app/src/lib/vault/stack-seeds/`.
`deposit-library-tools.ts` adds or merges tools into `software_vault`.
`recommended-tool-mapping.ts` detects duplicate products by name/URL and merges stack
context instead of blindly inserting duplicates.

### 1.7 I18n

Vault copy is centralized in `app/src/lib/i18n/vault-ui.ts`, with Smart Autofill copy and
phase copy imported from adjacent modules. Any new UI must extend this copy model rather
than hardcoding English-only strings.

### 1.8 Brain and Adjacent Modules

The Brain graph already treats software as a first-class resource:

- `app/src/lib/brain/adapters/software.ts` emits legacy constellation `software` nodes.
- `app/src/lib/brain/normalize/resources.ts` maps `SoftwareVaultEntry` rows to rich Brain
  `tool` nodes.
- `app/src/lib/brain/buildBrainData.ts` includes software rows alongside projects, tasks,
  goals, assets, documents, finance, and AI prompts.

Adjacent entities available for future stack intelligence:

- Projects: `Project` rows and `projectsRepository`.
- Tasks: `Task` rows, `task_subtasks`, `useTasks`, task AI flows, and project links.
- Goals: `Goal` rows and `useGoals`.
- Assets: `Asset` rows, document links, asset intelligence flows.
- Documents: legacy `documents` plus DocOracle tables under knowledge documents.
- Finance: accounts, transactions, budgets, savings goals, categories.
- Brain relations: `brain_relations` and `brain_edges` for confirmed/suggested cross-module
  edges.
- Life Agent context: no single canonical `life-agent` module exists today. The nearest
  integration points are OS Buddy, Signals `useLifeOsContext`, AI routes, and Brain context.

---

## 2. Existing Features to Preserve

Future phases must preserve:

1. Vault unlock/lock behavior and existing vault modes.
2. Manual add/edit/delete of software entries.
3. Smart Add prompt -> identify -> autofill -> pricing -> review -> deposit flow.
4. Candidate picker and manual fallback.
5. Plan picker, selected plan, billing cycle, cost amount, and pricing metadata.
6. Review-first saving and field-level confirmation blocking.
7. Field confidence, field sources, AI-generated field tracking, and alternatives.
8. Icon URL preview, file upload, vault icon storage, and icon proxy behavior.
9. Gallery filtering, sorting, grid/list display, status/priority/cost badges.
10. Cost dashboard monthly estimate and default-stack count.
11. Detail modal fields, edit/delete, related apps, and default-stack toggle.
12. Recommended stack templates and deposit/merge behavior.
13. Build-my-stack AI route and selected-tool deposit behavior.
14. Compare mode and deterministic matrix generation.
15. Deterministic overlap insights.
16. Brain graph software/tool nodes.
17. i18n routing through `getVaultUiCopy()`.
18. Supabase RLS and per-user ownership.

---

## 3. AI-First Product Vision

The upgraded product should answer:

> Which tools deserve a place in my life, which stack supports each project, what should I
> stop paying for, and how should I actually use my tools?

The primary interaction should be an AI command bar:

`Ask about a tool, paste a pricing page, or describe a workflow...`

Example commands:

- `Should I add Cursor Pro?`
- `Build a stack for D Festival`
- `What should I cancel?`
- `Find overlapping tools`
- `Pick my default writing tool`
- `Create workflow recipe`
- `Audit my software spending`
- `What tool am I missing?`
- `Compare Tana and Capacities`
- `Research this GitHub repo`
- `Generate manual illustration`
- `Fetch official logo`

The command bar should route into concrete flows, not fake actions. The user may provide:

- Tool name.
- Official/product URL.
- GitHub URL.
- App Store / Google Play URL.
- Pricing page URL.
- Product or pricing screenshot.
- Product description.
- Messy workflow need.
- Project goal.
- "Should I use this?" question.

AI drafts the structure. The user reviews and confirms. Only then is anything saved or
updated.

---

## 4. Architecture Principles

1. Extend the existing vault spine instead of rebuilding it.
2. Keep deterministic heuristics visible and testable.
3. Use AI to enrich, rank, explain, and draft, not to silently mutate data.
4. Store source/provenance metadata with every AI-derived fact.
5. Do not present pricing, GitHub stats, logos, screenshots, or feature claims as verified
   unless sources and confidence are shown.
6. Keep destructive/financial actions as review suggestions only.
7. Prefer explicit link tables for important workflow/project/tool relationships.
8. Use Brain edges for global discovery and reasoning, not as the only persistence for
   feature-specific workflows.
9. Keep cross-module writes behind preview screens.
10. Preserve RLS and authenticated user scoping in every new table and route.

---

## 5. Component Architecture

### 5.1 Page Shell

Add a command layer above current modes:

- `VaultCommandBar`
- `VaultCommandChips`
- `VaultCommandRouter`
- `VaultCommandResultSheet`

The command router classifies user intent and opens one of the real flows below.

### 5.2 Smart Add / Tool Capture

Extend, do not replace:

- `VaultAddDialog`
- `AppCandidatePickerModal`
- `PlanPickerSteps`
- `VaultReviewStep`
- `VaultEntryForm`

Add state for input type, screenshot attachments, should-add result, overlap hints, project
relevance, and suggested links. Preserve the current review block before deposit.

### 5.3 Product Research Agent

New component family, introduced in Phase 1.5:

- `SoftwareProductResearchDialog`
- `SoftwareProductResearchSettings`
- `SoftwareProductResearchInputStep`
- `SoftwareProductResearchProgress`
- `SoftwareProductResearchResult`
- `SoftwareProductResearchSources`
- `SoftwareProductResearchSaveActions`
- `SoftwareProductResearchIllustrationPanel`
- `SoftwareProductResearchGithubPanel`
- `SoftwareProductResearchAlternativesPanel`
- `SoftwareProductResearchIconPanel`

Entry points:

- `VaultAddDialog`: Research Before Adding.
- `VaultDetailModal` / later `ToolIntelligenceModal`: Refresh Product Research.
- `VaultComparePanel`: Research compared tools when relevant.
- `VaultRecommendedStacksPanel`: Research stack tools before deposit when relevant.

### 5.4 Tool Intelligence Modal

Refactor `VaultDetailModal` toward:

- `ToolIntelligenceModal`
- `ToolHero`
- `ToolSnapshotStrip`
- `ToolRoleInMyLife`
- `ToolWorkflowFit`
- `ToolOverlapPanel`
- `ToolKeepCancelUpgradePanel`
- `ToolAlternativesPanel`
- `ToolProjectLinksPanel`
- `ToolResearchPanel`
- `ToolNextActionPanel`

This must keep all existing detail fields and row actions.

### 5.5 Stack Doctor and Overlap Intelligence

Build on:

- `analyzeVaultStackInsights()`
- `VaultOverlapInsightsCard`
- `buildVaultCompareMatrix()`
- `findVaultDuplicateForLibraryTool()`

Add AI enrichment only after deterministic clustering and cost math are available.

### 5.6 Project-to-Stack Builder

Extend `VaultBuildMyStackPanel` and `/api/vault/stack-recommend` so the user can select an
existing project/goal/task context, not only fill a generic form.

### 5.7 Subscription Health / Cost Optimization

Extend `VaultCostDashboard` into a review panel that uses current cost fields, pricing
plan metadata, usage signals, and project/default-tool dependency links.

### 5.8 Workflow Recipes

Add a recipe layer that connects tools to repeatable work:

- Input trigger.
- Required tools.
- Steps.
- Output.
- Related project/task/goal.
- Default tool assumptions.

Recipes should be persisted before being displayed as saved user knowledge.

### 5.9 Default Tool System

Preserve `is_default_stack`, but add a richer system for default jobs:

- `default_tool_for` text remains the user-facing row field.
- A future `software_default_tool_rules` table stores structured default jobs, domains,
  priority, and user confirmation.

### 5.10 Manual Illustration System

Manual-style feature explanation images should be generated only from confirmed features or
source-backed product research. If image generation is unavailable, return a high-quality
prompt only.

---

## 6. API Route Plan

Existing routes to preserve:

- `POST /api/vault/identify`
- `POST /api/vault/autofill`
- `POST /api/vault/stack-recommend`
- `POST /api/vault/icon-upload`
- `GET /api/vault/icon-proxy`

Recommended new routes:

| Route | Purpose | Writes? |
| --- | --- | --- |
| `POST /api/vault/should-add` | Review a potential tool against existing vault, cost, overlap, and project relevance. | No, returns proposal only. |
| `POST /api/vault/product-research` | Product/GitHub/app-store research, official links, sources, logo, alternatives, optional illustration prompt. | May save report only when explicitly requested by a follow-up save action, or route can stay read-only and client calls repository actions. |
| `POST /api/vault/product-research/save` | Persist a reviewed research report. | Yes, user-owned report. |
| `POST /api/vault/product-research/apply` | Apply confirmed research fields to an existing/new vault entry. | Yes, review payload required. |
| `POST /api/vault/brand-assets/fetch` | Fetch official logo/icon candidates. | No or yes only when user confirms save. |
| `POST /api/vault/overlap-audit` | Generate overlap clusters and keep/cancel/downgrade review suggestions. | No, unless saving audit report. |
| `POST /api/vault/project-stack` | Build a stack for a selected project/goal/task context. | No, returns preview. |
| `POST /api/vault/workflow-recipes` | Generate workflow recipe proposals. | No, returns preview. |
| `POST /api/vault/workflow-recipes/save` | Save selected workflow recipe. | Yes. |
| `POST /api/vault/subscription-audit` | Analyze recurring spend and ROI. | No, returns review suggestions. |
| `POST /api/vault/default-tools/recommend` | Recommend default tools for jobs/life areas. | No, returns preview. |
| `POST /api/vault/default-tools/apply` | Apply selected default-tool rules. | Yes, user confirmation required. |
| `POST /api/vault/usage/record` | Record user-triggered usage events such as open/launch. | Yes, non-destructive telemetry. |
| `POST /api/vault/manual-illustration` | Generate or prompt a feature explanation illustration from confirmed facts. | Optional write only after confirmation. |

Every route must authenticate with Supabase, validate input with Zod, return typed errors,
respect quotas where AI is used, and avoid service-role clients for user-scoped data unless a
private server operation is truly required and separately authorized.

---

## 7. Database Schema Plan

Detailed schema is in [`software-vault-data-model.md`](./software-vault-data-model.md).

Recommended future tables:

- `software_product_research_reports`
- `software_brand_assets`
- `software_should_add_reviews`
- `software_tool_links`
- `software_stack_blueprints`
- `software_stack_blueprint_items`
- `software_workflow_recipes`
- `software_workflow_recipe_steps`
- `software_subscription_reviews`
- `software_overlap_groups`
- `software_default_tool_rules`
- `software_usage_events`
- `software_manual_illustrations`

Use the same conventions as recent migrations:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade default auth.uid()`
- `created_at` and `updated_at`
- RLS enabled with policies keyed on `auth.uid() = user_id`
- Composite `(user_id, ...)` indexes for list/filter paths
- JSONB for report snapshots and AI payloads where facts are heterogeneous
- Link tables for project/task/goal/workflow dependencies where queries matter

---

## 8. Smart Add / Tool Capture Upgrade

Phase 1 should extend the existing `VaultAddDialog`:

- Add explicit input modes: name, website URL, GitHub URL, app-store URL, pricing URL,
  screenshot, pricing screenshot, workflow need, and should-add question.
- Keep `/api/vault/identify` as the first classifier where possible.
- Keep `/api/vault/autofill` as the field-generation route, but widen request context.
- Add `/api/vault/should-add` for recommendation, overlap, possible replaces, project
  relevance, cost warning, learning curve, and fields to save.
- Update `VaultReviewStep` to show should-add recommendations, overlap warnings, possible
  replaces, default-tool suggestions, tags, pricing sources, and project links.

No auto-save. No fake pricing verification.

---

## 9. Product Research Agent

The Product Research Agent researches a target before or after adding it:

- App, web app, software, SaaS, GitHub project, open-source tool, app-store app, browser
  extension, developer tool, AI tool, design tool, productivity tool.
- Inputs: name, official site, GitHub repo, App Store / Google Play link, existing vault
  entry.
- Toggles: analysis report, manual illustration prompt/image, icon/logo, alternatives,
  technical GitHub analysis.
- Sources: official website, official documentation, official GitHub, pricing page, app
  stores, README, official screenshots/videos, official brand assets, high-quality reviews
  only when useful.

The result must separate:

- Confirmed facts.
- Source-backed findings.
- Analysis and interpretation.
- Recommendations.
- Unknowns.
- Warnings.

Reports persist only after user review.

---

## 10. Tool Intelligence Modal

The future modal should answer:

- What does this tool actually do for me?
- What workflow does it support?
- What does it replace?
- What overlaps with it?
- Is it worth keeping?
- What is the biggest downside?
- What projects depend on it?
- Should it be default for anything?
- What is the next action?

It must preserve edit/delete/default-stack/related-app behavior and existing detail fields.

---

## 11. Stack Doctor

Stack Doctor is a vault-wide audit:

- Cluster tools by category, tags, use cases, default jobs, pricing, and projects.
- Detect duplicate entries and redundant capabilities.
- Identify missing capabilities for active projects/goals.
- Flag high recurring spend.
- Recommend keep, trial, skip, replace, downgrade-review, cancel-review, or use-existing.

Destructive and financial outputs are review suggestions only. The app must never auto-retire,
cancel, downgrade, buy, or subscribe.

---

## 12. Tool Overlap Map

Overlap Map should combine:

- Deterministic duplicate/URL/name matching.
- Capability tags and default jobs.
- User-selected project/task/goal links.
- Similar pricing/plan roles.
- AI explanation of why tools overlap.

Persist overlap audit results only when the user saves the audit. Do not turn transient AI
analysis into canonical truth automatically.

---

## 13. Subscription Health / Cost Optimization

Cost Optimization should analyze:

- Current recurring monthly estimate.
- Paid tools with no recent usage.
- Paid tools not linked to projects/goals/workflows/default jobs.
- Tool overlap among paid tools.
- Pricing confidence and age.
- Possible downgrade/cancel-review suggestions.

It should show warnings:

- Pricing may be stale unless source-backed and timestamped.
- Cancel/downgrade requires user action outside the app.
- The app does not change billing.

---

## 14. Project-to-Stack Builder

Project Stack Builder should start from an existing project, goal, task cluster, or free-text
brief. It should:

- Read project name, description, status, priority, tags, linked tasks, and goals where
  available.
- Check current vault for usable existing tools first.
- Recommend missing tools only when a capability gap exists.
- Produce a stack preview with core tools, optional tools, setup order, workflow fit,
  overlap warnings, and estimated cost where source-backed or clearly marked estimate.
- Save stack blueprints and links only after user confirmation.

---

## 15. Workflow Recipes

Workflow Recipes should turn a stack into repeatable behavior:

- Trigger: when/why the workflow starts.
- Inputs: documents, tasks, project stage, data needed.
- Tool sequence: which app is used for each step.
- Outputs: deliverable, task, document, decision, or saved note.
- Review: whether the recipe actually saved time or cost.

Recipes can link to software entries, projects, tasks, goals, and Brain edges.

---

## 16. Default Tool System

The current `is_default_stack` flag is useful but broad. The upgraded default system should
support:

- Default by job: writing, coding, design, project planning, automation, notes, accounting.
- Default by project or life area.
- Default by context: solo, team, mobile, open-source, privacy-sensitive.
- Alternatives and exceptions.
- Review history when defaults change.

The user must confirm default changes.

---

## 17. Potential Tool / Should I Add This Mode

This mode evaluates a tool before it enters the vault:

- Identify the product or candidate set.
- Compare against existing tools.
- Check project/goal relevance.
- Estimate cost and learning curve.
- Suggest add, trial first, skip, replace existing, use free tier, or wait.
- Return fields that could be saved if the user confirms.

It should not create a vault entry unless the user chooses to add it from the review step.

---

## 18. Tool Usage Audit

Usage audit should combine:

- `launch_count` and `last_opened_at`.
- Future `software_usage_events`.
- Default-tool status.
- Project/task/goal/workflow dependencies.
- Paid subscription status and plan.
- User-declared role in life.

The result should identify dormant paid tools, underused defaults, tool hoarding, and tools
that are still worth keeping because they support rare but critical workflows.

---

## 19. Page-Level Software Vault Intelligence

The vault page should summarize the whole stack:

- Total monthly spend.
- Default stack health.
- Overlap hotspots.
- Missing capabilities for active projects.
- Tools needing pricing refresh.
- Tools without role/project/workflow links.
- Recent tool decisions.
- Suggested next action.

This should be a persisted or deterministic summary, not a fresh AI call on every render.

---

## 20. Manual Illustration / Feature Explanation Image System

The system should produce beginner-friendly manual-style visuals:

- 16:9 horizontal.
- Product name and official icon/logo if source-backed.
- One-line explanation.
- Feature breakdown.
- Step-by-step user flow.
- Labels, arrows, callouts, and UI-style panels.
- No fake features.
- Simplified UI mockups only when based on confirmed features.

If image generation is unavailable, return a prompt only. Generated images should store
source facts and prompt provenance.

---

## 21. Safety and Trust Rules

Binding rules:

1. Do not bypass RLS.
2. Do not auto-delete, auto-retire, auto-cancel, auto-purchase, or auto-subscribe.
3. Do not open external accounts or change billing.
4. Do not save AI-derived changes without review.
5. Do not hallucinate pricing, logos, screenshots, features, GitHub stats, repo activity,
   license, or technical details.
6. Separate confirmed facts, source-backed findings, analysis, recommendations, unknowns,
   and warnings.
7. Show sources and confidence for facts.
8. Mark estimates as estimates.
9. Keep destructive/financial recommendations framed as review suggestions.
10. Keep user control at every persistence boundary.

---

## 22. Implementation Phases

Implementation order is locked:

1. Phase 0 - Architecture Lock.
2. Phase 1 - AI Tool Capture / Smart Add Upgrade.
3. Phase 1.5 - Product Research Agent.
4. Phase 2 - Tool Intelligence Modal.
5. Phase 3 - Stack Doctor + Overlap Intelligence.
6. Phase 4 - Project-to-Stack Builder.
7. Phase 5 - Subscription / Cost Optimization.
8. Phase 6 - Workflow Recipes.
9. Phase 7 - Tool Usage + Default Tool System.
10. Phase 8 - Page-Level Software Vault Intelligence.
11. Phase 9 - Dynamic Visual Polish.
12. Phase 10 - QA / Hardening.

Stop after every phase and report before continuing.

---

## 23. Testing Strategy

Testing should scale by phase:

- Unit tests for deterministic helpers: input classification, duplicate detection, cost
  normalization, overlap clusters, recommendation rules, and payload normalizers.
- Route tests for Zod validation, auth failures, quota failures, malformed AI output, and
  "no writes before confirmation" contracts.
- Repository tests or integration checks for new tables, RLS expectations, and update flows.
- Component tests for review gates and enabled/disabled sections.
- Manual QA for Smart Add, candidate picker, plan picker, review save, edit, detail modal,
  recommended stack deposit, build-my-stack, compare, and icon upload.
- Regression checks per implementation phase:
  `npm run lint --prefix app`
  `npm run test --prefix app`
  `npm run build --prefix app`

Phase 0 is documentation only, so no app behavior changes are expected.
