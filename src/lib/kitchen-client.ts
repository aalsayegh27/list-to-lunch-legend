import { queryOptions } from "@tanstack/react-query";

import { fitsPreferences, NO_PREFERENCES, type Preferences } from "./diet";
import { getKitchen, type Kitchen } from "./kitchen.functions";
import { meals, missingFor, recipeFacts, type Meal } from "./kitchen-data";
import { NO_VOTES, type Votes } from "./recipe-library";

export const kitchenQueryOptions = queryOptions<Kitchen>({
  queryKey: ["kitchen"],
  queryFn: () => getKitchen(),
  staleTime: 30_000,
});

export type RankedMeal = { meal: Meal; missing: string[] };

/** True when the cook has hidden this recipe for themselves (thumbs down or report). */
export function hiddenByCook(mealId: string, votes: Votes): boolean {
  return votes.mine[mealId] === -1 || votes.reported.includes(mealId);
}

/**
 * Every meal the cook could make with at most one item to buy, fewest missing first,
 * then best liked across all cooks, then quickest. Set `hidden` to get the meals the
 * cook has thumbed down instead (reported meals stay hidden).
 */
export function rankMeals(
  items: Kitchen["items"],
  library: Meal[] = [],
  prefs: Preferences = NO_PREFERENCES,
  votes: Votes = NO_VOTES,
  { hidden = false }: { hidden?: boolean } = {},
): RankedMeal[] {
  const stockedNames = items.filter((i) => i.in_stock).map((i) => i.name);
  return [...meals, ...library]
    .filter((meal) =>
      hidden
        ? votes.mine[meal.id] === -1 && !votes.reported.includes(meal.id)
        : !hiddenByCook(meal.id, votes),
    )
    .filter((meal) => fitsPreferences(recipeFacts(meal), prefs))
    .map((meal) => ({ meal, missing: missingFor(meal, stockedNames) }))
    .filter((r) => r.missing.length <= 1)
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        (votes.scores[b.meal.id] ?? 0) - (votes.scores[a.meal.id] ?? 0) ||
        a.meal.minutes - b.meal.minutes,
    );
}
