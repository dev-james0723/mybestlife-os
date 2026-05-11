-- MyLifeOS Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- ============================================================
-- PROFILES (auto-created on signup)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'zh-TW', 'zh-CN', 'ja', 'ko', 'fr', 'it', 'es', 'vi')),
  timezone TEXT DEFAULT 'auto',
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  ui_theme TEXT DEFAULT 'default' CHECK (ui_theme IN ('default', 'astronaut', 'academia', 'forest')),
  color_mode TEXT DEFAULT 'light' CHECK (color_mode IN ('light', 'dark')),
  focus_areas TEXT[] DEFAULT '{}',
  motto VARCHAR(80),
  dashboard_cover_url TEXT,
  dashboard_widgets JSONB DEFAULT '[]',
  widget_density TEXT DEFAULT 'comfortable' CHECK (widget_density IN ('compact', 'comfortable', 'spacious')),
  focus_mode BOOLEAN DEFAULT false,
  font_size_pref TEXT DEFAULT 'medium' CHECK (font_size_pref IN ('small', 'medium', 'large')),
  greeting_tone TEXT DEFAULT 'friendly' CHECK (greeting_tone IN ('friendly', 'motivational', 'minimal', 'poetic')),
  accent_color_hex VARCHAR(9),
  sidebar_width TEXT DEFAULT 'default' CHECK (sidebar_width IN ('narrow', 'default', 'wide')),
  sidebar_mobile_auto_collapse BOOLEAN DEFAULT true,
  ui_copy_mode TEXT DEFAULT 'en' CHECK (ui_copy_mode IN ('zh-TW', 'en', 'mixed')),
  onboarding_completed BOOLEAN DEFAULT false,
  block_minutes INT DEFAULT 10 CHECK (block_minutes IN (5, 10, 15, 20, 30)),
  quick_tasks JSONB DEFAULT NULL,
  display_currency TEXT DEFAULT 'USD' CHECK (display_currency ~ '^[A-Z]{3}$'),
  weather_lat double precision,
  weather_lon double precision,
  weather_city text,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PRODUCTIVITY DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date DATE,
  end_date DATE,
  color TEXT,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  thumbnail_style TEXT DEFAULT 'minimal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('article', 'video', 'podcast', 'news', 'image', 'website', 'other')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  thumbnail_url TEXT,
  description TEXT,
  is_favorite BOOLEAN DEFAULT true NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_resources_project_id_idx
  ON project_resources (project_id);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  estimated_blocks INTEGER,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  source_url TEXT,
  reminder_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  target_date DATE,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tasks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  tasks JSONB DEFAULT '[]',
  mode TEXT NOT NULL DEFAULT 'time-block',
  free_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule_image_url TEXT,
  template_id UUID REFERENCES schedule_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, plan_date),
  CONSTRAINT daily_plans_mode_check CHECK (mode IN ('time-block', 'free'))
);

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  content TEXT,
  highlights TEXT,
  challenges TEXT,
  next_week_focus TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- KNOWLEDGE DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  source_url TEXT,
  review_date DATE,
  mastery_level INTEGER DEFAULT 0,
  linked_project_ids UUID[] DEFAULT '{}',
  linked_goal_ids UUID[] DEFAULT '{}',
  linked_note_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT DEFAULT 'text' CHECK (source_type IN ('text', 'voice')),
  capture_kind TEXT DEFAULT 'idea' CHECK (capture_kind IN ('idea', 'task', 'note', 'goal')),
  voice_transcript TEXT,
  linked_project_ids UUID[] DEFAULT '{}',
  linked_task_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'captured' CHECK (status IN ('captured', 'reviewed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SELF DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS about_me (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  instruction_manual TEXT,
  core_values TEXT,
  mission TEXT,
  personality_insights TEXT,
  sections JSONB DEFAULT '{}',
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  content TEXT,
  emotion_quadrant JSONB,
  needs TEXT[] DEFAULT '{}',
  linked_project_ids UUID[] DEFAULT '{}',
  linked_task_ids UUID[] DEFAULT '{}',
  ai_summary TEXT,
  ai_illustration_url TEXT,
  ai_audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grateful_things (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  entry_date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  photo_url TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add gratitude metadata for databases created before these columns existed
ALTER TABLE grateful_things
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
  target_count INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  background_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  habit_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- HEALTH DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  bed_time TEXT,
  wake_time TEXT,
  duration_hours NUMERIC,
  quality INTEGER CHECK (quality BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  exercise_type TEXT NOT NULL,
  duration_minutes INTEGER,
  intensity TEXT DEFAULT 'medium' CHECK (intensity IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  description TEXT,
  calories INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  check_date DATE NOT NULL,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  energy INTEGER CHECK (energy BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS symptom_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  symptom TEXT NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  info_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Health dashboard v2 (subjective four pillars + objective metrics + goals).
-- See migrations/20260423000000_health_dashboard_rebuild.sql for indexes,
-- RLS policies, and the backfill from the legacy 1-5 tables above.
CREATE TABLE IF NOT EXISTS health_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  log_date DATE NOT NULL,
  sleep_quality SMALLINT CHECK (sleep_quality BETWEEN 1 AND 10),
  energy_level SMALLINT CHECK (energy_level BETWEEN 1 AND 10),
  mood_valence SMALLINT CHECK (mood_valence BETWEEN 1 AND 10),
  mood_arousal SMALLINT CHECK (mood_arousal BETWEEN 1 AND 10),
  stress_level SMALLINT CHECK (stress_level BETWEEN 1 AND 10),
  notes TEXT,
  triggers TEXT[] DEFAULT '{}',
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('apple_health', 'manual', 'derived', 'shortcut', 'import')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  metric_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'daily'
    CHECK (period IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, metric_type, period)
);

-- ============================================================
-- FINANCE DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  receipt_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  vision_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  category_id UUID REFERENCES finance_categories(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  limit_amount NUMERIC NOT NULL CHECK (limit_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT finance_budgets_period_order CHECK (period_start <= period_end),
  CONSTRAINT finance_budgets_user_category_period_unique UNIQUE (user_id, category_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  net_worth NUMERIC,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RESOURCES DOMAIN
-- ============================================================

-- `documents` declared before `assets` so the `assets.document_id` FK below
-- can reference it during a fresh schema apply.
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  document_type TEXT,
  expiration_date DATE,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  category_key TEXT CHECK (
    category_key IS NULL OR category_key IN (
      'real_estate','vehicle','electronics','musical_instrument','investment','other'
    )
  ),
  value NUMERIC,
  current_value NUMERIC,
  location TEXT,
  purchase_date DATE,
  serial_number TEXT,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_user_favorite_idx ON assets (user_id, is_favorite) WHERE is_favorite;
CREATE INDEX IF NOT EXISTS assets_document_id_idx ON assets (document_id);
CREATE INDEX IF NOT EXISTS assets_category_key_idx ON assets (user_id, category_key);

CREATE TABLE IF NOT EXISTS software_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  app_name TEXT NOT NULL,
  website_url TEXT,
  icon_url TEXT,
  category TEXT,
  platforms TEXT,
  use_cases TEXT,
  status TEXT DEFAULT 'Testing' CHECK (status IN ('Testing', 'Active', 'Retired', 'Wishlist')),
  priority TEXT DEFAULT 'Nice-to-have' CHECK (priority IN ('Must-have', 'Nice-to-have', 'Optional')),
  cost_type TEXT DEFAULT 'Free' CHECK (cost_type IN ('Free', 'Freemium', 'Paid', 'Subscription')),
  cost_amount NUMERIC,
  cost_period TEXT,
  why_i_use_it TEXT,
  best_feature TEXT,
  biggest_downside TEXT,
  best_alternative TEXT,
  replaces TEXT,
  tags TEXT,
  default_tool_for TEXT,
  summary TEXT,
  ai_generated_fields TEXT[] DEFAULT '{}',
  is_default_stack BOOLEAN DEFAULT false,
  launch_count INTEGER DEFAULT 0,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_software_vault_user ON software_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_software_vault_category ON software_vault(category);
CREATE INDEX IF NOT EXISTS idx_software_vault_status ON software_vault(status);
CREATE INDEX IF NOT EXISTS idx_software_vault_default_stack
  ON software_vault(user_id) WHERE is_default_stack = true;

CREATE TABLE IF NOT EXISTS vault_autofill_rate_limit (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, window_start)
);

CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'personal' CHECK (type IN ('personal', 'professional')),
  description TEXT,
  linked_project_ids UUID[] DEFAULT '{}',
  contact_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  linked_project_ids UUID[] DEFAULT '{}',
  linked_goal_ids UUID[] DEFAULT '{}',
  linked_note_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LEARNING DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS japanese_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  study_type TEXT,
  content TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RESEARCH DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS market_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  analysis TEXT,
  infographic_url TEXT,
  audio_url TEXT,
  linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  linked_note_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SYSTEM DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  task_reminders BOOLEAN DEFAULT true,
  daily_summary BOOLEAN DEFAULT true,
  study_streak_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productivity_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stat_date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  blocks_worked INTEGER DEFAULT 0,
  study_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, stat_date)
);

-- ============================================================
-- AI KNOWLEDGE DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_tools_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS truth_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  rules TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CAREER DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS career_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS POLICIES (applied to all tables with user_id)
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'projects', 'project_resources', 'tasks', 'goals', 'key_results', 'schedule_templates',
      'daily_plans', 'weekly_reviews', 'notes', 'knowledge_entries', 'ideas',
      'about_me', 'journal_entries', 'grateful_things', 'habits', 'routines',
      'habit_logs', 'sleep_logs', 'exercise_logs', 'nutrition_logs',
      'daily_check_ins', 'symptom_logs', 'medical_info',
      'health_daily_logs', 'health_metrics', 'health_goals',
      'finance_accounts',
      'finance_categories', 'finance_transactions', 'finance_savings_goals', 'finance_budgets',
      'financial_snapshots', 'assets', 'documents', 'software_vault',
      'relationships', 'role_models', 'japanese_study_sessions',
      'market_research', 'notification_preferences', 'productivity_stats',
      'ai_prompts', 'ai_workflows', 'ai_memory', 'ai_tools_stack',
      'truth_filters', 'career_assets'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "Users can view own %1$s" ON %1$I FOR SELECT USING (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can insert own %1$s" ON %1$I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can update own %1$s" ON %1$I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can delete own %1$s" ON %1$I FOR DELETE USING (auth.uid() = user_id)', tbl);
  END LOOP;
END $$;

-- ============================================================
-- HABITS REBUILD (Phase 1 foundation, 2026-04-18)
-- ============================================================
-- The legacy habits / routines / habit_logs tables above are preserved for
-- backfill by the 20260418_habits_rebuild migration. The canonical, current
-- shape is below; these tables handle their own RLS inline so they do not
-- appear in the hardcoded list in the RLS block.

CREATE TABLE IF NOT EXISTS public.habits_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'checkbox'
    CHECK (type IN ('checkbox', 'counter', 'duration', 'negative')),
  target_value NUMERIC,
  frequency JSONB NOT NULL DEFAULT '{"kind":"daily"}'::jsonb
    CHECK ((frequency->>'kind') IN ('daily','weekly_count','weekdays','every_n_days')),
  time_of_day TEXT NOT NULL DEFAULT 'anytime'
    CHECK (time_of_day IN ('morning','afternoon','evening','anytime')),
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Note: the migration renames the legacy `habits` table to `habits_legacy` and
-- then creates the real `habits` table with this same shape. The `habits_new`
-- name here is a schema-snapshot placeholder so a fresh `schema.sql` bootstrap
-- does not conflict with the legacy block above; the migration supersedes it.

CREATE TABLE IF NOT EXISTS public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL,
  completion_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('done','skipped')),
  value NUMERIC,
  note TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completion_date)
);

CREATE TABLE IF NOT EXISTS public.streak_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL,
  freeze_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, freeze_date)
);

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.habit_tags (
  habit_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (habit_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.habit_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL,
  target_kind TEXT NOT NULL
    CHECK (target_kind IN ('goal','knowledge','project','task','timeline')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, target_kind, target_id)
);

CREATE TABLE IF NOT EXISTS public.routines_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  time_of_day TEXT NOT NULL DEFAULT 'anytime'
    CHECK (time_of_day IN ('morning','afternoon','evening','anytime')),
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL,
  completion_date DATE NOT NULL,
  completed_step_ids UUID[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (routine_id, completion_date)
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID,
  routine_id UUID,
  time_of_day TEXT NOT NULL,
  days_of_week SMALLINT[] NOT NULL DEFAULT '{}',
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','push','both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (habit_id IS NOT NULL OR routine_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  target_kind TEXT,
  target_id UUID,
  input_hash TEXT NOT NULL,
  content_json JSONB,
  content_text TEXT,
  language TEXT NOT NULL,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, input_hash, language)
);
