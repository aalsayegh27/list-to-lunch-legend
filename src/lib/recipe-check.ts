import { ALLERGENS, detectAllergens, DIETS, fitsPreferences, type Preferences } from "./diet";
import { stockSatisfies, type RecipeIngredient } from "./kitchen-data";
import { toWords } from "./text-match";

/** A recipe as the AI returns it, before any checks. */
export type DraftRecipe = {
  title: string;
  meal: "Lunch" | "Dinner";
  minutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  allergens: string[];
  diets: string[];
};

/** A recipe that passed every check, in the shape the library stores. */
export type CheckedRecipe = DraftRecipe;

/**
 * Assumed in every kitchen (see pantryBasics), so never counted as an ingredient to
 * have or buy. An ingredient is a basic when its whole name is one of BASIC_NAMES
 * ("Salt"), or its name contains one of BASIC_PHRASES ("Smoked paprika"). Bare
 * "pepper" is only a basic on its own, so bell peppers still count.
 */
const BASIC_NAMES = ["salt", "pepper", "oil", "sage", "spices", "water", "ice"];
const BASIC_PHRASES = [
  "olive oil", "vegetable oil", "cooking oil", "neutral oil", "black pepper", "white pepper",
  "salt and pepper", "sea salt", "cumin", "paprika", "chilli flakes", "chili flakes",
  "red pepper flakes", "bay leaf", "bay leaves", "nutmeg", "dried sage",
];

function isBasic(name: string): boolean {
  const words = toWords(name).join(" ");
  if (BASIC_NAMES.some((b) => toWords(b).join(" ") === words)) return true;
  return stockSatisfies(BASIC_PHRASES, [name]);
}

export function titleKey(title: string): string {
  return toWords(title).join(" ");
}

function clean(text: string, max: number): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanIngredient(raw: RecipeIngredient): RecipeIngredient | null {
  const name = clean(raw.name, 60);
  if (!name) return null;
  const match = [...raw.match, name]
    .map((m) => clean(m, 40).toLowerCase())
    .filter((m, i, all) => m && all.indexOf(m) === i)
    .slice(0, 4);
  return { name, match };
}

/**
 * Keeps only recipes that use the cook's groceries (at most one item to buy), suit
 * their diet and allergies, have sensible steps and timings, and aren't already in
 * the library. Normalises what's kept: basics dropped, allergens made complete.
 */
export function checkRecipes(
  drafts: DraftRecipe[],
  stockedNames: string[],
  prefs: Preferences,
  existingTitleKeys: Set<string>,
): CheckedRecipe[] {
  const seen = new Set(existingTitleKeys);
  const kept: CheckedRecipe[] = [];

  for (const draft of drafts) {
    const title = clean(draft.title, 80);
    const key = titleKey(title);
    if (title.length < 3 || !key || seen.has(key)) continue;
    if (!Number.isInteger(draft.minutes) || draft.minutes < 5 || draft.minutes > 180) continue;

    const ingredients = draft.ingredients
      .map(cleanIngredient)
      .filter((i): i is RecipeIngredient => i !== null)
      .filter((i) => !isBasic(i.name));
    if (ingredients.length < 2 || ingredients.length > 12) continue;

    const steps = draft.steps.map((s) => clean(s, 300)).filter(Boolean);
    if (steps.length < 2 || steps.length > 10) continue;

    const missing = ingredients.filter((i) => !stockSatisfies(i.match, stockedNames));
    if (missing.length > 1) continue;

    const names = ingredients.map((i) => i.name);
    if (!fitsPreferences(names, prefs, draft.allergens)) continue;

    const allergens = ALLERGENS.filter(
      (a) => draft.allergens.includes(a) || detectAllergens(names).includes(a),
    );
    const diets = DIETS.filter(
      (d) => draft.diets.includes(d) && fitsPreferences(names, { diet: d, allergies: [] }),
    );

    seen.add(key);
    kept.push({ title, meal: draft.meal, minutes: draft.minutes, ingredients, steps, allergens, diets });
  }

  return kept;
}
