# Software Vault -> Tool Stack Intelligence OS - Roadmap

**Phase 0 Architecture Lock.** This roadmap controls implementation order for the Software
Vault upgrade. Do not skip phases. Do not continue from one phase to the next without an
explicit user instruction.

Companions:

- [`software-vault-tool-stack-os-architecture.md`](./software-vault-tool-stack-os-architecture.md)
- [`software-vault-ai-policy.md`](./software-vault-ai-policy.md)
- [`software-vault-data-model.md`](./software-vault-data-model.md)

---

## Phase Status

| Phase | Status | Scope |
| --- | --- | --- |
| 0 | Complete when docs are accepted | Architecture only. No app code, migrations, UI, or placeholder components. |
| 1 | Not started | AI Tool Capture / Smart Add Upgrade. |
| 1.5 | Not started | Product Research Agent. |
| 2 | Not started | Tool Intelligence Modal. |
| 3 | Not started | Stack Doctor + Overlap Intelligence. |
| 4 | Not started | Project-to-Stack Builder. |
| 5 | Not started | Subscription / Cost Optimization. |
| 6 | Not started | Workflow Recipes. |
| 7 | Not started | Tool Usage + Default Tool System. |
| 8 | Not started | Page-Level Software Vault Intelligence. |
| 9 | Not started | Dynamic Visual Polish. |
| 10 | Not started | QA / Hardening. |

---

## Global Phase Rules

Every phase must be:

- Additive and integrated with the existing Software Vault architecture.
- Persistent where the feature claims persistence.
- Review-first for AI-generated changes.
- Protected by Supabase auth/RLS.
- Tested at the right level for the risk.
- Documented in this roadmap or companion docs.
- Reported before stopping.

Every phase report must include:

1. What was implemented.
2. Files changed.
3. Database changes.
4. API routes added or updated.
5. How to test.
6. Known risks.
7. What remains for the next phase.
8. Lint/test/build status.

Checks to run when relevant:

```bash
npm run lint --prefix app
npm run test --prefix app
npm run build --prefix app
```

If failures are unrelated existing issues, report them clearly.

---

## Phase 0 - Architecture Lock

Goal: inspect the current Software Vault and adjacent modules, then create the planning
documents.

Deliverables:

- `docs/software-vault-tool-stack-os-architecture.md`
- `docs/software-vault-tool-stack-os-roadmap.md`
- `docs/software-vault-ai-policy.md`
- `docs/software-vault-data-model.md`

Rules:

- Do not write app code.
- Do not create UI.
- Do not create migrations.
- Do not create placeholder components.

Exit criteria:

- Current vault system summarized.
- Existing features to preserve listed.
- Future schema/API/component architecture proposed.
- AI policy and safety rules documented.
- Phase 1 plan defined.

---

## Phase 1 - AI Tool Capture / Smart Add Upgrade

Goal: upgrade the existing Smart Add flow so the user can add tools with almost no typing.

Existing pieces to preserve:

- `VaultAddDialog`
- `AppCandidatePickerModal`
- `PlanPickerSteps`
- `VaultReviewStep`
- `VaultEntryForm`
- `/api/vault/identify`
- `/api/vault/autofill`
- `softwareVaultRepository.create()`

Implementation scope:

- Add support for tool name, website URL, GitHub URL, app-store URL, pricing URL, screenshot,
  pricing screenshot, workflow need, and should-add question.
- Extend identify/autofill request context without breaking the current name/URL path.
- Add `POST /api/vault/should-add`.
- Add response shape for:
  - recommendation: `add`, `trial_first`, `skip`, `replace_existing`, `use_free_tier`, `wait`
  - reason
  - overlap with existing tools
  - tools it might replace
  - project relevance
  - cost warning
  - learning curve
  - suggested trial period
  - fields to save if confirmed
- Update review UI to show AI-filled fields, confidence, pricing sources, alternatives,
  overlap warnings, possible replaces, recommended default jobs, suggested tags, project
  links, and should-add recommendation.

Persistence:

- Continue saving confirmed entries into `software_vault`.
- If Phase 1 needs persisted should-add history, add `software_should_add_reviews` only after
  migration review. Otherwise keep should-add as a transient review result.

Acceptance criteria:

