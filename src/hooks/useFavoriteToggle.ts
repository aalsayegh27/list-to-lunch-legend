import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { toggleFavorite } from "@/lib/kitchen.functions";
import type { Meal } from "@/lib/kitchen-data";
import { useKitchenCache } from "./useKitchenCache";

/** The heart fills (or empties) straight away; a failed save puts it back. */
export function useFavoriteToggle() {
  const cache = useKitchenCache();
  const toggle = useServerFn(toggleFavorite);

  return useMutation({
    onMutate: ({ meal, favorite }: { meal: Meal; favorite: boolean }) =>
      cache.patch((k) => {
        const others = k.favorites.filter((f) => f.meal_id !== meal.id);
        return {
          ...k,
          favorites: favorite
            ? [
                { meal_id: meal.id, snapshot: meal, created_at: new Date().toISOString() },
                ...others,
              ]
            : others,
        };
      }),
    mutationFn: (vars: { meal: Meal; favorite: boolean }) =>
      toggle({
        data: { mealId: vars.meal.id, snapshot: vars.meal, favorite: vars.favorite },
      }),
    onError: () => cache.resync(),
  });
}
