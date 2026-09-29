import { queryOptions } from "@tanstack/react-query";

import { fitsPreferences, NO_PREFERENCES, type Preferences } from "./diet";
import { getKitchen, type Kitchen } from "./kitchen.functions";
import { ingredientNames, meals, missingFor, type Meal } from "./kitchen-data";

export const kitchenQueryOptions = queryOptions<Kitchen>({
  queryKey: ["kitchen"],
  queryFn: () => getKitchen(),
  staleTime: 30_000,
});

export type RankedMeal = { meal: Meal; missing: string[] };

/** Most meals shown at once, so a large library doesn't bury the best matches. */
const MAX_SHOWN = 30;

export function rankMeals(
  items: Kitchen["items"],
  library: Meal[] = [],
  prefs: Preferences = NO_PREFERENCES,
): RankedMeal[] {
  const stockedNames = items.filter((i) => i.in_stock).map((i) => i.name);
  return [...meals, ...library]
    .filter((meal) => fitsPreferences(ingredientNames(meal), prefs, meal.allergens))
    .map((meal) => ({ meal, missing: missingFor(meal, stockedNames) }))
    .filter((r) => r.missing.length <= 1)
    .sort(
      (a, b) => a.missing.length - b.missing.length || a.meal.minutes - b.meal.minutes,
    )
    .slice(0, MAX_SHOWN);
}
