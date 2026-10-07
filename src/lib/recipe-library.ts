import type { SupabaseClient } from "@supabase/supabase-js";

import { NO_PREFERENCES, normalizePreferences, type Preferences } from "./diet";
import type { Meal, RecipeIngredient } from "./kitchen-data";

/**
 * The recipe library, dietary needs and AI caps live in tables added by
 * supabase/migrations/20260929120000_recipe_library_and_ai_budget.sql. Until that
 * migration is applied (and the generated types refreshed) these queries go through
 * an untyped client, and every loader falls back to the pre-migration behaviour.
 */
export function untyped(client: unknown): SupabaseClient {
  return client as SupabaseClient;
}

export type RecipeRow = {
  id: string;
  title: string;
  meal: "Lunch" | "Dinner";
  minutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  allergens: string[];
  diets: string[];
};

/** Matches the starter recipes' blurbs: "Shrimp, arborio rice, garlic." */
export function blurbFor(names: string[]): string {
  const parts = names.map((n) => n.trim().toLowerCase()).filter(Boolean);
  if (parts.length === 0) return "";
  const text = parts.join(", ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function recipeToMeal(row: RecipeRow): Meal {
  const names = row.ingredients.map((i) => i.name);
  return {
    id: row.id,
    title: row.title,
    meal: row.meal,
    minutes: row.minutes,
    blurb: blurbFor(names),
    uses: names,
    steps: row.steps,
    ingredients: row.ingredients,
    allergens: row.allergens,
    diets: row.diets ?? [],
    source: "ai",
  };
}

/** Newest library recipes. How many are fetched bounds the planner's work. */
const LIBRARY_LIMIT = 500;

export async function loadLibrary(db: SupabaseClient): Promise<{ meals: Meal[]; available: boolean }> {
  const { data, error } = await db
    .from("recipes")
    .select("id, title, meal, minutes, ingredients, steps, allergens, diets")
    .order("created_at", { ascending: false })
    .limit(LIBRARY_LIMIT);
  if (error) return { meals: [], available: false };
  return { meals: (data as RecipeRow[]).map(recipeToMeal), available: true };
}

export async function loadPreferences(
  db: SupabaseClient,
  userId: string,
): Promise<{ prefs: Preferences; supported: boolean }> {
  const profile = (columns: string) =>
    db.from("profiles").select(columns).eq("id", userId).maybeSingle();
  // Several diets need the flexible-dietary-needs migration; before it, fall back
  // to the single diet column.
  let { data, error } = await profile("diets, allergies");
  if (error) ({ data, error } = await profile("diet, allergies"));
  if (error) return { prefs: NO_PREFERENCES, supported: false };
  return {
    prefs: normalizePreferences(
      (data ?? {}) as { diets?: string[]; diet?: string; allergies?: string[] },
    ),
    supported: true,
  };
}

export const REPORT_REASONS = ["allergens", "unsafe", "nonsense"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  allergens: "Wrong allergens",
  unsafe: "Unsafe steps",
  nonsense: "Doesn't make sense",
};

export type Votes = {
  /** False until the votes-and-reports migration is applied. */
  supported: boolean;
  /** The signed-in cook's own votes, by recipe id. */
  mine: Record<string, 1 | -1>;
  /** Recipes the signed-in cook has reported. */
  reported: string[];
  /** Everyone's thumbs up minus thumbs down, by recipe id. */
  scores: Record<string, number>;
};

export const NO_VOTES: Votes = { supported: false, mine: {}, reported: [], scores: {} };

export async function loadVotes(db: SupabaseClient, userId: string): Promise<Votes> {
  const [mine, reported, totals] = await Promise.all([
    db.from("recipe_votes").select("recipe_id, vote").eq("user_id", userId),
    db.from("recipe_reports").select("recipe_id").eq("user_id", userId),
    db.rpc("recipe_vote_totals"),
  ]);
  if (mine.error || reported.error || totals.error) return NO_VOTES;

  const votes: Votes = { supported: true, mine: {}, reported: [], scores: {} };
  for (const r of mine.data as { recipe_id: string; vote: number }[]) {
    votes.mine[r.recipe_id] = r.vote > 0 ? 1 : -1;
  }
  votes.reported = (reported.data as { recipe_id: string }[]).map((r) => r.recipe_id);
  for (const t of totals.data as { recipe_id: string; ups: number; downs: number }[]) {
    votes.scores[t.recipe_id] = t.ups - t.downs;
  }
  return votes;
}

export async function aiRemainingToday(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.rpc("ai_remaining_today");
  if (error || typeof data !== "number") return 0;
  return data;
}
