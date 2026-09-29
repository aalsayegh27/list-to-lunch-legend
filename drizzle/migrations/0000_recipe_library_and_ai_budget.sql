-- Dietary needs on each profile, used to filter and generate recipes.
ALTER TABLE public.profiles
  ADD COLUMN diet TEXT CHECK (diet IN ('vegetarian', 'vegan', 'pescatarian')),
  ADD COLUMN allergies TEXT[] NOT NULL DEFAULT '{}';

-- Spending limits for AI recipe generation. Only the database owner can change
-- these (no grants to app users); edit the single row to raise or lower a cap.
CREATE TABLE public.ai_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 3.00,
  per_user_daily_batches INT NOT NULL DEFAULT 3,
  -- Worst case for one batch: 12,000 output tokens at $10/M plus a few thousand
  -- input tokens at $2/M (Claude Sonnet 5.5). Reserved up front, before the call.
  max_batch_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.15,
  input_usd_per_mtok NUMERIC(10, 4) NOT NULL DEFAULT 2.00,
  output_usd_per_mtok NUMERIC(10, 4) NOT NULL DEFAULT 10.00
);
INSERT INTO public.ai_settings (id) VALUES (1);
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ai_settings TO service_role;

-- One row per generation request, for the spending caps.
CREATE TABLE public.ai_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  cost_usd NUMERIC(10, 5) NOT NULL DEFAULT 0,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  recipes_saved INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_generations_day_idx ON public.ai_generations (created_at);
CREATE INDEX ai_generations_user_idx ON public.ai_generations (user_id, created_at);
-- Users may read their own rows; every write goes through the functions below.
GRANT SELECT ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_generations_read_own" ON public.ai_generations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- The shared recipe library. Every signed-in cook can read it; recipes are only
-- added through ai_finish_generation, tied to a reserved generation.
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  title_key TEXT GENERATED ALWAYS AS (
    btrim(lower(regexp_replace(title, '[^a-zA-Z0-9]+', ' ', 'g')))
  ) STORED,
  meal TEXT NOT NULL CHECK (meal IN ('Lunch', 'Dinner')),
  minutes INT NOT NULL CHECK (minutes BETWEEN 5 AND 180),
  ingredients JSONB NOT NULL CHECK (
    jsonb_typeof(ingredients) = 'array' AND jsonb_array_length(ingredients) BETWEEN 2 AND 12
  ),
  steps JSONB NOT NULL CHECK (
    jsonb_typeof(steps) = 'array' AND jsonb_array_length(steps) BETWEEN 2 AND 10
  ),
  allergens TEXT[] NOT NULL DEFAULT '{}',
  diets TEXT[] NOT NULL DEFAULT '{}',
  hidden BOOLEAN NOT NULL DEFAULT false,
  generation_id UUID REFERENCES public.ai_generations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX recipes_title_key_idx ON public.recipes (title_key);
CREATE INDEX recipes_created_idx ON public.recipes (created_at DESC);
GRANT SELECT ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_read_visible" ON public.recipes
  FOR SELECT TO authenticated USING (NOT hidden);

