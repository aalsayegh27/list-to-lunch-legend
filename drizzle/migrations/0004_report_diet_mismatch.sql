-- "Doesn't fit my diet" as a report reason.
--
-- Like every report it hides the recipe for the cook who sent it. Unlike the other
-- reasons it never hides the recipe for everyone, since it may suit cooks without
-- that diet. Instead, once enough different cooks who follow a diet
-- (ai_settings.reports_to_hide, default 2) report that a recipe doesn't fit, the
-- recipe loses that diet's tag, so it stops showing for that diet only.

ALTER TABLE public.recipe_reports DROP CONSTRAINT recipe_reports_reason_check;
ALTER TABLE public.recipe_reports
  ADD CONSTRAINT recipe_reports_reason_check
  CHECK (reason IN ('allergens', 'unsafe', 'nonsense', 'diet'));

CREATE OR REPLACE FUNCTION public.hide_reported_recipe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold INT;
BEGIN
  IF NEW.recipe_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NEW;
  END IF;
  SELECT reports_to_hide INTO v_threshold FROM public.ai_settings WHERE id = 1;

  IF NEW.reason = 'diet' THEN
    -- Drop each diet tag that enough reporters following that diet disputed.
    UPDATE public.recipes r
    SET diets = ARRAY(
      SELECT tag FROM unnest(r.diets) AS tag
      WHERE (
        SELECT count(*)
        FROM public.recipe_reports rr
        JOIN public.profiles p ON p.id = rr.user_id
        WHERE rr.recipe_id = NEW.recipe_id
          AND rr.reason = 'diet'
          AND tag = ANY (p.diets)
      ) < v_threshold
    )
    WHERE r.id = NEW.recipe_id::UUID;
    RETURN NEW;
  END IF;

  -- Other reasons: hide for everyone once enough cooks report a real problem.
  IF (
    SELECT count(*) FROM public.recipe_reports
    WHERE recipe_id = NEW.recipe_id AND reason <> 'diet'
  ) >= v_threshold THEN
    UPDATE public.recipes SET hidden = true WHERE id = NEW.recipe_id::UUID;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.hide_reported_recipe() FROM PUBLIC, anon, authenticated;