-- Software Vault Tool Stack Intelligence OS.
-- Additive persistence layer for product research, stack planning, workflow recipes,
-- subscription reviews, overlap audits, default-tool rules, and usage events.

CREATE OR REPLACE FUNCTION public.software_vault_tool_stack_os_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.software_product_research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  software_vault_entry_id uuid REFERENCES public.software_vault(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  target_url text,
  category text,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_json jsonb NOT NULL,
  sources_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  icon_logo_json jsonb,
  manual_illustration_prompt text,
  manual_illustration_url text,
  model_used text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS software_product_research_reports_user_generated_idx
  ON public.software_product_research_reports(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS software_product_research_reports_entry_idx
  ON public.software_product_research_reports(user_id, software_vault_entry_id);
CREATE INDEX IF NOT EXISTS software_product_research_reports_product_idx
  ON public.software_product_research_reports(user_id, product_name);

DROP TRIGGER IF EXISTS software_product_research_reports_set_updated_at
  ON public.software_product_research_reports;
CREATE TRIGGER software_product_research_reports_set_updated_at
  BEFORE UPDATE ON public.software_product_research_reports
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_product_research_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS software_product_research_reports_select_own ON public.software_product_research_reports;
CREATE POLICY software_product_research_reports_select_own
  ON public.software_product_research_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_product_research_reports_insert_own ON public.software_product_research_reports;
CREATE POLICY software_product_research_reports_insert_own
  ON public.software_product_research_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_product_research_reports_update_own ON public.software_product_research_reports;
CREATE POLICY software_product_research_reports_update_own
  ON public.software_product_research_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_product_research_reports_delete_own ON public.software_product_research_reports;
CREATE POLICY software_product_research_reports_delete_own
  ON public.software_product_research_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  software_vault_entry_id uuid REFERENCES public.software_vault(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  asset_type text NOT NULL,
  image_url text NOT NULL,
  source_url text,
  source_type text,
  confidence text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_brand_assets_asset_type_chk
    CHECK (asset_type IN ('icon', 'logo', 'wordmark', 'favicon', 'screenshot', 'brand_asset')),
  CONSTRAINT software_brand_assets_confidence_chk
    CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low'))
);

CREATE INDEX IF NOT EXISTS software_brand_assets_entry_idx
  ON public.software_brand_assets(user_id, software_vault_entry_id);
CREATE INDEX IF NOT EXISTS software_brand_assets_product_idx
  ON public.software_brand_assets(user_id, product_name);
CREATE UNIQUE INDEX IF NOT EXISTS software_brand_assets_one_primary_entry_idx
  ON public.software_brand_assets(user_id, software_vault_entry_id)
  WHERE is_primary = true AND software_vault_entry_id IS NOT NULL;

DROP TRIGGER IF EXISTS software_brand_assets_set_updated_at ON public.software_brand_assets;
CREATE TRIGGER software_brand_assets_set_updated_at
  BEFORE UPDATE ON public.software_brand_assets
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_brand_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_brand_assets_select_own ON public.software_brand_assets;
CREATE POLICY software_brand_assets_select_own ON public.software_brand_assets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_brand_assets_insert_own ON public.software_brand_assets;
CREATE POLICY software_brand_assets_insert_own ON public.software_brand_assets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_brand_assets_update_own ON public.software_brand_assets;
CREATE POLICY software_brand_assets_update_own ON public.software_brand_assets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_brand_assets_delete_own ON public.software_brand_assets;
CREATE POLICY software_brand_assets_delete_own ON public.software_brand_assets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_should_add_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  query text NOT NULL,
  target_url text,
  candidate_json jsonb,
  recommendation text NOT NULL,
  reason text NOT NULL,
  overlap_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  project_relevance_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost_warning text,
  learning_curve text,
  suggested_trial_period text,
  fields_to_save_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  unknowns_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  accepted_action text,
  created_vault_entry_id uuid REFERENCES public.software_vault(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_should_add_recommendation_chk
    CHECK (recommendation IN ('add', 'trial_first', 'skip', 'replace_existing', 'use_free_tier', 'wait')),
  CONSTRAINT software_should_add_accepted_action_chk
    CHECK (accepted_action IS NULL OR accepted_action IN ('added', 'skipped', 'trial_created', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS software_should_add_reviews_user_created_idx
  ON public.software_should_add_reviews(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS software_should_add_reviews_entry_idx
  ON public.software_should_add_reviews(user_id, created_vault_entry_id);

DROP TRIGGER IF EXISTS software_should_add_reviews_set_updated_at ON public.software_should_add_reviews;
CREATE TRIGGER software_should_add_reviews_set_updated_at
  BEFORE UPDATE ON public.software_should_add_reviews
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_should_add_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_should_add_reviews_select_own ON public.software_should_add_reviews;
CREATE POLICY software_should_add_reviews_select_own ON public.software_should_add_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_should_add_reviews_insert_own ON public.software_should_add_reviews;
CREATE POLICY software_should_add_reviews_insert_own ON public.software_should_add_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_should_add_reviews_update_own ON public.software_should_add_reviews;
CREATE POLICY software_should_add_reviews_update_own ON public.software_should_add_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_should_add_reviews_delete_own ON public.software_should_add_reviews;
CREATE POLICY software_should_add_reviews_delete_own ON public.software_should_add_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_tool_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  software_vault_entry_id uuid NOT NULL REFERENCES public.software_vault(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid,
  target_label text,
  target_url text,
  relationship_type text NOT NULL,
  role text,
  confidence text NOT NULL DEFAULT 'user_confirmed',
  source text NOT NULL DEFAULT 'user',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS software_tool_links_entry_idx
  ON public.software_tool_links(user_id, software_vault_entry_id);
CREATE INDEX IF NOT EXISTS software_tool_links_target_idx
  ON public.software_tool_links(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS software_tool_links_relationship_idx
  ON public.software_tool_links(user_id, relationship_type);

DROP TRIGGER IF EXISTS software_tool_links_set_updated_at ON public.software_tool_links;
CREATE TRIGGER software_tool_links_set_updated_at
  BEFORE UPDATE ON public.software_tool_links
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_tool_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_tool_links_select_own ON public.software_tool_links;
CREATE POLICY software_tool_links_select_own ON public.software_tool_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_tool_links_insert_own ON public.software_tool_links;
CREATE POLICY software_tool_links_insert_own ON public.software_tool_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_tool_links_update_own ON public.software_tool_links;
CREATE POLICY software_tool_links_update_own ON public.software_tool_links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_tool_links_delete_own ON public.software_tool_links;
CREATE POLICY software_tool_links_delete_own ON public.software_tool_links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_stack_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  source_type text NOT NULL DEFAULT 'manual',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  estimated_monthly_cost_usd numeric,
  rationale text,
  setup_order_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  overlap_warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_stack_blueprints_source_type_chk
    CHECK (source_type IN ('manual', 'ai_project_stack', 'curated_template', 'command_bar')),
  CONSTRAINT software_stack_blueprints_status_chk
    CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE INDEX IF NOT EXISTS software_stack_blueprints_user_updated_idx
  ON public.software_stack_blueprints(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS software_stack_blueprints_project_idx
  ON public.software_stack_blueprints(user_id, project_id);
CREATE INDEX IF NOT EXISTS software_stack_blueprints_goal_idx
  ON public.software_stack_blueprints(user_id, goal_id);

DROP TRIGGER IF EXISTS software_stack_blueprints_set_updated_at ON public.software_stack_blueprints;
CREATE TRIGGER software_stack_blueprints_set_updated_at
  BEFORE UPDATE ON public.software_stack_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_stack_blueprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_stack_blueprints_select_own ON public.software_stack_blueprints;
CREATE POLICY software_stack_blueprints_select_own ON public.software_stack_blueprints
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_stack_blueprints_insert_own ON public.software_stack_blueprints;
CREATE POLICY software_stack_blueprints_insert_own ON public.software_stack_blueprints
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_stack_blueprints_update_own ON public.software_stack_blueprints;
CREATE POLICY software_stack_blueprints_update_own ON public.software_stack_blueprints
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_stack_blueprints_delete_own ON public.software_stack_blueprints;
CREATE POLICY software_stack_blueprints_delete_own ON public.software_stack_blueprints
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_stack_blueprint_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  stack_blueprint_id uuid NOT NULL REFERENCES public.software_stack_blueprints(id) ON DELETE CASCADE,
  software_vault_entry_id uuid REFERENCES public.software_vault(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  website_url text,
  role_in_stack text,
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  estimated_monthly_cost_usd numeric,
  source text NOT NULL DEFAULT 'user',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS software_stack_blueprint_items_stack_idx
  ON public.software_stack_blueprint_items(user_id, stack_blueprint_id, sort_order);
CREATE INDEX IF NOT EXISTS software_stack_blueprint_items_entry_idx
  ON public.software_stack_blueprint_items(user_id, software_vault_entry_id);

DROP TRIGGER IF EXISTS software_stack_blueprint_items_set_updated_at ON public.software_stack_blueprint_items;
CREATE TRIGGER software_stack_blueprint_items_set_updated_at
  BEFORE UPDATE ON public.software_stack_blueprint_items
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_stack_blueprint_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_stack_blueprint_items_select_own ON public.software_stack_blueprint_items;
CREATE POLICY software_stack_blueprint_items_select_own ON public.software_stack_blueprint_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_stack_blueprint_items_insert_own ON public.software_stack_blueprint_items;
CREATE POLICY software_stack_blueprint_items_insert_own ON public.software_stack_blueprint_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_stack_blueprint_items_update_own ON public.software_stack_blueprint_items;
CREATE POLICY software_stack_blueprint_items_update_own ON public.software_stack_blueprint_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_stack_blueprint_items_delete_own ON public.software_stack_blueprint_items;
CREATE POLICY software_stack_blueprint_items_delete_own ON public.software_stack_blueprint_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_workflow_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name text NOT NULL,
  summary text,
  trigger_text text,
  output_text text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  source text NOT NULL DEFAULT 'user',
  model_used text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_workflow_recipes_status_chk CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT software_workflow_recipes_source_chk CHECK (source IN ('user', 'ai', 'curated'))
);

CREATE INDEX IF NOT EXISTS software_workflow_recipes_user_updated_idx
  ON public.software_workflow_recipes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS software_workflow_recipes_project_idx
  ON public.software_workflow_recipes(user_id, project_id);

DROP TRIGGER IF EXISTS software_workflow_recipes_set_updated_at ON public.software_workflow_recipes;
CREATE TRIGGER software_workflow_recipes_set_updated_at
  BEFORE UPDATE ON public.software_workflow_recipes
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_workflow_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_workflow_recipes_select_own ON public.software_workflow_recipes;
CREATE POLICY software_workflow_recipes_select_own ON public.software_workflow_recipes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_workflow_recipes_insert_own ON public.software_workflow_recipes;
CREATE POLICY software_workflow_recipes_insert_own ON public.software_workflow_recipes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_workflow_recipes_update_own ON public.software_workflow_recipes;
CREATE POLICY software_workflow_recipes_update_own ON public.software_workflow_recipes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_workflow_recipes_delete_own ON public.software_workflow_recipes;
CREATE POLICY software_workflow_recipes_delete_own ON public.software_workflow_recipes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_workflow_recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  workflow_recipe_id uuid NOT NULL REFERENCES public.software_workflow_recipes(id) ON DELETE CASCADE,
  software_vault_entry_id uuid REFERENCES public.software_vault(id) ON DELETE SET NULL,
  step_number integer NOT NULL,
  title text NOT NULL,
  instruction text NOT NULL,
  expected_output text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS software_workflow_recipe_steps_recipe_idx
  ON public.software_workflow_recipe_steps(user_id, workflow_recipe_id, step_number);
CREATE INDEX IF NOT EXISTS software_workflow_recipe_steps_entry_idx
  ON public.software_workflow_recipe_steps(user_id, software_vault_entry_id);

DROP TRIGGER IF EXISTS software_workflow_recipe_steps_set_updated_at ON public.software_workflow_recipe_steps;
CREATE TRIGGER software_workflow_recipe_steps_set_updated_at
  BEFORE UPDATE ON public.software_workflow_recipe_steps
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_workflow_recipe_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_workflow_recipe_steps_select_own ON public.software_workflow_recipe_steps;
CREATE POLICY software_workflow_recipe_steps_select_own ON public.software_workflow_recipe_steps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_workflow_recipe_steps_insert_own ON public.software_workflow_recipe_steps;
CREATE POLICY software_workflow_recipe_steps_insert_own ON public.software_workflow_recipe_steps
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_workflow_recipe_steps_update_own ON public.software_workflow_recipe_steps;
CREATE POLICY software_workflow_recipe_steps_update_own ON public.software_workflow_recipe_steps
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_workflow_recipe_steps_delete_own ON public.software_workflow_recipe_steps;
CREATE POLICY software_workflow_recipe_steps_delete_own ON public.software_workflow_recipe_steps
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_subscription_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  software_vault_entry_id uuid REFERENCES public.software_vault(id) ON DELETE CASCADE,
  review_type text NOT NULL,
  recommendation text NOT NULL,
  reason text NOT NULL,
  monthly_cost_usd numeric,
  pricing_confidence text,
  pricing_source_url text,
  usage_summary text,
  dependency_summary text,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_subscription_reviews_status_chk
    CHECK (status IN ('open', 'reviewed', 'dismissed')),
  CONSTRAINT software_subscription_reviews_recommendation_chk
    CHECK (recommendation IN ('keep', 'review', 'downgrade_review', 'cancel_review', 'use_free_tier', 'wait'))
);

CREATE INDEX IF NOT EXISTS software_subscription_reviews_entry_idx
  ON public.software_subscription_reviews(user_id, software_vault_entry_id, status);
CREATE INDEX IF NOT EXISTS software_subscription_reviews_user_created_idx
  ON public.software_subscription_reviews(user_id, created_at DESC);

DROP TRIGGER IF EXISTS software_subscription_reviews_set_updated_at ON public.software_subscription_reviews;
CREATE TRIGGER software_subscription_reviews_set_updated_at
  BEFORE UPDATE ON public.software_subscription_reviews
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_subscription_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_subscription_reviews_select_own ON public.software_subscription_reviews;
CREATE POLICY software_subscription_reviews_select_own ON public.software_subscription_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_subscription_reviews_insert_own ON public.software_subscription_reviews;
CREATE POLICY software_subscription_reviews_insert_own ON public.software_subscription_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_subscription_reviews_update_own ON public.software_subscription_reviews;
CREATE POLICY software_subscription_reviews_update_own ON public.software_subscription_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_subscription_reviews_delete_own ON public.software_subscription_reviews;
CREATE POLICY software_subscription_reviews_delete_own ON public.software_subscription_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_overlap_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title text NOT NULL,
  summary text,
  severity text NOT NULL DEFAULT 'info',
  group_type text NOT NULL,
  entry_ids uuid[] NOT NULL DEFAULT '{}',
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_overlap_groups_severity_chk CHECK (severity IN ('info', 'notice', 'warning')),
  CONSTRAINT software_overlap_groups_status_chk CHECK (status IN ('open', 'reviewed', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS software_overlap_groups_user_status_idx
  ON public.software_overlap_groups(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS software_overlap_groups_entry_ids_idx
  ON public.software_overlap_groups USING gin(entry_ids);

DROP TRIGGER IF EXISTS software_overlap_groups_set_updated_at ON public.software_overlap_groups;
CREATE TRIGGER software_overlap_groups_set_updated_at
  BEFORE UPDATE ON public.software_overlap_groups
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_overlap_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_overlap_groups_select_own ON public.software_overlap_groups;
CREATE POLICY software_overlap_groups_select_own ON public.software_overlap_groups
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_overlap_groups_insert_own ON public.software_overlap_groups;
CREATE POLICY software_overlap_groups_insert_own ON public.software_overlap_groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_overlap_groups_update_own ON public.software_overlap_groups;
CREATE POLICY software_overlap_groups_update_own ON public.software_overlap_groups
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_overlap_groups_delete_own ON public.software_overlap_groups;
CREATE POLICY software_overlap_groups_delete_own ON public.software_overlap_groups
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_default_tool_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  software_vault_entry_id uuid NOT NULL REFERENCES public.software_vault(id) ON DELETE CASCADE,
  job_key text NOT NULL,
  job_label text NOT NULL,
  scope_type text NOT NULL DEFAULT 'global',
  scope_id uuid,
  scope_label text,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  reason text,
  source text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_default_tool_rules_scope_chk
    CHECK (scope_type IN ('global', 'project', 'goal', 'life_area', 'workflow_recipe')),
  CONSTRAINT software_default_tool_rules_source_chk CHECK (source IN ('user', 'ai', 'system'))
);

CREATE INDEX IF NOT EXISTS software_default_tool_rules_entry_idx
  ON public.software_default_tool_rules(user_id, software_vault_entry_id);
CREATE INDEX IF NOT EXISTS software_default_tool_rules_active_job_idx
  ON public.software_default_tool_rules(user_id, job_key, scope_type, scope_id)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS software_default_tool_rules_set_updated_at ON public.software_default_tool_rules;
CREATE TRIGGER software_default_tool_rules_set_updated_at
  BEFORE UPDATE ON public.software_default_tool_rules
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_default_tool_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_default_tool_rules_select_own ON public.software_default_tool_rules;
CREATE POLICY software_default_tool_rules_select_own ON public.software_default_tool_rules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_default_tool_rules_insert_own ON public.software_default_tool_rules;
CREATE POLICY software_default_tool_rules_insert_own ON public.software_default_tool_rules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_default_tool_rules_update_own ON public.software_default_tool_rules;
CREATE POLICY software_default_tool_rules_update_own ON public.software_default_tool_rules
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_default_tool_rules_delete_own ON public.software_default_tool_rules;
CREATE POLICY software_default_tool_rules_delete_own ON public.software_default_tool_rules
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  software_vault_entry_id uuid NOT NULL REFERENCES public.software_vault(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_usage_events_event_type_chk
    CHECK (event_type IN ('opened', 'used_in_recipe', 'linked_to_project', 'pricing_reviewed', 'research_refreshed', 'manually_marked_used'))
);

CREATE INDEX IF NOT EXISTS software_usage_events_entry_time_idx
  ON public.software_usage_events(user_id, software_vault_entry_id, event_at DESC);
CREATE INDEX IF NOT EXISTS software_usage_events_project_idx
  ON public.software_usage_events(user_id, project_id, event_at DESC);

ALTER TABLE public.software_usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_usage_events_select_own ON public.software_usage_events;
CREATE POLICY software_usage_events_select_own ON public.software_usage_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_usage_events_insert_own ON public.software_usage_events;
CREATE POLICY software_usage_events_insert_own ON public.software_usage_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_usage_events_update_own ON public.software_usage_events;
CREATE POLICY software_usage_events_update_own ON public.software_usage_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_usage_events_delete_own ON public.software_usage_events;
CREATE POLICY software_usage_events_delete_own ON public.software_usage_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.software_manual_illustrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  software_vault_entry_id uuid REFERENCES public.software_vault(id) ON DELETE SET NULL,
  product_research_report_id uuid REFERENCES public.software_product_research_reports(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  prompt text NOT NULL,
  image_url text,
  source_facts_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_used text,
  status text NOT NULL DEFAULT 'prompt_only',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_manual_illustrations_status_chk
    CHECK (status IN ('prompt_only', 'generated', 'failed', 'archived'))
);

CREATE INDEX IF NOT EXISTS software_manual_illustrations_entry_idx
  ON public.software_manual_illustrations(user_id, software_vault_entry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS software_manual_illustrations_report_idx
  ON public.software_manual_illustrations(user_id, product_research_report_id);

DROP TRIGGER IF EXISTS software_manual_illustrations_set_updated_at ON public.software_manual_illustrations;
CREATE TRIGGER software_manual_illustrations_set_updated_at
  BEFORE UPDATE ON public.software_manual_illustrations
  FOR EACH ROW EXECUTE FUNCTION public.software_vault_tool_stack_os_set_updated_at();

ALTER TABLE public.software_manual_illustrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS software_manual_illustrations_select_own ON public.software_manual_illustrations;
CREATE POLICY software_manual_illustrations_select_own ON public.software_manual_illustrations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS software_manual_illustrations_insert_own ON public.software_manual_illustrations;
CREATE POLICY software_manual_illustrations_insert_own ON public.software_manual_illustrations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_manual_illustrations_update_own ON public.software_manual_illustrations;
CREATE POLICY software_manual_illustrations_update_own ON public.software_manual_illustrations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS software_manual_illustrations_delete_own ON public.software_manual_illustrations;
CREATE POLICY software_manual_illustrations_delete_own ON public.software_manual_illustrations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