-- Reserve a generation before calling the AI. Checks the per-person and whole-app
-- daily caps under a lock (so two requests can't both slip under the limit) and
-- books the batch at its worst-case cost. Raises 'ai_user_limit' or 'ai_budget'.
CREATE OR REPLACE FUNCTION public.ai_reserve_generation()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_settings public.ai_settings;
  v_today TIMESTAMPTZ := date_trunc('day', now());
  v_count INT;
  v_spent NUMERIC;
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_signed_in';
  END IF;
  SELECT * INTO v_settings FROM public.ai_settings WHERE id = 1;

  PERFORM pg_advisory_xact_lock(hashtext('ai_reserve_generation'));

  -- Requests that failed before costing anything don't use up a cook's batches.
  SELECT count(*) INTO v_count FROM public.ai_generations
  WHERE user_id = v_user AND created_at >= v_today
    AND NOT (status = 'failed' AND cost_usd = 0);
  IF v_count >= v_settings.per_user_daily_batches THEN
    RAISE EXCEPTION 'ai_user_limit';
  END IF;

  SELECT coalesce(sum(cost_usd), 0) INTO v_spent FROM public.ai_generations
  WHERE created_at >= v_today;
  IF v_spent + v_settings.max_batch_cost_usd > v_settings.daily_budget_usd THEN
    RAISE EXCEPTION 'ai_budget';
  END IF;

  INSERT INTO public.ai_generations (user_id, cost_usd)
  VALUES (v_user, v_settings.max_batch_cost_usd)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Settle a reserved generation with the tokens actually used (never above the
-- reserved worst case) and save its recipes to the library. Each reservation can
-- be finished once, within 15 minutes, by the cook who made it.
CREATE OR REPLACE FUNCTION public.ai_finish_generation(
  p_generation_id UUID,
  p_input_tokens INT,
  p_output_tokens INT,
  p_recipes JSONB
)
RETURNS SETOF public.recipes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_settings public.ai_settings;
  v_cost NUMERIC;
  v_saved INT;
BEGIN
  SELECT * INTO v_settings FROM public.ai_settings WHERE id = 1;
  v_cost := least(
    v_settings.max_batch_cost_usd,
    greatest(p_input_tokens, 0) * v_settings.input_usd_per_mtok / 1000000.0
      + greatest(p_output_tokens, 0) * v_settings.output_usd_per_mtok / 1000000.0
  );

  UPDATE public.ai_generations
  SET status = CASE WHEN jsonb_array_length(coalesce(p_recipes, '[]'::jsonb)) > 0 THEN 'done' ELSE 'failed' END,
      cost_usd = v_cost,
      input_tokens = greatest(p_input_tokens, 0),
      output_tokens = greatest(p_output_tokens, 0)
  WHERE id = p_generation_id
    AND user_id = v_user
    AND status = 'pending'
    AND created_at > now() - interval '15 minutes';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ai_generation_not_pending';
  END IF;

  RETURN QUERY
  INSERT INTO public.recipes (title, meal, minutes, ingredients, steps, allergens, diets, generation_id, created_by)
  SELECT r.title, r.meal, r.minutes, r.ingredients, r.steps,
         coalesce(r.allergens, '{}'), coalesce(r.diets, '{}'), p_generation_id, v_user
  FROM jsonb_to_recordset(
    (SELECT coalesce(jsonb_agg(e), '[]'::jsonb)
     FROM (SELECT e FROM jsonb_array_elements(coalesce(p_recipes, '[]'::jsonb)) e LIMIT 8) s)
  ) AS r(title TEXT, meal TEXT, minutes INT, ingredients JSONB, steps JSONB, allergens TEXT[], diets TEXT[])
  ON CONFLICT (title_key) DO NOTHING
  RETURNING *;

  GET DIAGNOSTICS v_saved = ROW_COUNT;
  UPDATE public.ai_generations SET recipes_saved = v_saved WHERE id = p_generation_id;
END;
$$;

-- How many more batches the signed-in cook may ask for today (0 when the
-- whole-app budget is used up).
CREATE OR REPLACE FUNCTION public.ai_remaining_today()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT coalesce(sum(cost_usd), 0) FROM public.ai_generations
          WHERE created_at >= date_trunc('day', now())) + s.max_batch_cost_usd > s.daily_budget_usd
      THEN 0
    ELSE greatest(0, s.per_user_daily_batches - (
      SELECT count(*)::INT FROM public.ai_generations
      WHERE user_id = auth.uid() AND created_at >= date_trunc('day', now())
        AND NOT (status = 'failed' AND cost_usd = 0)
    ))
  END
  FROM public.ai_settings s
  WHERE s.id = 1;
$$;

REVOKE EXECUTE ON FUNCTION public.ai_remaining_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_remaining_today() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_reserve_generation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ai_finish_generation(UUID, INT, INT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_reserve_generation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_finish_generation(UUID, INT, INT, JSONB) TO authenticated;