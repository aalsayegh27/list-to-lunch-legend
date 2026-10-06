ALTER TABLE public.ai_settings ADD COLUMN server_secret_sha256 TEXT;
UPDATE public.ai_settings
SET server_secret_sha256 = '06f9868eeef37fbacb9f10574596c1da5786b8b2ae0412d533eabd75b15364c9'
WHERE id = 1;

CREATE OR REPLACE FUNCTION public.ai_require_server_secret(p_secret TEXT)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_secret IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.ai_settings
    WHERE id = 1
      AND server_secret_sha256 IS NOT NULL
      AND server_secret_sha256 = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex')
  ) THEN
    RAISE EXCEPTION 'ai_forbidden';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ai_require_server_secret(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.recipe_ingredients_valid(p JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_typeof(p) = 'array' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p) e
    WHERE jsonb_typeof(e) IS DISTINCT FROM 'object'
       OR jsonb_typeof(e -> 'name') IS DISTINCT FROM 'string'
       OR char_length(e ->> 'name') NOT BETWEEN 1 AND 60
       OR jsonb_typeof(e -> 'match') IS DISTINCT FROM 'array'
       OR jsonb_array_length(e -> 'match') NOT BETWEEN 1 AND 4
       OR EXISTS (
         SELECT 1 FROM jsonb_array_elements(e -> 'match') m
         WHERE jsonb_typeof(m) IS DISTINCT FROM 'string'
            OR char_length(m #>> '{}') NOT BETWEEN 1 AND 40
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.recipe_steps_valid(p JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_typeof(p) = 'array' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p) s
    WHERE jsonb_typeof(s) IS DISTINCT FROM 'string'
       OR char_length(s #>> '{}') NOT BETWEEN 1 AND 300
  );
$$;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_ingredients_shape CHECK (public.recipe_ingredients_valid(ingredients)),
  ADD CONSTRAINT recipes_steps_shape CHECK (public.recipe_steps_valid(steps)),
  ADD CONSTRAINT recipes_allergens_known CHECK (
    allergens <@ ARRAY['nuts', 'peanuts', 'shellfish', 'fish', 'dairy', 'eggs', 'gluten', 'soy', 'sesame']::TEXT[]
  ),
  ADD CONSTRAINT recipes_diets_known CHECK (
    diets <@ ARRAY['vegetarian', 'vegan', 'pescatarian']::TEXT[]
  );

DROP FUNCTION IF EXISTS public.ai_reserve_generation();
DROP FUNCTION IF EXISTS public.ai_finish_generation(UUID, INT, INT, JSONB);

CREATE FUNCTION public.ai_reserve_generation(p_server_secret TEXT)
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
  PERFORM public.ai_require_server_secret(p_server_secret);
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_signed_in';
  END IF;
  SELECT * INTO v_settings FROM public.ai_settings WHERE id = 1;

  PERFORM pg_advisory_xact_lock(hashtext('ai_reserve_generation'));

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

CREATE FUNCTION public.ai_finish_generation(
  p_server_secret TEXT,
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
  PERFORM public.ai_require_server_secret(p_server_secret);
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

REVOKE EXECUTE ON FUNCTION public.ai_reserve_generation(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ai_finish_generation(TEXT, UUID, INT, INT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_reserve_generation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_finish_generation(TEXT, UUID, INT, INT, JSONB) TO authenticated;