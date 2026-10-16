import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { guessCategory, normalizeCategory } from "./categorize";
import { normalizePreferences, type Preferences } from "./diet";
import type { Meal } from "./kitchen-data";
import {
  aiRemainingToday,
  loadLibrary,
  loadPreferences,
  loadVotes,
  REPORT_REASONS,
  untyped,
  type Votes,
} from "./recipe-library";

/** The only values the old single-diet profile column accepts. */
const LEGACY_DIETS = ["vegetarian", "vegan", "pescatarian"];

/** Starter slugs ("shrimp-rice") or AI recipe UUIDs; the database checks the rest. */
const RECIPE_ID = /^[a-z0-9-]{3,64}$/;

const PANTRY_COLUMNS = "id, name, category, in_stock";

export type PantryRow = {
  id: string;
  name: string;
  category: string;
  in_stock: boolean;
};

export type FavoriteRow = {
  meal_id: string;
  snapshot: Meal;
  created_at: string;
};

export type Kitchen = {
  email: string | null;
  onboarded: boolean;
  items: PantryRow[];
  favorites: FavoriteRow[];
  /** AI-created recipes from the shared library. */
  library: Meal[];
  prefs: Preferences;
  /** False until the recipe-library migration is applied. */
  prefsSupported: boolean;
  ai: { ready: boolean; remainingToday: number };
  votes: Votes;
};

export const getKitchen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Kitchen> => {
    const { supabase, userId } = context;
    const db = untyped(supabase);

    const [profile, items, favorites, library, preferences, votes, remaining] = await Promise.all([
      supabase.from("profiles").select("email, onboarded_at").eq("id", userId).maybeSingle(),
      supabase
        .from("pantry_items")
        .select(PANTRY_COLUMNS)
        .eq("user_id", userId)
        // Items added in one batch share a created_at, so break ties by name —
        // otherwise Postgres can reshuffle them after every update.
        .order("created_at", { ascending: true })
        .order("name", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("favorite_recipes")
        .select("meal_id, snapshot, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      loadLibrary(db),
      loadPreferences(db, userId),
      loadVotes(db, userId),
      aiRemainingToday(db),
    ]);

    if (items.error) throw items.error;
    if (favorites.error) throw favorites.error;

    const aiReady =
      library.available &&
      Boolean(process.env["ANTHROPIC_API_KEY"]) &&
      Boolean(process.env["MISE_SERVER_SECRET"]);

    return {
      email: profile.data?.email ?? null,
      onboarded: Boolean(profile.data?.onboarded_at),
      items: (items.data ?? []) as PantryRow[],
      favorites: (favorites.data ?? []) as unknown as FavoriteRow[],
      library: library.meals,
      prefs: preferences.prefs,
      prefsSupported: preferences.supported,
      ai: { ready: aiReady, remainingToday: aiReady ? remaining : 0 },
      votes,
    };
  });

/** Thumbs up (1), thumbs down (-1) or clear (0) the cook's vote on a recipe. */
export const setVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recipeId: string; vote: number }) => {
    if (!RECIPE_ID.test(input.recipeId)) throw new Error("Unknown recipe");
    const vote = input.vote > 0 ? 1 : input.vote < 0 ? -1 : 0;
    return { recipeId: input.recipeId, vote };
  })
  .handler(async ({ data, context }) => {
    const votes = untyped(context.supabase).from("recipe_votes");
    const { error } =
      data.vote === 0
        ? await votes.delete().eq("user_id", context.userId).eq("recipe_id", data.recipeId)
        : await votes.upsert(
            { user_id: context.userId, recipe_id: data.recipeId, vote: data.vote },
            { onConflict: "user_id,recipe_id" },
          );
    if (error) throw error;
    return data;
  });