- Smart Add supports tool name, URL, and need-based input.
- Should-I-Add mode exists and is review-first.
- Existing add flow still works.
- Pricing plan picker still works.
- Candidate picker still works.
- Confidence/source metadata is preserved.
- No fake pricing verification.

Suggested tests:

- Unit: input mode detection and should-add recommendation normalization.
- Route: invalid request, unauthenticated, rate limited, malformed AI output.
- UI/manual: add by name, official URL, GitHub URL, need text, and manual fallback.

---

## Phase 1.5 - Product Research Agent

Goal: create the Product Research Agent for Software Vault.

Implementation scope:

- Components:
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
- Entry points:
  - `VaultAddDialog`
  - `VaultDetailModal` or Phase 2 modal
  - `VaultComparePanel` where relevant
  - `VaultRecommendedStacksPanel` where relevant
- API:
  - `POST /api/vault/product-research`
  - Optional save/apply routes if not handled through repositories.
- Tables:
  - `software_product_research_reports`
  - `software_brand_assets`

Settings:

- Generate Analysis Report: default yes.
- Generate Manual Illustration / Feature Explanation Image: default no.
- Fetch Icon / Logo: default yes.
- Include Similar Products / Alternatives: default yes.
- Include Technical GitHub Analysis: default only if GitHub repo is available.

Acceptance criteria:

- User can research by product name, website URL, GitHub URL, and existing vault entry.
- Toggles control output sections.
- Official/high-quality sources are tracked.
- Report persists after user confirmation.
- Report can attach to a vault entry.
- User can create/update vault entry only after confirmation.
- GitHub analysis appears only when enabled and repo exists.
- Alternatives appear only when enabled.
- Manual illustration prompt appears only when enabled.
- No hallucinated product claims, logos, screenshots, pricing, or repo stats.

Suggested tests:

- Route output validation against Zod.
- GitHub URL detection and stats unknown handling.
- Toggle gating: disabled sections are not generated.
- Report persistence and RLS.

---

## Phase 2 - Tool Intelligence Modal

Goal: upgrade `VaultDetailModal` into a Tool Intelligence Modal without removing existing
detail behavior.

Implementation scope:

- Create/refactor toward:
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
- Add tabs or structured sections for role, usage, cost, overlap, research, projects, and
  next action.
- Preserve edit/delete/default-stack/related-app flows.

Persistence:

- Read existing `software_vault`.
- Read research reports and brand assets from Phase 1.5 if present.
- Use future link tables only if they have been created.

Acceptance criteria:

- Existing detail fields still render.
- Existing edit/delete/default stack behavior still works.
- Modal answers role, workflow, overlap, keep/cancel-review, projects, defaults, and next
  action from persisted/deterministic data.

---

## Phase 3 - Stack Doctor + Overlap Intelligence

Goal: detect overlap, fragmentation, redundancy, and gaps across the user's tool stack.

Implementation scope:

- Extend deterministic helpers first:
  - duplicate name/URL detection
  - category/use-case/default-job clustering
  - cost overlap
  - project/goal/workflow dependency overlap
  - missing documentation, automation, communication, storage, or finance layers
- Add AI explanation after deterministic clusters exist.
- Add `POST /api/vault/overlap-audit` only when a route is needed.
- Optional table: `software_overlap_groups` for saved audits.

Acceptance criteria:

- Finds obvious duplicate/redundant tools.
- Explains overlap with sources or vault fields.
- Shows review suggestions, not commands.
- Does not auto-delete, retire, or cancel anything.

---

## Phase 4 - Project-to-Stack Builder

Goal: build project-specific software stacks from real Life OS project/goal/task context.

Implementation scope:

- Extend `VaultBuildMyStackPanel` or add a project-specific flow.
- Allow selecting an existing project, goal, or task cluster.
- Pull project name, description, tags, status, priority, active tasks, and linked goals.
- Reuse existing vault tools before recommending new ones.
- Add `POST /api/vault/project-stack`.
- Persist confirmed stack blueprints:
  - `software_stack_blueprints`
  - `software_stack_blueprint_items`
  - `software_tool_links`

Acceptance criteria:

