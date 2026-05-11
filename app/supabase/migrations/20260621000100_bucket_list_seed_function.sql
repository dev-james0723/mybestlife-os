-- Bucket List — idempotent seed-on-first-visit RPC.
--
-- Called by the app on a user's first visit to /bucket-list (mirrors the
-- Quote Library pattern). Inserts one example dream per type (6 total) with
-- `is_seed = true` so the user has something inspiring to see immediately.
-- A "Clear seed quotes" / "Clear seed dreams" toggle in settings flips
-- `bucket_settings.seeds_cleared`, after which this RPC becomes a no-op.

CREATE OR REPLACE FUNCTION public.seed_bucket_list_starter(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (seeded_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $bucket_seed_body$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_already_seeded INT;
  v_seeds_cleared BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'bucket_list_seed_no_user';
  END IF;

  -- Ensure bucket_settings row exists.
  INSERT INTO public.bucket_settings (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT seeds_cleared INTO v_seeds_cleared
  FROM public.bucket_settings
  WHERE user_id = v_user_id;

  IF COALESCE(v_seeds_cleared, false) THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  SELECT COUNT(*)::INT INTO v_already_seeded
  FROM public.bucket_items
  WHERE user_id = v_user_id AND is_seed = true;

  IF v_already_seeded > 0 THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  -- ──────────────────────────────────────────────────────────────────
  -- Travel seed — matches the reference screenshot's hero card.
  -- ──────────────────────────────────────────────────────────────────
  INSERT INTO public.bucket_items (
    user_id, title, description, why_this_matters,
    type, status, priority, difficulty, time_horizon,
    estimated_cost, cost_currency, cost_band,
    target_month, category_tags, quote_inspiration,
    destination_name, destination_country, destination_city,
    destination_lat, destination_lng,
    origin_airport, destination_airport, best_season,
    travel_budget_level, travel_style, trip_length_days,
    exploratory_price_min, exploratory_price_max, flight_watch_enabled,
    is_seed, is_featured
  ) VALUES (
    v_user_id,
    'See the Northern Lights in Iceland',
    'A week-long winter road trip chasing aurora along Iceland''s Ring Road.',
    'To witness the raw cosmic energy of our planet in a remote, pristine environment.',
    'travel', 'active', 'high', 'hard', '1_3_years',
    4500, 'USD', '$$$',
    to_char(now() + interval '9 months', 'YYYY-MM'),
    ARRAY['nature', 'winter', 'photography']::TEXT[],
    'We travel not to escape life, but for life not to escape us. — Anonymous',
    'Iceland', 'IS', 'Reykjavík',
    64.1466, -21.9426,
    'JFK', 'KEF', 'Sep — Mar',
    'mid', 'couple', 8,
    580, 820, true,
    true, true
  );

  -- ──────────────────────────────────────────────────────────────────
  -- Growth seed — matches "Run a full marathon" in the screenshot.
  -- ──────────────────────────────────────────────────────────────────
  INSERT INTO public.bucket_items (
    user_id, title, description, why_this_matters,
    type, status, priority, difficulty, time_horizon,
    estimated_cost, cost_currency, cost_band,
    category_tags, is_seed
  ) VALUES (
    v_user_id,
    'Run a full marathon',
    'Complete a 42.2 km road marathon at an official event.',
    'To prove to myself that mental fortitude can overcome physical limits.',
    'growth', 'planning', 'medium', 'hard', '1_3_years',
    450, 'USD', '$',
    ARRAY['fitness', 'endurance', 'self-mastery']::TEXT[],
    true
  );

  -- ──────────────────────────────────────────────────────────────────
  -- Growth seed — language learning.
  -- ──────────────────────────────────────────────────────────────────
  INSERT INTO public.bucket_items (
    user_id, title, description, why_this_matters,
    type, status, priority, difficulty, time_horizon,
    estimated_cost, cost_currency, cost_band,
    category_tags, is_seed
  ) VALUES (
    v_user_id,
    'Become conversational in Japanese',
    'Reach JLPT N3 level — hold a 30-minute everyday conversation with a native speaker.',
    'To connect deeply with a culture I admire during future travels.',
    'growth', 'dreaming', 'medium', 'hard', '3_5_years',
    800, 'USD', '$',
    ARRAY['language', 'culture', 'learning']::TEXT[],
    true
  );

  -- ──────────────────────────────────────────────────────────────────
  -- Achievement seed — creative business.
  -- ──────────────────────────────────────────────────────────────────
  INSERT INTO public.bucket_items (
    user_id, title, description, why_this_matters,
    type, status, priority, difficulty, time_horizon,
    estimated_cost, cost_currency, cost_band,
    category_tags, is_seed
  ) VALUES (
    v_user_id,
    'Build my first profitable creative product',
    'Ship an original creative product (book, course, or app) that generates recurring revenue within a year of launch.',
    'To establish financial independence through self-expression and utility.',
    'achievement', 'active', 'high', 'hard', '1_3_years',
    3500, 'USD', '$$$',
    ARRAY['creative', 'entrepreneurship', 'craft']::TEXT[],
    true
  );

  -- ──────────────────────────────────────────────────────────────────
  -- Relationship seed.
  -- ──────────────────────────────────────────────────────────────────
  INSERT INTO public.bucket_items (
    user_id, title, description, why_this_matters,
    type, status, priority, difficulty, time_horizon,
    estimated_cost, cost_currency, cost_band,
    category_tags, is_seed
  ) VALUES (
    v_user_id,
    'Take my parents on a weekend trip',
    'Plan and fund a three-day coastal getaway for just me and my parents.',
    'Because the time we still have together is precious and finite.',
    'relationship', 'dreaming', 'high', 'easy', 'this_year',
    1200, 'USD', '$$',
    ARRAY['family', 'travel', 'reconnect']::TEXT[],
    true
  );

  -- ──────────────────────────────────────────────────────────────────
  -- Purchase seed.
  -- ──────────────────────────────────────────────────────────────────
  INSERT INTO public.bucket_items (
    user_id, title, description, why_this_matters,
    type, status, priority, difficulty, time_horizon,
    estimated_cost, cost_currency, cost_band,
    category_tags, is_seed
  ) VALUES (
    v_user_id,
    'Own a quiet cabin retreat',
    'A modest off-grid cabin within two hours of the city — place to write and think.',
    'Somewhere I can unplug completely and rediscover deep work.',
    'purchase', 'dreaming', 'medium', 'epic', '3_5_years',
    85000, 'USD', '$$$$',
    ARRAY['home', 'nature', 'writing']::TEXT[],
    true
  );

  -- ──────────────────────────────────────────────────────────────────
  -- "Memory" seeds — two completed dreams so the Realized Dreams strip
  -- has something to render. The user can archive or delete these.
  -- ──────────────────────────────────────────────────────────────────
  INSERT INTO public.bucket_items (
    user_id, title, description, why_this_matters,
    type, status, priority, difficulty, time_horizon,
    estimated_cost, cost_currency, cost_band,
    category_tags, destination_name, destination_country,
    destination_lat, destination_lng,
    completed_at, is_seed
  ) VALUES (
    v_user_id,
    'Climbed Mt. Fuji',
    'A challenging overnight summit climb during the climbing season.',
    'Proof that I can push through discomfort for a singular view.',
    'travel', 'completed', 'high', 'hard', '1_3_years',
    900, 'USD', '$$',
    ARRAY['mountains', 'summit', 'japan']::TEXT[],
    'Mt. Fuji', 'JP',
    35.3606, 138.7274,
    now() - interval '18 months',
    true
  );

  INSERT INTO public.bucket_items (
    user_id, title, description, why_this_matters,
    type, status, priority, difficulty, time_horizon,
    estimated_cost, cost_currency, cost_band,
    category_tags, completed_at, is_seed
  ) VALUES (
    v_user_id,
    'Bought Dream Car',
    'A practical wagon that unlocked countless weekend trips.',
    'A tool for a freer lifestyle.',
    'purchase', 'completed', 'medium', 'hard', '1_3_years',
    28000, 'USD', '$$$',
    ARRAY['freedom', 'mobility']::TEXT[],
    now() - interval '3 years',
    true
  );

  RETURN QUERY SELECT 8;
END;
$bucket_seed_body$;

GRANT EXECUTE ON FUNCTION public.seed_bucket_list_starter(UUID) TO authenticated;
