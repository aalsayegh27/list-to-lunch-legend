-- Cooks can write their own pantry and saved recipes straight through the API, so
-- the limits the app applies have to live here too. NOT VALID: existing rows are
-- left alone; every new or changed row is checked.

ALTER TABLE public.pantry_items
  ADD CONSTRAINT pantry_items_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 60) NOT VALID,
  ADD CONSTRAINT pantry_items_category_length CHECK (char_length(category) <= 40) NOT VALID;

ALTER TABLE public.favorite_recipes
  ADD CONSTRAINT favorite_recipes_meal_id_valid CHECK (public.is_recipe_id(meal_id)) NOT VALID,
  -- A saved recipe is a copy of one recipe card: a few kilobytes at most.
  ADD CONSTRAINT favorite_recipes_snapshot_size CHECK (octet_length(snapshot::text) <= 20000) NOT VALID;

-- At most 500 pantry items per cook.
CREATE FUNCTION public.pantry_items_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT count(*) FROM public.pantry_items WHERE user_id = NEW.user_id) >= 500 THEN
    RAISE EXCEPTION 'pantry_full';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pantry_items_limit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER pantry_items_limit_before_insert
  BEFORE INSERT ON public.pantry_items
  FOR EACH ROW EXECUTE FUNCTION public.pantry_items_limit();