- User can build a stack for an existing project.
- Existing vault tools are prioritized.
- Missing tools are clearly marked as recommendations.
- Saving a stack requires confirmation.

---

## Phase 5 - Subscription / Cost Optimization

Goal: audit spending, ROI, paid overlap, and possible cancel/downgrade reviews.

Implementation scope:

- Extend `VaultCostDashboard` into a richer subscription health surface.
- Add `POST /api/vault/subscription-audit`.
- Optional table: `software_subscription_reviews`.
- Use `pricing_plans`, selected plan, billing cycle, monthly normalization, usage events,
  default rules, and project/workflow dependencies.

Acceptance criteria:

- Shows active recurring spend and stale pricing.
- Flags paid tools without usage/dependency signals.
- Recommends cancel-review/downgrade-review/use-free-tier only as review suggestions.
- Does not change billing or external accounts.

---

## Phase 6 - Workflow Recipes

Goal: turn tool stacks into repeatable workflows.

Implementation scope:

- Add recipe generator and save flow.
- API:
  - `POST /api/vault/workflow-recipes`
  - `POST /api/vault/workflow-recipes/save`
- Tables:
  - `software_workflow_recipes`
  - `software_workflow_recipe_steps`
  - `software_tool_links` for recipe links
- Link recipes to tools, projects, tasks, goals, and Brain edges.

Acceptance criteria:

- User can generate and review a workflow recipe.
- User can save a recipe.
- Saved recipe has persisted steps and tool links.
- No placeholder recipe actions.

---

## Phase 7 - Tool Usage + Default Tool System

Goal: make the vault understand which tools are actually used and which tools are defaults
for specific jobs.

Implementation scope:

- Add structured defaults:
  - `software_default_tool_rules`
- Add usage events:
  - `software_usage_events`
- Use existing `launch_count` and `last_opened_at` as backward-compatible summary fields.
- Add default recommendations and apply flow.

Acceptance criteria:

- User can set a default tool for a job/life area/project.
- Defaults can have exceptions.
- Usage is recorded only for user-triggered events.
- Default changes require confirmation.

---

## Phase 8 - Page-Level Software Vault Intelligence

Goal: make the page summarize stack health and route the user to the next best action.

Implementation scope:

- Add page intelligence summary:
  - spend
  - overlap
  - missing capabilities
  - stale research/pricing
  - tools without role links
  - recent decisions
  - next action
- Use deterministic/cache-first data. Avoid AI calls on render.
- Optional saved summary/audit table if history matters.

Acceptance criteria:

- The vault page shows actionable stack health.
- Summary is stable, fast, and not a fresh AI call on every render.
- All actions route to real flows.

---

## Phase 9 - Dynamic Visual Polish

Goal: polish interactions, visual hierarchy, and manual-style educational outputs after the
feature set is real.

Implementation scope:

- Refine command bar, modal layouts, state transitions, responsive behavior, and loading
  states.
- Polish research result and illustration panels.
- Respect reduced motion.
- Verify no text overlap and no fake visual sections.

Acceptance criteria:

- UI feels cohesive with the existing vault and broader app.
- Responsive layouts hold on mobile and desktop.
- Motion is optional and non-blocking.

---

## Phase 10 - QA / Hardening

Goal: full regression pass.

Implementation scope:

- Run lint, tests, and build.
- Add missing tests for route contracts, RLS-sensitive data paths, no-auto-save guarantees,
  and deterministic helpers.
- Manual QA every major vault workflow.
- Review docs and update phase status.

Acceptance criteria:

- No known regressions to existing Software Vault functionality.
- Known issues are documented.
- Safety rules are covered by tests or explicit manual QA.

---

## Recommended Phase 1 Plan

1. Add types and Zod schemas for `should-add` request/response.
2. Implement `POST /api/vault/should-add` as a read-only route.
3. Extend `VaultAddDialog` state to represent input mode and should-add result.
4. Preserve current identify/autofill flow for ordinary name/URL inputs.
5. Add need-based and should-add command routing into the existing dialog stages.
6. Extend `VaultReviewStep` to render overlap, replaces, project relevance, suggested tags,
   default-tool suggestion, and should-add recommendation.
7. Add focused tests for schemas, route failures, and no-save-until-review behavior.
8. Run lint/test/build and report.
