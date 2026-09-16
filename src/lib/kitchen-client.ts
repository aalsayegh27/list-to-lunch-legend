import { queryOptions } from "@tanstack/react-query";

import { getKitchen, type Kitchen } from "./kitchen.functions";
import { hasIngredient, meals, type Meal } from "./kitchen-data";

export const kitchenQueryOptions = queryOptions<Kitchen>({
  queryKey: ["kitchen"],
  queryFn: () => getKitchen(),
  staleTime: 30_000,
});

export type RankedMeal = { meal: Meal; missing: string[] };

export function rankMeals(items: Kitchen["items"]): RankedMeal[] {
  const stockedNames = items.filter((i) => i.in_stock).map((i) => i.name);
  return meals
    .map((meal) => ({
      meal,
      missing: meal.uses.filter((u) => !hasIngredient(u, stockedNames)),
    }))
    .filter((r) => r.missing.length <= 1)
    .sort(
      (a, b) => a.missing.length - b.missing.length || a.meal.minutes - b.meal.minutes,
    );
}
