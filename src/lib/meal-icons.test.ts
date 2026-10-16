import { describe, expect, it } from "vitest";

import { mealById, meals, type Meal } from "./kitchen-data";
import { bannerIcons } from "./meal-icons";

function aiMeal(names: string[]): Meal {
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
  };
}

const icons = (meal: Meal) => bannerIcons(meal).map((i) => i.icon);

describe("bannerIcons", () => {
  it("leads with the star ingredient", () => {
    expect(icons(mealById.get("chicken-tray")!)).toEqual([
      "Drumstick",
      "Carrot",
      "LeafyGreen",
      "Citrus",
    ]);
    expect(icons(mealById.get("shrimp-rice")!)).toEqual(["Shrimp", "Wheat", "Citrus", "Sprout"]);
  });

  it("skips aromatics and stock, and shows each kind once", () => {
    expect(
      icons(aiMeal(["Garlic", "Chicken stock", "Potatoes", "Sweet potatoes", "Onion"])),
    ).toEqual(["Carrot"]);
  });

  it("knows peanut butter isn't dairy and egg noodles aren't eggs", () => {
    expect(icons(aiMeal(["Peanut butter", "Egg noodles"]))).toEqual(["Bean", "Wheat"]);
  });

  it("gives every starter recipe between one and five icons", () => {
    for (const meal of meals) {
      const n = bannerIcons(meal).length;
      expect(n, meal.id).toBeGreaterThan(0);
      expect(n, meal.id).toBeLessThanOrEqual(5);
    }
  });

  it("always shows something, even for unusual ingredients", () => {
    expect(icons(aiMeal(["Kimchi", "Stock"]))).toEqual(["LeafyGreen"]);
  });
});
