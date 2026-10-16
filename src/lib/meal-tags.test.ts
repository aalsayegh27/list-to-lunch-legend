import { describe, expect, it } from "vitest";

import { mealById, type Meal } from "./kitchen-data";
import { isNew, mainIngredient } from "./meal-tags";

function aiMeal(names: string[], extra: Partial<Meal> = {}): Meal {
  return {
    id: "x",
    title: "Test",
    meal: "Dinner",
    minutes: 30,
    blurb: "",
    uses: names,
    steps: [],
    ingredients: names.map((name) => ({ name, match: [name.toLowerCase()] })),
    source: "ai",
    ...extra,
  };
}

describe("mainIngredient", () => {
  it.each([
    ["shrimp-rice", "Seafood"],
    ["chicken-tray", "Chicken & turkey"],
    ["beef-stew", "Beef & lamb"],
    ["turkey-avocado", "Chicken & turkey"],
    ["shakshuka", "Eggs"],
    ["eggplant-bake", "Veggie"],
    ["cauliflower-soup", "Veggie"],
  ])("starter %s → %s", (id, expected) => {
    expect(mainIngredient(mealById.get(id)!)).toBe(expected);
  });

  it("goes by the first meat or seafood listed", () => {
    expect(mainIngredient(aiMeal(["Sausage", "Eggs", "Burger buns"]))).toBe("Pork");
    expect(mainIngredient(aiMeal(["Potatoes", "Tuna", "Eggs"]))).toBe("Seafood");
  });

  it("doesn't count stock, eggplant or egg noodles as the star", () => {
    expect(mainIngredient(aiMeal(["Potatoes", "Chicken stock", "Frozen peas"]))).toBe("Veggie");
    expect(mainIngredient(aiMeal(["Eggplant", "Chickpeas"]))).toBe("Veggie");
    expect(mainIngredient(aiMeal(["Egg noodles", "Broccoli"]))).toBe("Veggie");
  });
});

describe("isNew", () => {
  const now = Date.parse("2026-10-16T12:00:00Z");
  it("marks AI recipes from the last week", () => {
    expect(isNew(aiMeal([], { createdAt: "2026-10-14T09:00:00Z" }), now)).toBe(true);
    expect(isNew(aiMeal([], { createdAt: "2026-10-01T09:00:00Z" }), now)).toBe(false);
    expect(isNew(mealById.get("shrimp-rice")!, now)).toBe(false);
  });
});
