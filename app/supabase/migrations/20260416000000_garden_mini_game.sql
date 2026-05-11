-- ============================================================
-- GARDEN MINI GAME
-- ============================================================

CREATE TABLE IF NOT EXISTS user_garden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  plant_type TEXT NOT NULL CHECK (plant_type IN ('grass', 'sunflower', 'lily', 'orchid', 'apple_tree')),
  growth_stage INT DEFAULT 1 CHECK (growth_stage BETWEEN 1 AND 5),
  growth_points INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_watered_at DATE,
  planted_at TIMESTAMPTZ DEFAULT now(),
  variant TEXT DEFAULT 'normal' CHECK (variant IN ('normal', 'golden', 'rare')),
  is_wilted BOOLEAN DEFAULT false,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS plant_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  plant_type TEXT NOT NULL CHECK (plant_type IN ('grass', 'sunflower', 'lily', 'orchid', 'apple_tree')),
  variant TEXT DEFAULT 'normal' CHECK (variant IN ('normal', 'golden', 'rare')),
  streak_days INT,
  bloom_date DATE,
  harvested_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS garden_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('water', 'fertilizer', 'sunlight', 'rare_seed')),
  quantity INT DEFAULT 0,
  UNIQUE(user_id, item_type)
);

CREATE TABLE IF NOT EXISTS garden_daily_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  log_date DATE NOT NULL,
  chest_claimed BOOLEAN DEFAULT false,
  watered BOOLEAN DEFAULT false,
  bonus_items JSONB,
  UNIQUE(user_id, log_date)
);

-- RLS
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'user_garden', 'plant_collection', 'garden_inventory', 'garden_daily_log'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "Users can view own %1$s" ON %1$I FOR SELECT USING (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can insert own %1$s" ON %1$I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can update own %1$s" ON %1$I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can delete own %1$s" ON %1$I FOR DELETE USING (auth.uid() = user_id)', tbl);
  END LOOP;
END $$;