/** Report a problem with a recipe. Hides it for this cook; see the migration for the rest. */
export const reportRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recipeId: string; reason: string }) => {
    if (!RECIPE_ID.test(input.recipeId)) throw new Error("Unknown recipe");
    const reason = REPORT_REASONS.find((r) => r === input.reason);
    if (!reason) throw new Error("Unknown reason");
    return { recipeId: input.recipeId, reason };
  })
  .handler(async ({ data, context }) => {
    const { error } = await untyped(context.supabase)
      .from("recipe_reports")
      .upsert(
        { user_id: context.userId, recipe_id: data.recipeId, reason: data.reason },
        { onConflict: "user_id,recipe_id", ignoreDuplicates: true },
      );
    if (error) throw error;
    return data;
  });

export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { diets: string[]; allergies: string[] }) => normalizePreferences(input))
  .handler(async ({ data, context }) => {
    // Keep the old single-diet column roughly in step for anything still reading it.
    const legacyDiet = data.diets.find((d) => LEGACY_DIETS.includes(d)) ?? null;
    const { error } = await untyped(context.supabase)
      .from("profiles")
      .upsert(
        { id: context.userId, diets: data.diets, diet: legacyDiet, allergies: data.allergies },
        { onConflict: "id" },
      );
    if (error) throw error;
    return data;
  });

export const addPantryItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { names: string[]; category?: string }) => {
    const names = (input.names ?? [])
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && n.length <= 60)
      .slice(0, 200);
    return { names, category: input.category };
  })
  .handler(async ({ data, context }) => {
    if (data.names.length === 0) return { items: [] };
    const { supabase, userId } = context;

    const existing = await supabase.from("pantry_items").select("name").eq("user_id", userId);
    if (existing.error) throw existing.error;
    const taken = new Set((existing.data ?? []).map((r) => r.name.toLowerCase()));

    const rows = data.names
      .filter((name) => {
        const key = name.toLowerCase();
        if (taken.has(key)) return false;
        taken.add(key);
        return true;
      })
      .map((name) => ({
        user_id: userId,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        category: data.category ? normalizeCategory(data.category) : guessCategory(name),
        in_stock: true,
      }));

    if (rows.length === 0) return { items: [] };
    const { data: added, error } = await supabase
      .from("pantry_items")
      .insert(rows)
      .select(PANTRY_COLUMNS);
    if (error) throw error;
    return { items: (added ?? []) as PantryRow[] };
  });

export const seedStarterPantry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { items: { name: string; category: string; inStock: boolean }[] }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const existing = await supabase.from("pantry_items").select("name").eq("user_id", userId);
    if (existing.error) throw existing.error;
    const taken = new Set((existing.data ?? []).map((r) => r.name.toLowerCase()));

    const rows = data.items
      .filter((i) => i.name.trim().length <= 60)
      .filter((i) => i.name.trim() && !taken.has(i.name.trim().toLowerCase()))
      .slice(0, 300)
      .map((i) => ({
        user_id: userId,
        name: i.name.trim(),
        category: normalizeCategory(i.category),
        in_stock: i.inStock,
      }));

    if (rows.length === 0) return { items: [] };
    const { data: added, error } = await supabase
      .from("pantry_items")
      .insert(rows)
      .select(PANTRY_COLUMNS);
    if (error) throw error;
    return { items: (added ?? []) as PantryRow[] };
  });

export const updatePantryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; category?: string; inStock?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const patch: { category?: string; in_stock?: boolean } = {};
    if (data.category !== undefined) patch.category = normalizeCategory(data.category);
    if (data.inStock !== undefined) patch.in_stock = data.inStock;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("pantry_items")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const removePantryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pantry_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const clearPantry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("pantry_items")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const finishOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert(
        {
          id: context.userId,
          email: context.claims?.email ?? null,
          onboarded_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mealId: string; snapshot: Meal; favorite: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!data.favorite) {
      const { error } = await supabase
        .from("favorite_recipes")
        .delete()
        .eq("user_id", userId)
        .eq("meal_id", data.mealId);
      if (error) throw error;
      return { favorite: false };
    }

    const { error } = await supabase.from("favorite_recipes").upsert(
      {
        user_id: userId,
        meal_id: data.mealId,
        snapshot: data.snapshot as unknown as never,
      },
      { onConflict: "user_id,meal_id" },
    );
    if (error) throw error;
    return { favorite: true };
  });
