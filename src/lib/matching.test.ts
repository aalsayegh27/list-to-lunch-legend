import { describe, expect, it } from "vitest";

import { guessCategory } from "./categorize";
import { detectAllergens, fitsPreferences, type Preferences } from "./diet";
import { hasIngredient, ingredientKeys, meals, missingFor, type Meal } from "./kitchen-data";

describe("hasIngredient", () => {
  it.each([
    ["eggs", "Eggplant", false],
    ["eggs", "Free range eggs", true],
    ["eggs", "Egg noodles", false],
    ["rice", "Ice", false],
    ["rice", "Arborio rice", true],
    ["potatoes", "Sweet potatoes", false],
    ["cream", "Ice cream", false],
    ["cream", "Heavy cream", true],
    ["corn", "Cornflakes", false],
    ["chicken-thighs", "Chicken stock", false],
    ["chicken-thighs", "Chicken breast", true],
    ["olives", "Olive oil", false],
    ["stock", "Stock cubes", true],
    ["peppers", "Black pepper", false],
    ["peppers", "Baby bell peppers", true],
    ["yellow-onion", "Spring onion", false],
    ["jalapeno", "Jalapeño", true],
  ])("%s with %s → %s", (id, item, want) => {
    expect(hasIngredient(id, [item])).toBe(want);
  });
});

describe("missingFor (AI recipes)", () => {
  const meal: Meal = {
    id: "x", title: "T", meal: "Lunch", minutes: 10, blurb: "", steps: [],
    uses: ["Cherry tomatoes", "Feta"],
    ingredients: [
      { name: "Cherry tomatoes", match: ["cherry tomato", "tomato"] },
      { name: "Feta", match: ["feta"] },
    ],
  };
  it("lists what's missing by name", () => {
    expect(missingFor(meal, ["Cherry tomatoes"])).toEqual(["Feta"]);
  });
  it("accepts a stand-in match", () => {
    expect(missingFor(meal, ["Roma tomatoes", "Feta cheese"])).toEqual([]);
  });
});

describe("ingredientKeys", () => {
  it("uses the most specific match term for starters", () => {
    const shrimpRice = meals.find((m) => m.id === "shrimp-rice")!;
    expect(ingredientKeys(shrimpRice)).toContain("spring onion");
  });
});

describe("guessCategory", () => {
  it.each([
    ["Pepperoni", "Protein"],
    ["Cornflakes", "Grains"],
    ["Hamburger buns", "Grains"],
    ["Champagne", "Pantry"],
    ["Peas", "Produce"],
    ["Chicken stock", "Pantry"],
    ["Frozen berries", "Frozen"],
    ["Tinned tomatoes", "Pantry"],
    ["Oatmeal", "Grains"],
    ["Meatballs", "Protein"],
    ["Goat cheese", "Dairy & Eggs"],
    ["Bay leaves", "Herbs"],
  ])("%s → %s", (name, category) => {
    expect(guessCategory(name)).toBe(category);
  });
});

describe("allergens and diets", () => {
  const none: Preferences = { diet: null, allergies: [] };
  it.each([
    ["Peanut butter", ["peanuts"]],
    ["Butternut squash", []],
    ["Coconut milk", []],
    ["Egg noodles", ["eggs", "gluten"]],
    ["Eggplant", []],
    ["Soy sauce", ["gluten", "soy"]],
    ["Hummus", ["sesame"]],
    ["Rice noodles", []],
  ])("%s contains %j", (name, allergens) => {
    expect(detectAllergens([name])).toEqual(allergens);
  });

  it("vegetarian rules out chicken stock but not goat cheese", () => {
    const veg: Preferences = { diet: "vegetarian", allergies: [] };
    expect(fitsPreferences(["Chicken stock", "Rice"], veg)).toBe(false);
    expect(fitsPreferences(["Goat cheese", "Eggplant"], veg)).toBe(true);
  });
  it("pescatarian allows shrimp, not beef", () => {
    const pesc: Preferences = { diet: "pescatarian", allergies: [] };
    expect(fitsPreferences(["Shrimp"], pesc)).toBe(true);
    expect(fitsPreferences(["Ground beef"], pesc)).toBe(false);
  });
  it("vegan rules out eggs and honey, allows almond milk", () => {
    const vegan: Preferences = { diet: "vegan", allergies: [] };
    expect(fitsPreferences(["Eggs"], vegan)).toBe(false);
    expect(fitsPreferences(["Honey", "Oats"], vegan)).toBe(false);
    expect(fitsPreferences(["Almond milk", "Oats"], vegan)).toBe(true);
  });
  it("respects declared allergens even when names don't reveal them", () => {
    expect(fitsPreferences(["Mystery sauce"], { diet: null, allergies: ["nuts"] }, ["nuts"])).toBe(false);
    expect(fitsPreferences(["Mystery sauce"], none, ["nuts"])).toBe(true);
  });
});
