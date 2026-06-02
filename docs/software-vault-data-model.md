# Software Vault -> Tool Stack Intelligence OS - Data Model

**Phase 0 Architecture Lock.** This is the data model plan for upgrading Software Vault
into the Tool Stack Intelligence OS. It documents current schema and future schema
recommendations only. Phase 0 creates no migrations.

Companions:

- [`software-vault-tool-stack-os-architecture.md`](./software-vault-tool-stack-os-architecture.md)
- [`software-vault-tool-stack-os-roadmap.md`](./software-vault-tool-stack-os-roadmap.md)
- [`software-vault-ai-policy.md`](./software-vault-ai-policy.md)

---

## 1. Current Tables and Storage

### 1.1 `software_vault`

Canonical persisted tool entries.

Current row type: `SoftwareVaultEntry` in `app/src/types/database.ts`.

Current repository: `app/src/lib/repositories/software-vault.ts`.

Current fields:

| Group | Fields |
| --- | --- |
| Identity | `id`, `user_id`, `created_at`, `updated_at` |
| Product | `app_name`, `website_url`, `icon_url`, `category`, `platforms`, `summary` |
| Usage | `use_cases`, `status`, `priority`, `why_i_use_it`, `best_feature`, `biggest_downside`, `best_alternative`, `replaces`, `tags`, `default_tool_for` |
| Cost | `cost_type`, `cost_amount`, `cost_period`, `cost_currency`, `billing_cycle`, `selected_plan_id`, `pricing_plans`, `pricing_last_checked_at` |
| AI provenance | `ai_generated_fields`, `alternative_options`, `field_sources`, `field_confidence` |
| Usage/default | `is_default_stack`, `launch_count`, `last_opened_at` |

Existing enum-like constraints:

- `status`: `Testing`, `Active`, `Retired`, `Wishlist`
- `priority`: `Must-have`, `Nice-to-have`, `Optional`
- `cost_type`: `Free`, `Freemium`, `Paid`, `Subscription`
- `billing_cycle`: `monthly`, `annually`, `one-time`, `usage-based`, `unknown`

Existing indexes from vault migrations:

- `idx_software_vault_user`
- `idx_software_vault_category`
- `idx_software_vault_status`
- `idx_software_vault_default_stack`
- `idx_software_vault_pricing_plans`
- `idx_software_vault_field_confidence`

### 1.2 `vault_autofill_rate_limit`

One row per user per hour window.

Fields:

- `user_id`
- `window_start`
- `count`
- `updated_at`

Primary key: `(user_id, window_start)`.

RLS: enabled and scoped to `auth.uid() = user_id` for select/insert/update.

### 1.3 Storage Bucket `vault-icons`

Public bucket for vault icons.

Policy model:

- Public read for bucket objects.
- Authenticated insert/update/delete only when object path folder starts with
  `auth.uid()`.

Current upload limit: 2 MB.

Allowed mime types include PNG, JPEG, WebP, SVG, ICO, and related icon formats.

---

## 2. Current Cross-Module Data Available

The Tool Stack OS should reuse existing modules instead of duplicating them.

### 2.1 Projects

Type: `Project`

Useful fields:

- `id`, `user_id`, `name`, `description`, `status`, `priority`, `tags`,
  `thumbnail_url`, `created_at`, `updated_at`

Potential vault use:

- Project-to-stack building.
- Tool dependency links.
- Missing capability analysis.

### 2.2 Tasks

Type: `Task`

Useful fields:

- `project_id`, `title`, `description`, `status`, `priority`, `due_date`,
  `scheduled_date`, `tags`, `category`, `ai_generated`, `ai_metadata`

Potential vault use:

- Workflow need detection.
- Project stack context.
- Tool usage/workflow recipe links.

### 2.3 Goals

Type: `Goal`

Useful fields:

- `name`, `description`, `status`, `target_date`, `category`

Potential vault use:

- Goal-to-stack recommendations.
- Default tool rules by life area or goal.

### 2.4 Assets and Documents

Types: `Asset`, `Document`, DocOracle knowledge-document tables.

Useful fields:

- Assets: `name`, `category_key`, `value`, `current_value`, `document_id`, `notes`
- Documents: `name`, `document_type`, `file_url`, `notes`
- DocOracle: document analyses, sections, glossary, visual assets, chunks, chat sessions

