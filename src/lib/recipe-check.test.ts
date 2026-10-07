import { describe, expect, it } from "vitest";

import type { Meal } from "./kitchen-data";
import { checkRecipes, isNearDuplicate, type DraftRecipe } from "./recipe-check";

const stocked = ["Chicken thighs", "Lemons", "Garlic", "Rice", "Spinach", "Baby bell peppers"];
const none = { diets: [], allergies: [] };

function draft(title: string, ingredients: [string, string[]][], extra: Partial<DraftRecipe> = {}): DraftRecipe {
  return {
    title,
    meal: "Dinner",
    minutes: 30,
    steps: ["Do a.", "Do b.", "Do c."],
    allergens: [],
    diets: [],
    ingredients: ingredients.map(([name, match]) => ({ name, match })),
    ...extra,
  };
}

const lemonChicken = draft("Lemon Garlic Chicken & Rice", [
  ["Chicken thighs", ["chicken thigh", "chicken"]],
  ["Lemon", ["lemon"]],
  ["Garlic", ["garlic"]],
  ["Rice", ["rice"]],
  ["Olive oil", ["olive oil"]],
  ["Salt", ["salt"]],
]);

describe("checkRecipes", () => {
  it("keeps good recipes and drops the assumed basics", () => {
    const [kept] = checkRecipes([lemonChicken], stocked, none, []);
    expect(kept?.ingredients.map((i) => i.name)).toEqual(["Chicken thighs", "Lemon", "Garlic", "Rice"]);
  });

  it("keeps bell peppers (not the assumed salt & pepper)", () => {
    const [kept] = checkRecipes(
      [draft("Pepper Rice", [["Baby bell peppers", ["bell pepper", "pepper"]], ["Rice", ["rice"]]])],
      stocked, none, [],
    );
    expect(kept?.ingredients.map((i) => i.name)).toEqual(["Baby bell peppers", "Rice"]);
  });

  it("rejects recipes needing more than one item to buy", () => {
    const needsTwo = draft("Salmon Asparagus", [["Salmon", ["salmon"]], ["Asparagus", ["asparagus"]], ["Lemon", ["lemon"]]]);
    expect(checkRecipes([needsTwo], stocked, none, [])).toEqual([]);
  });

  it("rejects silly timings and too few steps", () => {
    const quick = draft("Too Quick", [["Rice", ["rice"]], ["Spinach", ["spinach"]]], { minutes: 2 });
    const oneStep = draft("One Step", [["Rice", ["rice"]], ["Spinach", ["spinach"]]], { steps: ["Eat."] });
    expect(checkRecipes([quick, oneStep], stocked, none, [])).toEqual([]);
  });

  it("completes allergens from ingredient names", () => {
    const [kept] = checkRecipes(
      [draft("Spinach Rice Bowl", [["Spinach", ["spinach"]], ["Rice", ["rice"]], ["Feta", ["feta"]]])],
      stocked, none, [],
    );
    expect(kept?.allergens).toEqual(["dairy"]);
  });

  it("respects the cook's diet and allergies", () => {
    expect(checkRecipes([lemonChicken], stocked, { diets: ["vegetarian"], allergies: [] }, [])).toEqual([]);
    const feta = draft("Feta Bowl", [["Spinach", ["spinach"]], ["Rice", ["rice"]], ["Feta", ["feta"]]]);
    expect(checkRecipes([feta], stocked, { diets: [], allergies: ["dairy"] }, [])).toEqual([]);
  });

  it("skips titles already in the library, in any spelling", () => {
    const existing = { id: "1", title: "lemon garlic chicken & rice!", meal: "Dinner", minutes: 30, blurb: "", uses: [], steps: [] } satisfies Meal;
    expect(checkRecipes([lemonChicken], stocked, none, [existing])).toEqual([]);
  });

  it("skips near-duplicates of library recipes under a new title", () => {
    const [saved] = checkRecipes([lemonChicken], stocked, none, []);
    const library: Meal[] = [{ ...saved!, id: "1", blurb: "", uses: saved!.ingredients.map((i) => i.name) }];
    const renamed = draft("Garlic-Lemon Chicken with Rice", [
      ["Chicken thighs", ["chicken thigh"]],
      ["Garlic", ["garlic"]],
      ["Lemon", ["lemon"]],
      ["Rice", ["rice"]],
      ["Spinach", ["spinach"]],
    ]);
    expect(checkRecipes([renamed], stocked, none, library)).toEqual([]);
  });

  it("skips near-duplicates within the same batch", () => {
    const twin = draft("Chicken, Lemon & Garlic Rice", [
      ["Chicken thighs", ["chicken thigh"]], ["Lemon", ["lemon"]], ["Garlic", ["garlic"]], ["Rice", ["rice"]],
    ]);
    expect(checkRecipes([lemonChicken, twin], stocked, none, []).map((r) => r.title)).toEqual([
      "Lemon Garlic Chicken & Rice",
    ]);
  });
});

describe("isNearDuplicate", () => {
  it("needs the same meal type and mostly the same ingredients", () => {
    const a = { meal: "Dinner", keys: ["chicken thigh", "lemon", "garlic", "rice"] };
    expect(isNearDuplicate(a, { meal: "Dinner", keys: ["chicken thigh", "lemon", "garlic", "rice", "dill"] })).toBe(true);
    expect(isNearDuplicate(a, { meal: "Lunch", keys: a.keys })).toBe(false);
    expect(isNearDuplicate(a, { meal: "Dinner", keys: ["chicken thigh", "lemon", "potato", "leek"] })).toBe(false);
  });
});

describe("diet tags on saved recipes", () => {
  const lowFodmap = { diets: ["low fodmap"], allergies: [] };
  const rice = (claimed: string[]) =>
    draft("Spinach Rice Bowl", [["Spinach", ["spinach"]], ["Rice", ["rice"]]], { diets: claimed });

  it("tags the built-in diets a recipe passes, whatever the AI claimed", () => {
    const [kept] = checkRecipes([rice([])], stocked, none, []);
    expect(kept?.diets).toEqual(
      expect.arrayContaining(["vegetarian", "vegan", "halal", "kosher", "gluten-free", "dairy-free", "egg-free"]),
    );
    const [chicken] = checkRecipes([lemonChicken], stocked, none, []);
    expect(chicken?.diets).not.toContain("vegetarian");
  });

  it("keeps a recipe for a custom diet only when the AI confirmed it, in any spelling", () => {
    expect(checkRecipes([rice([])], stocked, lowFodmap, [])).toEqual([]);
    const [kept] = checkRecipes([rice(["Low-FODMAP"])], stocked, lowFodmap, []);
    expect(kept?.diets).toContain("low fodmap");
  });

  it("ignores custom diets the cook didn't ask for", () => {
    const [kept] = checkRecipes([rice(["keto", "made-up diet"])], stocked, none, []);
    expect(kept?.diets).not.toContain("keto");
    expect(kept?.diets).not.toContain("made-up diet");
  });

  it("rejects recipes containing a custom allergy, including by stand-in term", () => {
    const shroom = draft("Mushroom Rice", [["Cremini", ["cremini", "mushroom"]], ["Rice", ["rice"]]]);
    expect(checkRecipes([shroom], [...stocked, "Cremini"], { diets: [], allergies: ["mushrooms"] }, [])).toEqual([]);
  });
});
