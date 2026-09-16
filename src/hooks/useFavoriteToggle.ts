import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { toggleFavorite } from "@/lib/kitchen.functions";
import type { Meal } from "@/lib/kitchen-data";

export function useFavoriteToggle() {
  const queryClient = useQueryClient();
  const toggle = useServerFn(toggleFavorite);

  return useMutation({
    mutationFn: (vars: { meal: Meal; favorite: boolean }) =>
      toggle({
        data: { mealId: vars.meal.id, snapshot: vars.meal, favorite: vars.favorite },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kitchen"] }),
  });
}