Potential vault use:

- Tool documentation recipes.
- Manual illustrations and generated explanation artifacts.
- Links between software and hardware/assets when relevant.

### 2.5 Finance

Types:

- `FinanceAccount`
- `FinanceTransaction`
- `FinanceBudget`
- `FinanceCategory`
- `SavingsGoal`

Potential vault use:

- Subscription spend analysis.
- Possible transaction matching by vendor name.
- Budget category review.

### 2.6 Brain Graph

Current software integration:

- `softwareToGraph()` emits legacy constellation software nodes.
- `softwareToBrainNodes()` emits rich Brain `tool` nodes.
- Brain supports persisted `brain_relations` and `brain_edges`.

Potential vault use:

- Tool -> project/task/goal/workflow edges.
- Suggested connections.
- Global discovery of orphaned tools.

---

## 3. Data Model Conventions for New Tables

Future migrations should follow current Supabase conventions:

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

RLS:

- Enable RLS on every public table.
- Use `auth.uid() = user_id` for select/insert/update/delete policies unless a stricter
  model is required.
- For update policies, include both `USING` and `WITH CHECK`.

Triggers:

- Use the shared `touch_updated_at()` style trigger if available in the repo's migration
  conventions.

Indexes:

- Add `(user_id, ...)` composite indexes for list and filter paths.
- Add FK indexes.
- Use GIN indexes for JSONB fields only when queried.

Enums:

- Prefer `text` plus `CHECK` constraints for new flexible domain enums.
- Do not alter existing enum-like Software Vault fields unless a phase explicitly requires it.

---

## 4. Recommended Tables

### 4.1 `software_product_research_reports`

Stores reviewed product research reports.

Required for Phase 1.5.

Fields:

```text
id uuid primary key
user_id uuid not null
software_vault_entry_id uuid null references software_vault(id) on delete set null
product_name text not null
target_url text null
category text null
settings_json jsonb not null default '{}'
report_json jsonb not null
sources_json jsonb not null default '[]'
icon_logo_json jsonb null
manual_illustration_prompt text null
manual_illustration_url text null
model_used text null
generated_at timestamptz default now()
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested indexes:

- `(user_id, generated_at desc)`
- `(user_id, software_vault_entry_id)`
- `(user_id, product_name)`

RLS: `auth.uid() = user_id`.

Notes:

- `report_json` stores the validated Product Research Agent output.
- `sources_json` is denormalized so reports remain auditable even if external pages change.
- Do not overwrite a report when refreshing. Create a new report or update only when the user
  explicitly chooses refresh semantics.

### 4.2 `software_brand_assets`

Stores fetched official icons/logos/brand assets.

Required for Phase 1.5.

Fields:

```text
id uuid primary key
user_id uuid not null
software_vault_entry_id uuid null references software_vault(id) on delete set null
product_name text not null
asset_type text not null
image_url text not null
source_url text null
source_type text null
confidence text null
is_primary boolean not null default false
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested checks:

- `asset_type in ('icon', 'logo', 'wordmark', 'favicon', 'screenshot', 'brand_asset')`
- `confidence in ('high', 'medium', 'low')`

Suggested indexes:

- `(user_id, software_vault_entry_id)`
- `(user_id, product_name)`
- Partial unique primary asset:
  `(user_id, software_vault_entry_id) where is_primary = true and software_vault_entry_id is not null`

RLS: `auth.uid() = user_id`.

### 4.3 `software_should_add_reviews`

Optional table for saving Should-I-Add decision history.

Fields:

```text
id uuid primary key
user_id uuid not null
query text not null
target_url text null
candidate_json jsonb null
recommendation text not null
reason text not null
overlap_json jsonb not null default '[]'
project_relevance_json jsonb not null default '[]'
cost_warning text null
learning_curve text null
suggested_trial_period text null
fields_to_save_json jsonb not null default '{}'
sources_json jsonb not null default '[]'
unknowns_json jsonb not null default '[]'
warnings_json jsonb not null default '[]'
accepted_action text null
created_vault_entry_id uuid null references software_vault(id) on delete set null
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested checks:

- `recommendation in ('add','trial_first','skip','replace_existing','use_free_tier','wait')`
- `accepted_action is null or accepted_action in ('added','skipped','trial_created','dismissed')`

Use:

- Persist only if the product needs decision history. Phase 1 can remain transient.

### 4.4 `software_tool_links`

Canonical link table between software entries and other Life OS entities.

Fields:

```text
id uuid primary key
user_id uuid not null
software_vault_entry_id uuid not null references software_vault(id) on delete cascade
target_type text not null
target_id uuid null
target_label text null
target_url text null
relationship_type text not null
role text null
confidence text not null default 'user_confirmed'
source text not null default 'user'
metadata jsonb not null default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested `target_type` values:

