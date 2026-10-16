import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * After a new deploy, a tab opened earlier asks for page files that no longer exist,
 * so its links silently fail. Reload onto the current version instead (at most once
 * a minute, so a genuinely missing file can't cause a reload loop).
 */
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    const key = "mise:reloaded-for-update";
    try {
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Storage blocked: reload anyway.
    }
    event.preventDefault();
    window.location.reload();
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
