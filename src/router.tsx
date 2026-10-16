import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * After a new deploy, a tab opened earlier asks for page files that no longer exist,
 * so its links silently fail. And a browser that asked for a new file a moment before
 * it went live may have kept the "not found" answer. Re-fetch any failed page files
 * past the browser cache, then reload onto the current version (at most once a
 * minute, so a genuinely missing file can't cause a reload loop).
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
    const failed = performance
      .getEntriesByType("resource")
      .filter(
        (e) =>
          e.name.includes("/assets/") &&
          ((e as PerformanceResourceTiming).responseStatus ?? 0) >= 400,
      )
      .map((e) => e.name);
    void Promise.all(
      [...new Set(failed)].map((url) => fetch(url, { cache: "reload" }).catch(() => null)),
    ).finally(() => window.location.reload());
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