- `project`
- `task`
- `goal`
- `asset`
- `document`
- `finance_account`
- `finance_transaction`
- `workflow_recipe`
- `stack_blueprint`
- `life_area`
- `external`

Suggested `relationship_type` values:

- `supports`
- `depends_on`
- `used_for`
- `replaces`
- `overlaps`
- `default_for`
- `documents`
- `paid_by`
- `used_in_recipe`

Suggested indexes:

- `(user_id, software_vault_entry_id)`
- `(user_id, target_type, target_id)`
- `(user_id, relationship_type)`

Why this table exists:

- Brain edges are good for global graph discovery, but feature workflows need queryable,
  domain-specific links.

### 4.5 `software_stack_blueprints`

Saved project/life/workflow-specific stacks.

Fields:

```text
id uuid primary key
user_id uuid not null
name text not null
description text null
source_type text not null default 'manual'
project_id uuid null references projects(id) on delete set null
goal_id uuid null references goals(id) on delete set null
status text not null default 'draft'
estimated_monthly_cost_usd numeric null
rationale text null
setup_order_json jsonb not null default '[]'
overlap_warnings_json jsonb not null default '[]'
sources_json jsonb not null default '[]'
model_used text null
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested checks:

- `source_type in ('manual','ai_project_stack','curated_template','command_bar')`
- `status in ('draft','active','archived')`

### 4.6 `software_stack_blueprint_items`

Tools inside a saved stack blueprint.

Fields:

```text
id uuid primary key
user_id uuid not null
stack_blueprint_id uuid not null references software_stack_blueprints(id) on delete cascade
software_vault_entry_id uuid null references software_vault(id) on delete set null
tool_name text not null
website_url text null
role_in_stack text null
is_required boolean not null default true
sort_order integer not null default 0
estimated_monthly_cost_usd numeric null
source text not null default 'user'
metadata jsonb not null default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Use:

- Allows stacks to include existing vault tools and not-yet-added recommendations.

### 4.7 `software_workflow_recipes`

Saved workflow recipes.

Fields:

```text
id uuid primary key
user_id uuid not null
name text not null
summary text null
trigger_text text null
output_text text null
project_id uuid null references projects(id) on delete set null
goal_id uuid null references goals(id) on delete set null
status text not null default 'draft'
source text not null default 'user'
model_used text null
metadata jsonb not null default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested checks:

- `status in ('draft','active','archived')`
- `source in ('user','ai','curated')`

### 4.8 `software_workflow_recipe_steps`

Steps inside a workflow recipe.

Fields:

```text
id uuid primary key
user_id uuid not null
workflow_recipe_id uuid not null references software_workflow_recipes(id) on delete cascade
software_vault_entry_id uuid null references software_vault(id) on delete set null
step_number integer not null
title text not null
instruction text not null
expected_output text null
metadata jsonb not null default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested indexes:

- `(user_id, workflow_recipe_id, step_number)`
- `(user_id, software_vault_entry_id)`

### 4.9 `software_subscription_reviews`

Saved subscription/cost audit results.

Fields:

```text
id uuid primary key
user_id uuid not null
software_vault_entry_id uuid null references software_vault(id) on delete cascade
review_type text not null
recommendation text not null
reason text not null
monthly_cost_usd numeric null
pricing_confidence text null
pricing_source_url text null
usage_summary text null
dependency_summary text null
status text not null default 'open'
metadata jsonb not null default '{}'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested `review_type`:

- `cost_audit`
- `downgrade_review`
- `cancel_review`
- `roi_review`
- `stale_pricing`

Suggested `recommendation`:

- `keep`
- `review`
- `downgrade_review`
- `cancel_review`
- `use_free_tier`
- `wait`

This table stores review state only. It must not represent actual billing changes.

### 4.10 `software_overlap_groups`

Saved overlap audit groups.

Fields:

```text
id uuid primary key
user_id uuid not null
title text not null
summary text null
severity text not null default 'info'
group_type text not null
entry_ids uuid[] not null default '{}'
evidence_json jsonb not null default '{}'
recommendations_json jsonb not null default '[]'
status text not null default 'open'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested checks:

