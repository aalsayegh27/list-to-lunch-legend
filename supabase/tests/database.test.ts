// Runs every migration in supabase/migrations against an in-memory Postgres set up
// like Supabase (an auth stub, and Supabase's default grants to anon/authenticated
// on new tables and functions), then checks the access rules as real cooks would
// meet them: row-level security, the AI spending caps, the server-secret lock, and
// votes and reports.
import { PGlite } from "@electric-sql/pglite";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = join(__dirname, "..", "migrations");
const SECRET = "test-server-secret";
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";

let db: PGlite;

/** Run SQL as a signed-in cook, so grants and row-level security apply. */
async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []) {
  await db.exec(`SET test.uid = '${uid}'; SET ROLE authenticated;`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("RESET ROLE;");
  }
}

async function errorOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

const recipe = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  meal: "Dinner",
  minutes: 30,
  ingredients: [
    { name: "Rice", match: ["rice"] },
    { name: "Garlic", match: ["garlic"] },
  ],
  steps: ["Cook rice.", "Add garlic."],
  allergens: [],
  diets: ["vegan"],
  ...extra,
});

/** Reserve and finish a generation the way the app's server does. */
async function generate(uid: string, recipes: unknown[]) {
  const [{ id }] = await as<{ id: string }>(uid, "SELECT ai_reserve_generation($1) AS id", [SECRET]);
  return as<{ id: string; title: string }>(
    uid,
    "SELECT id, title FROM ai_finish_generation($1, $2, 2000, 4000, $3)",
    [SECRET, id, JSON.stringify(recipes)],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public TO authenticated, anon;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  `);
  for (const file of readdirSync(MIGRATIONS).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  // The real secret lives only in the hosts' environment; use a test one.
  await db.query("UPDATE ai_settings SET server_secret_sha256 = $1", [
    createHash("sha256").update(SECRET).digest("hex"),
  ]);
  // Tests make many batches; the cap test below sets the real limit itself.
  await db.exec("UPDATE ai_settings SET per_user_daily_batches = 100");
  await db.exec(`INSERT INTO auth.users VALUES ('${A}', 'a@test'), ('${B}', 'b@test'), ('${C}', 'c@test');`);
});

describe("profiles", () => {
  it("cooks can set their own dietary needs, within the allowed values", async () => {
    await as(A, "UPDATE profiles SET diet = 'vegan', allergies = '{nuts}' WHERE id = $1", [A]);
    expect(await as(A, "SELECT diet, allergies FROM profiles")).toEqual([{ diet: "vegan", allergies: ["nuts"] }]);
    expect(await errorOf(() => as(A, "UPDATE profiles SET diet = 'keto' WHERE id = $1", [A]))).not.toBeNull();
  });
});

describe("AI generation lock", () => {
  it("refuses cooks calling without the server secret", async () => {
    expect(await errorOf(() => as(B, "SELECT ai_reserve_generation(NULL)"))).toBe("ai_forbidden");
    expect(await errorOf(() => as(B, "SELECT ai_reserve_generation('guess')"))).toBe("ai_forbidden");
    expect(await errorOf(() => as(B, "SELECT ai_require_server_secret('x')"))).not.toBeNull();
  });

  it("doesn't let a cook settle their own batch at $0", async () => {
    const [{ id }] = await as<{ id: string }>(B, "SELECT ai_reserve_generation($1) AS id", [SECRET]);
    expect(
      await errorOf(() => as(B, "SELECT * FROM ai_finish_generation('guess', $1, 0, 0, '[]')", [id])),
    ).toBe("ai_forbidden");
    expect(await as(B, "UPDATE ai_generations SET cost_usd = 0 RETURNING id")).toEqual([]);
    const [row] = (await db.query<{ status: string; c: number }>(
      "SELECT status, cost_usd::float AS c FROM ai_generations WHERE id = $1",
      [id],
    )).rows;
    expect(row).toEqual({ status: "pending", c: 0.15 });
  });

  it("saves recipes through the server, skipping duplicate titles and settling real cost", async () => {
    const saved = await generate(A, [recipe("Garlic Rice"), recipe("garlic rice!"), recipe("Lemon Rice")]);
    expect(saved.map((r) => r.title)).toEqual(["Garlic Rice", "Lemon Rice"]);
    const [gen] = (await db.query<{ c: number }>(
      "SELECT cost_usd::float AS c FROM ai_generations WHERE status = 'done' ORDER BY created_at LIMIT 1",
    )).rows;
    expect(gen?.c).toBe(0.044);
  });

  it("rejects malformed recipes even from the server", async () => {
    const bad = async (r: unknown) => errorOf(() => generate(C, [r]));
    expect(await bad(recipe("Bad A", { allergens: ["satay"] }))).toMatch(/recipes_allergens_known/);
    expect(await bad(recipe("Bad D", { diets: ["keto"] }))).toMatch(/recipes_diets_known/);
    expect(
      await bad(recipe("Bad I", { ingredients: [{ name: 5, match: ["rice"] }, { name: "G", match: ["g"] }] })),
    ).toMatch(/recipes_ingredients_shape/);
    expect(await bad(recipe("Bad S", { steps: ["x".repeat(301), "ok"] }))).toMatch(/recipes_steps_shape/);
  });

  it("keeps the library read-only for cooks", async () => {
    expect(
      await errorOf(() =>
        as(B, `INSERT INTO recipes (title, meal, minutes, ingredients, steps)
               VALUES ('Junk', 'Lunch', 10, '[{"name":"a","match":["a"]},{"name":"b","match":["b"]}]', '["a","b"]')`),
      ),
    ).not.toBeNull();
    expect((await as(B, "SELECT title FROM recipes")).length).toBeGreaterThan(0);
  });

  it("enforces the per-cook daily cap and the app-wide budget", async () => {
    await db.exec("UPDATE ai_settings SET per_user_daily_batches = 3");
    // B has one pending batch from above.
    await as(B, "SELECT ai_reserve_generation($1)", [SECRET]);
    await as(B, "SELECT ai_reserve_generation($1)", [SECRET]);
    expect(await errorOf(() => as(B, "SELECT ai_reserve_generation($1)", [SECRET]))).toBe("ai_user_limit");
    expect((await as<{ n: number }>(B, "SELECT ai_remaining_today() AS n"))[0]?.n).toBe(0);

    await db.exec("UPDATE ai_settings SET daily_budget_usd = 0.01");
    expect(await errorOf(() => as(A, "SELECT ai_reserve_generation($1)", [SECRET]))).toBe("ai_budget");
    await db.exec("UPDATE ai_settings SET daily_budget_usd = 100, per_user_daily_batches = 100");
  });

  it("is closed to signed-out visitors", async () => {
    await db.exec("SET test.uid = ''; SET ROLE anon;");
    const err = await errorOf(() => db.query("SELECT ai_reserve_generation($1)", [SECRET]));
    await db.exec("RESET ROLE;");
    expect(err).not.toBeNull();
  });
});

describe("votes", () => {
  let recipeId: string;
  beforeAll(async () => {
    [{ id: recipeId }] = (await generate(C, [recipe("Vote Test Rice")])) as [{ id: string }];
  });

  it("lets a cook thumb up, switch to thumbs down, and clear their vote", async () => {
    await as(A, "INSERT INTO recipe_votes (recipe_id, vote) VALUES ($1, 1)", [recipeId]);
    await as(A, "UPDATE recipe_votes SET vote = -1 WHERE recipe_id = $1", [recipeId]);
    expect(await as(A, "SELECT vote FROM recipe_votes WHERE recipe_id = $1", [recipeId])).toEqual([{ vote: -1 }]);
    await as(A, "DELETE FROM recipe_votes WHERE recipe_id = $1", [recipeId]);
    expect(await as(A, "SELECT vote FROM recipe_votes WHERE recipe_id = $1", [recipeId])).toEqual([]);
  });

  it("works on starter recipes and rejects unknown ids", async () => {
    await as(A, "INSERT INTO recipe_votes (recipe_id, vote) VALUES ('shakshuka', 1)");
    expect(await errorOf(() => as(A, "INSERT INTO recipe_votes (recipe_id, vote) VALUES ('made-up', 1)"))).toMatch(
      /recipe_votes_recipe_id_check/,
    );
  });

  it("allows one vote per cook per recipe, and only for themselves", async () => {
    await as(B, "INSERT INTO recipe_votes (recipe_id, vote) VALUES ($1, 1)", [recipeId]);
    expect(await errorOf(() => as(B, "INSERT INTO recipe_votes (recipe_id, vote) VALUES ($1, 1)", [recipeId]))).not.toBeNull();
    expect(
      await errorOf(() => as(B, "INSERT INTO recipe_votes (user_id, recipe_id, vote) VALUES ($1, $2, -1)", [C, recipeId])),
    ).toMatch(/row-level security/);
    expect(await errorOf(() => as(B, "INSERT INTO recipe_votes (recipe_id, vote) VALUES ($1, 5)", [recipeId]))).not.toBeNull();
  });

  it("keeps who voted private, sharing only totals", async () => {
    await as(C, "INSERT INTO recipe_votes (recipe_id, vote) VALUES ($1, -1)", [recipeId]);
    expect(await as(A, "SELECT * FROM recipe_votes WHERE recipe_id = $1", [recipeId])).toEqual([]);
    const totals = await as<{ recipe_id: string; ups: number; downs: number }>(
      A,
      "SELECT * FROM recipe_vote_totals() WHERE recipe_id = $1",
      [recipeId],
    );
    expect(totals).toEqual([{ recipe_id: recipeId, ups: 1, downs: 1 }]);
  });

  it("never hides a recipe for everyone, whatever the votes", async () => {
    await as(A, "INSERT INTO recipe_votes (recipe_id, vote) VALUES ($1, -1)", [recipeId]);
    expect(await as(B, "SELECT id FROM recipes WHERE id = $1", [recipeId])).toHaveLength(1);
  });
});

describe("reports", () => {
  it("hides an AI recipe for everyone after two different cooks report it", async () => {
    const [{ id }] = (await generate(C, [recipe("Report Test Rice")])) as [{ id: string }];
    await as(A, "INSERT INTO recipe_reports (recipe_id, reason) VALUES ($1, 'unsafe')", [id]);
    expect(await as(C, "SELECT id FROM recipes WHERE id = $1", [id])).toHaveLength(1);
    expect(await as(A, "SELECT recipe_id FROM recipe_reports")).toEqual([{ recipe_id: id }]);
    expect(await as(B, "SELECT * FROM recipe_reports")).toEqual([]);

    await as(B, "INSERT INTO recipe_reports (recipe_id, reason) VALUES ($1, 'allergens')", [id]);
    expect(await as(C, "SELECT id FROM recipes WHERE id = $1", [id])).toEqual([]);
    // Still in the database, just hidden.
    expect((await db.query("SELECT hidden FROM recipes WHERE id = $1", [id])).rows).toEqual([{ hidden: true }]);
  });

  it("can't be withdrawn, repeated, or filed for someone else", async () => {
    const id = randomUUID();
    await as(A, "INSERT INTO recipe_reports (recipe_id, reason) VALUES ($1, 'nonsense')", [id]);
    expect(await as(A, "DELETE FROM recipe_reports WHERE recipe_id = $1 RETURNING recipe_id", [id])).toEqual([]);
    expect(await errorOf(() => as(A, "INSERT INTO recipe_reports (recipe_id, reason) VALUES ($1, 'unsafe')", [id]))).not.toBeNull();
    expect(
      await errorOf(() => as(A, "INSERT INTO recipe_reports (user_id, recipe_id, reason) VALUES ($1, $2, 'unsafe')", [B, id])),
    ).toMatch(/row-level security/);
    expect(await errorOf(() => as(A, "INSERT INTO recipe_reports (recipe_id, reason) VALUES ('shakshuka', 'spam')"))).not.toBeNull();
  });

  it("never hides a starter recipe for everyone", async () => {
    await as(B, "INSERT INTO recipe_reports (recipe_id, reason) VALUES ('shakshuka', 'unsafe')");
    await as(C, "INSERT INTO recipe_reports (recipe_id, reason) VALUES ('shakshuka', 'unsafe')");
    expect((await db.query("SELECT count(*)::int AS n FROM recipe_reports WHERE recipe_id = 'shakshuka'")).rows).toEqual([
      { n: 2 },
    ]);
  });
});
