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
    source: "ai",
  };
}

/** Newest library recipes. How many are fetched bounds the planner's work. */
const LIBRARY_LIMIT = 500;

export async function loadLibrary(db: SupabaseClient): Promise<{ meals: Meal[]; available: boolean }> {
  const { data, error } = await db
    .from("recipes")
    .select("id, title, meal, minutes, ingredients, steps, allergens")
    .order("created_at", { ascending: false })
    .limit(LIBRARY_LIMIT);
  if (error) return { meals: [], available: false };
  return { meals: (data as RecipeRow[]).map(recipeToMeal), available: true };
}

export async function loadPreferences(
  db: SupabaseClient,
  userId: string,
): Promise<{ prefs: Preferences; supported: boolean }> {
  const { data, error } = await db
    .from("profiles")
    .select("diet, allergies")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { prefs: NO_PREFERENCES, supported: false };
  return {
    prefs: normalizePreferences((data ?? {}) as { diet?: string; allergies?: string[] }),
    supported: true,
  };
}

export async function aiRemainingToday(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.rpc("ai_remaining_today");
  if (error || typeof data !== "number") return 0;
  return data;
}
