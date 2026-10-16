-- Pin the search path of the small validation helpers used by CHECK constraints, so
-- they can't be pointed at look-alike objects (Supabase Security Advisor:
-- "Function Search Path Mutable"). They only call built-ins, which are always found.
ALTER FUNCTION public.recipe_ingredients_valid(JSONB) SET search_path = '';
ALTER FUNCTION public.recipe_steps_valid(JSONB) SET search_path = '';
ALTER FUNCTION public.is_recipe_id(TEXT) SET search_path = '';
ALTER FUNCTION public.dietary_labels_valid(TEXT[], INT) SET search_path = '';
