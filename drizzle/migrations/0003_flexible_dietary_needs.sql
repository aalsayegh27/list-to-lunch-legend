-- Dietary needs become open-ended: a cook can pick several diets and add their own
-- diets and allergies (e.g. "low fodmap", "mushrooms"), not just the fixed lists.
--
-- Labels are short lowercase phrases. Built-in ones are keys like "halal" or
-- "gluten-free"; custom ones are whatever the cook typed, normalised by the app.
-- Recipe tags follow the same format, so a recipe the AI made for "low fodmap" can
-- be matched to every cook who asked for it.

CREATE FUNCTION public.dietary_labels_valid(p TEXT[], max_count INT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(cardinality(p), 0) <= max_count
     AND NOT EXISTS (
       SELECT 1 FROM unnest(p) AS label
       WHERE label IS NULL OR label !~ '^[a-z0-9][a-z0-9 &''-]{0,39}$'
     );
$$;

-- Several diets per cook. The old single-diet column stays for the app version
-- that's live while this change rolls out; new code reads and writes diets.
ALTER TABLE public.profiles ADD COLUMN diets TEXT[] NOT NULL DEFAULT '{}';
UPDATE public.profiles SET diets = ARRAY[diet] WHERE diet IS NOT NULL;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_diets_valid CHECK (public.dietary_labels_valid(diets, 10)),
  ADD CONSTRAINT profiles_allergies_valid CHECK (public.dietary_labels_valid(allergies, 20));

-- Recipe tags: any well-formed label, not just the original fixed lists.
ALTER TABLE public.recipes
  DROP CONSTRAINT recipes_allergens_known,
  DROP CONSTRAINT recipes_diets_known,
  ADD CONSTRAINT recipes_allergens_valid CHECK (public.dietary_labels_valid(allergens, 20)),
  ADD CONSTRAINT recipes_diets_valid CHECK (public.dietary_labels_valid(diets, 12));