- `severity in ('info','notice','warning')`
- `status in ('open','reviewed','dismissed')`

### 4.11 `software_default_tool_rules`

Structured defaults beyond `is_default_stack`.

Fields:

```text
id uuid primary key
user_id uuid not null
software_vault_entry_id uuid not null references software_vault(id) on delete cascade
job_key text not null
job_label text not null
scope_type text not null default 'global'
scope_id uuid null
scope_label text null
priority integer not null default 100
is_active boolean not null default true
reason text null
source text not null default 'user'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested `scope_type`:

- `global`
- `project`
- `goal`
- `life_area`
- `workflow_recipe`

Suggested indexes:

- `(user_id, job_key, scope_type, scope_id) where is_active = true`
- `(user_id, software_vault_entry_id)`

Use:

- Lets one tool be the default writing tool globally, while another is default for a specific
  project.

### 4.12 `software_usage_events`

Append-only usage telemetry for user-triggered events.

Fields:

```text
id uuid primary key
user_id uuid not null
software_vault_entry_id uuid not null references software_vault(id) on delete cascade
event_type text not null
event_at timestamptz not null default now()
project_id uuid null references projects(id) on delete set null
task_id uuid null references tasks(id) on delete set null
metadata jsonb not null default '{}'
created_at timestamptz default now()
```

Suggested `event_type`:

- `opened`
- `used_in_recipe`
- `linked_to_project`
- `pricing_reviewed`
- `research_refreshed`
- `manually_marked_used`

Retention:

- Decide in Phase 7 whether to keep indefinitely or aggregate after a retention window.

### 4.13 `software_manual_illustrations`

Stores generated manual-style illustration prompts/images.

Fields:

```text
id uuid primary key
user_id uuid not null
software_vault_entry_id uuid null references software_vault(id) on delete set null
product_research_report_id uuid null references software_product_research_reports(id) on delete set null
product_name text not null
prompt text not null
image_url text null
source_facts_json jsonb not null default '[]'
settings_json jsonb not null default '{}'
model_used text null
status text not null default 'prompt_only'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Suggested checks:

- `status in ('prompt_only','generated','failed','archived')`

Use:

- Keeps generated illustrations auditable and tied to the facts they were based on.

---

## 5. Existing `software_vault` Extension Candidates

Avoid duplicating current fields. Add columns only when a value belongs on the canonical tool
row and is read frequently.

Possible future columns:

| Column | Type | Reason |
| --- | --- | --- |
| `research_last_checked_at` | `timestamptz` | Fast stale research indicator. |
| `latest_research_report_id` | `uuid null` | Optional pointer to latest saved report. |
| `subscription_review_status` | `text null` | Fast badge only if reviews become common. |
| `role_in_life` | `text null` | Only if `why_i_use_it` and `default_tool_for` prove insufficient. |

Do not add these until a phase proves the read path needs them.

---

## 6. API to Persistence Mapping

| Flow | Reads | Writes |
| --- | --- | --- |
| Identify | none or public source fetches | none |
| Autofill | public sources, optional GitHub, current user auth | `software_vault` only after review |
| Should-I-Add | `software_vault`, optional projects/tasks/goals | optional `software_should_add_reviews`; no vault write until add confirmed |
| Product Research | public sources, optional existing vault row | `software_product_research_reports` after review |
| Fetch Logo | public/official logo sources | `software_brand_assets` only after review |
| Apply Research | reviewed report and user-selected fields | `software_vault`, `software_brand_assets`, optional links |
| Project Stack | projects/tasks/goals, vault rows | `software_stack_blueprints`, items, links after confirmation |
| Workflow Recipe | vault rows, projects/tasks/goals | recipe tables and links after confirmation |
| Subscription Audit | vault rows, usage events, finance context if enabled | review table after confirmation |
| Default Tool Apply | vault rows | `software_default_tool_rules`, optional `software_vault.is_default_stack` |
| Usage Record | vault row | `software_usage_events`, optional increment `launch_count`/`last_opened_at` |

