-- Phase 4: thumbs up/down and "Report a problem" on any recipe.
--
-- Recipe ids are either a starter recipe's slug (built into the app) or an AI
-- recipe's UUID from public.recipes.
--
-- - A vote is private to its cook: a thumbs down hides the recipe for that cook
--   only. Everyone sees just the totals, which rank better-liked recipes first.
-- - A report hides the recipe for the cook who sent it. Once enough different cooks
--   report the same AI recipe (ai_settings.reports_to_hide, default 2), it's hidden
--   for everyone. Starter recipes are hand-checked and can't be hidden for everyone;
--   their reports are kept for review.

CREATE FUNCTION public.is_recipe_id(p TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR p IN (
        'shrimp-rice', 'chickpea-hummus', 'chicken-tray', 'beef-zucchini',
        'egg-kimchi-rice', 'beef-stew', 'tuna-white-bean', 'eggplant-bake',
        'cauliflower-soup', 'turkey-avocado', 'squash-risotto', 'shakshuka'
      );
$$;

CREATE TABLE public.recipe_votes (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL CHECK (public.is_recipe_id(recipe_id)),
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);
CREATE INDEX recipe_votes_recipe_idx ON public.recipe_votes (recipe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_votes TO authenticated;
GRANT ALL ON public.recipe_votes TO service_role;
ALTER TABLE public.recipe_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_votes_own" ON public.recipe_votes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.recipe_reports (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL CHECK (public.is_recipe_id(recipe_id)),
  reason TEXT NOT NULL CHECK (reason IN ('allergens', 'unsafe', 'nonsense')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);
CREATE INDEX recipe_reports_recipe_idx ON public.recipe_reports (recipe_id);
-- Cooks can file a report and see their own; reports can't be edited or withdrawn,
-- so nobody can game the count by reporting and un-reporting.
GRANT SELECT, INSERT ON public.recipe_reports TO authenticated;
GRANT ALL ON public.recipe_reports TO service_role;
ALTER TABLE public.recipe_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_reports_read_own" ON public.recipe_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "recipe_reports_insert_own" ON public.recipe_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.ai_settings ADD COLUMN reports_to_hide INT NOT NULL DEFAULT 2;

-- Hide an AI recipe for everyone once enough different cooks have reported it.
CREATE FUNCTION public.hide_reported_recipe()
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
  IF (SELECT count(*) FROM public.recipe_reports WHERE recipe_id = NEW.recipe_id) >= v_threshold THEN
    UPDATE public.recipes SET hidden = true WHERE id = NEW.recipe_id::UUID;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.hide_reported_recipe() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER recipe_reports_hide_after_insert
AFTER INSERT ON public.recipe_reports
FOR EACH ROW EXECUTE FUNCTION public.hide_reported_recipe();

-- Vote totals per recipe, for ranking. Totals only: who voted stays private.
CREATE FUNCTION public.recipe_vote_totals()
RETURNS TABLE (recipe_id TEXT, ups INT, downs INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT recipe_id,
         count(*) FILTER (WHERE vote = 1)::INT,
         count(*) FILTER (WHERE vote = -1)::INT
  FROM public.recipe_votes
  GROUP BY recipe_id;
$$;
REVOKE EXECUTE ON FUNCTION public.recipe_vote_totals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recipe_vote_totals() TO authenticated;
