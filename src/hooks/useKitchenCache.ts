import { useQueryClient } from "@tanstack/react-query";

import { kitchenQueryOptions } from "@/lib/kitchen-client";
import type { Kitchen } from "@/lib/kitchen.functions";

/**
 * Buttons change the cached kitchen straight away and save in the background, so
 * nothing waits on the server. If a save fails, `resync` reloads the kitchen as the
 * server has it, which undoes the change on screen.
 */
export function useKitchenCache() {
  const queryClient = useQueryClient();
  const key = kitchenQueryOptions.queryKey;

  return {
    /** Apply a change on screen now. Stops any in-flight reload from overwriting it. */
    patch(change: (kitchen: Kitchen) => Kitchen) {
      void queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Kitchen>(key, (k) => (k ? change(k) : k));
    },
    /** Reload the kitchen from the server. */
    resync() {
      return queryClient.invalidateQueries({ queryKey: key });
    },
  };
}
