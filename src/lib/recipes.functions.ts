import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fitsPreferences } from "./diet";
import { meals, recipeFacts } from "./kitchen-data";
import { checkRecipes, type DraftRecipe } from "./recipe-check";
import {
  aiRemainingToday,
  loadLibrary,
  loadPreferences,
  recipeToMeal,
  untyped,
  type RecipeRow,
} from "./recipe-library";

export type GenerateResult =
  | { ok: true; added: number; remainingToday: number }
  | { ok: false; message: string; remainingToday: number };

/** How many existing titles to show the AI so it doesn't repeat them. */
const KNOWN_DISHES = 40;

const LIMIT_MESSAGES: Record<string, string> = {
  ai_user_limit: "You've used today's new-meal suggestions. More tomorrow!",
  ai_budget: "Mise has handed out all of today's new-meal suggestions. Try again tomorrow.",
};

export const generateRecipes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { meal?: string | null }): { meal: "Lunch" | "Dinner" | null } => ({
    meal: input.meal === "Lunch" || input.meal === "Dinner" ? input.meal : null,
  }))
  .handler(async ({ data, context }): Promise<GenerateResult> => {
    const db = untyped(context.supabase);
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    // Proves to the database that this call comes from the app's server; without it
    // the reserve/finish functions refuse (see 20261006120000_lock_down_ai_functions.sql).
    const serverSecret = process.env["MISE_SERVER_SECRET"];

    const [pantry, library, preferences] = await Promise.all([
      context.supabase
        .from("pantry_items")
        .select("name")
        .eq("user_id", context.userId)
        .eq("in_stock", true),
      loadLibrary(db),
      loadPreferences(db, context.userId),
    ]);
    if (!apiKey || !serverSecret || !library.available) {
      return { ok: false, message: "New-meal suggestions aren't switched on yet.", remainingToday: 0 };
    }
    if (pantry.error) throw pantry.error;

    const stockedNames = (pantry.data ?? []).map((r) => r.name);
    if (stockedNames.length < 3) {
      return {
        ok: false,
        message: "Add a few more groceries first, then ask for new meals.",
        remainingToday: await aiRemainingToday(db),
      };
    }

    // Book the batch against the daily caps before spending anything.
    const reserved = await db.rpc("ai_reserve_generation", { p_server_secret: serverSecret });
    if (reserved.error) {
      const limit = Object.keys(LIMIT_MESSAGES).find((k) => reserved.error.message.includes(k));
      if (limit) return { ok: false, message: LIMIT_MESSAGES[limit]!, remainingToday: 0 };
      throw reserved.error;
    }
    const generationId = reserved.data as string;

    const prefs = preferences.prefs;
    const known = [...meals, ...library.meals];
    const knownDishes = known
      .filter((m) => fitsPreferences(recipeFacts(m), prefs))
      .filter((m) => !data.meal || m.meal === data.meal)
      .slice(0, KNOWN_DISHES)
      .map((m) => m.title);

    let drafts: DraftRecipe[] = [];
    let usage = { inputTokens: 0, outputTokens: 0 };
    try {
      const { generateRecipeBatch } = await import("./recipe-ai.server");
      const batch = await generateRecipeBatch({
        apiKey,
        stockedNames,
        prefs,
        meal: data.meal,
        knownDishes,
      });
      drafts = batch.recipes;
      usage = batch.usage;
    } catch (error) {
      console.error("[recipes] generation failed", error);
    }

    const checked = checkRecipes(drafts, stockedNames, prefs, known);

    // Settle the real cost and save what passed, even when nothing did.
    const finished = await db.rpc("ai_finish_generation", {
      p_server_secret: serverSecret,
      p_generation_id: generationId,
      p_input_tokens: usage.inputTokens,
      p_output_tokens: usage.outputTokens,
      p_recipes: checked,
    });
    if (finished.error) throw finished.error;

    const saved = ((finished.data ?? []) as RecipeRow[]).map(recipeToMeal);
    const remainingToday = await aiRemainingToday(db);
    if (saved.length === 0) {
      return {
        ok: false,
        message: "Couldn't come up with new meals from this kitchen just now. Try again in a bit.",
        remainingToday,
      };
    }
    return { ok: true, added: saved.length, remainingToday };
  });
