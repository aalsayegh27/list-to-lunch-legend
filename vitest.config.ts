// Kept separate from vite.config.ts so tests don't load the app's build plugins.
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    // The database tests start an in-memory Postgres per file.
    testTimeout: 30_000,
  },
});
