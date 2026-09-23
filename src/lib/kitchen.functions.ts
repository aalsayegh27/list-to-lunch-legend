import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { guessCategory, normalizeCategory } from "./categorize";
import type { Meal } from "./kitchen-data";

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
};

export const getKitchen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Kitchen> => {
    const { supabase, userId } = context;

    const [profile, items, favorites] = await Promise.all([
      supabase.from("profiles").select("email, onboarded_at").eq("id", userId).maybeSingle(),
      supabase
        .from("pantry_items")
        .select("id, name, category, in_stock")
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
    ]);

    if (items.error) throw items.error;
    if (favorites.error) throw favorites.error;

    return {
      email: profile.data?.email ?? null,
      onboarded: Boolean(profile.data?.onboarded_at),
      items: (items.data ?? []) as PantryRow[],
      favorites: (favorites.data ?? []) as unknown as FavoriteRow[],
    };
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
    if (data.names.length === 0) return { added: 0 };
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

    if (rows.length === 0) return { added: 0 };
    const { error } = await supabase.from("pantry_items").insert(rows);
    if (error) throw error;
    return { added: rows.length };
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
      .filter((i) => i.name.trim() && !taken.has(i.name.trim().toLowerCase()))
      .slice(0, 300)
      .map((i) => ({
        user_id: userId,
        name: i.name.trim(),
        category: normalizeCategory(i.category),
        in_stock: i.inStock,
      }));

    if (rows.length === 0) return { added: 0 };
    const { error } = await supabase.from("pantry_items").insert(rows);
    if (error) throw error;
    return { added: rows.length };
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
