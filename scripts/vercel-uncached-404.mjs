// Runs after `vite build`. Vercel's output marks everything under /assets/ cacheable
// for a year, including "not found" answers. A browser that asks for a page file a
// moment before a new version is live would then keep that 404 and stay broken, so
// answer missing assets with a 404 that isn't cached. Does nothing outside Vercel.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = ".vercel/output/config.json";
if (existsSync(file)) {
  const config = JSON.parse(readFileSync(file, "utf8"));
  const filesystem = config.routes.findIndex((r) => r.handle === "filesystem");
  if (filesystem === -1) throw new Error(`${file}: no filesystem route to follow`);
  // After "filesystem", anything still matching /assets/ is a file that doesn't exist.
  config.routes.splice(filesystem + 1, 0, {
    src: "/assets/(.*)",
    status: 404,
    headers: { "cache-control": "no-store" },
  });
  writeFileSync(file, JSON.stringify(config, null, 2));
  console.log("Missing /assets/ files now answer 404 without caching.");
}
