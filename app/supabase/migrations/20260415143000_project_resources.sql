-- Project-scoped links (articles, videos, podcasts, images) saved from create flow or later.

CREATE TABLE IF NOT EXISTS project_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('article', 'video', 'podcast', 'image')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT,
  is_favorite BOOLEAN DEFAULT true NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_resources_project_id_idx
  ON project_resources (project_id);

-- RLS
DO $$
DECLARE
  tbl TEXT := 'project_resources';
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('CREATE POLICY "Users can view own %1$s" ON %1$I FOR SELECT USING (auth.uid() = user_id)', tbl);
  EXECUTE format('CREATE POLICY "Users can insert own %1$s" ON %1$I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl);
  EXECUTE format('CREATE POLICY "Users can update own %1$s" ON %1$I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
  EXECUTE format('CREATE POLICY "Users can delete own %1$s" ON %1$I FOR DELETE USING (auth.uid() = user_id)', tbl);
END $$;