---

## 7. Brain Integration Plan

Keep two layers:

1. Feature-specific links in `software_tool_links`.
2. Global graph edges in `brain_edges` or `brain_relations`.

When a user confirms a meaningful tool relationship, a future phase may create:

- A `software_tool_links` row for queryable vault behavior.
- A Brain edge for cross-module discovery.

Suggested Brain relationship mapping:

| Vault relationship | Brain edge type |
| --- | --- |
| Tool supports project | `part_of_project` or `explicit_link` |
| Tool supports goal | `supports_goal` |
| Tool linked to task | `linked_to_task` |
| Tool linked to finance/subscription | `linked_to_finance` |
| Tool used in workflow | `explicit_link` with metadata kind `workflow` |
| Tool default for job | `user_confirmed` or `explicit_link` |

Do not rely only on Brain edges for vault workflow queries.

---

## 8. RLS and Security Notes

Every new public table must:

- Enable RLS.
- Scope all policies to `auth.uid() = user_id`.
- Include `WITH CHECK (auth.uid() = user_id)` for inserts and updates.
- Avoid security-definer functions in exposed schemas unless absolutely required.
- Keep user-supplied URLs and AI output as data, not executable content.

Storage:

- If future generated illustrations use storage, follow the `vault-icons` path convention:
  path starts with the authenticated user's id.

Views:

- If future reporting views are created, use `security_invoker = true` on supported Postgres
  versions or keep views out of exposed schemas.

---

## 9. Migration Sequencing

Recommended order:

1. Phase 1: no required schema unless saving should-add history.
2. Phase 1.5: create `software_product_research_reports` and `software_brand_assets`.
3. Phase 2: no required schema if reading existing reports/assets.
4. Phase 3: optional `software_overlap_groups`.
5. Phase 4: create stack blueprint and tool link tables.
6. Phase 5: create subscription review table if saved audits are needed.
7. Phase 6: create workflow recipe tables.
8. Phase 7: create usage events and default tool rules.
9. Phase 8: optional page-level summary/audit table if cached summaries are needed.
10. Phase 9/10: only hardening/backfill migrations.

Each migration should be additive and idempotent where possible.

---

## 10. Type and Repository Plan

Future additions should follow current repo structure:

- Types:
  - Extend `app/src/types/database.ts` for table row types.
  - Add domain-specific types under `app/src/types/` when shapes become large.
  - Add Zod schemas under `app/src/lib/vault/` or `app/src/lib/ai/schemas/vault/`.
- Repositories:
  - Keep `softwareVaultRepository` focused on `software_vault`.
  - Add small repositories for reports, brand assets, stacks, recipes, links, reviews, and
    usage events.
- Hooks:
  - Add TanStack Query hooks next to `use-software-vault.ts` or split by domain if large.
- Store:
  - Keep transient UI mode state in `vault-store.ts`.
  - Do not store persisted AI facts in Zustand except as temporary dialog state.

---

## 11. Current Data Gaps

Current schema can store a good tool entry, but it does not yet persist:

- Product research report history.
- Official logo/brand asset provenance beyond `icon_url`.
- Should-I-Add decision history.
- Structured links to projects/tasks/goals/workflows.
- Saved project-specific stacks.
- Saved workflow recipes.
- Subscription review state.
- Overlap audit groups.
- Structured default tool rules.
- Granular usage events.
- Manual illustration prompts/images and source-fact provenance.

These gaps map directly to the future phases.

---

## 12. Phase 1 Data Recommendation

Phase 1 can be implemented without a migration if Should-I-Add remains transient. The
existing `software_vault` row can already store:

- Confirmed tool fields.
- Pricing plans.
- Selected plan.
- Alternatives.
- Field sources.
- Field confidence.
- AI-generated field names.
- Pricing checked timestamp.
- Default-stack flag.

Recommended Phase 1 stance:

- Do not create new tables unless the UI needs saved should-add history.
- Extend TypeScript/Zod contracts for should-add.
- Keep all AI review output in dialog state until the user confirms add.
- Persist only the final confirmed vault entry.

This keeps Phase 1 small and protects the existing add flow.
