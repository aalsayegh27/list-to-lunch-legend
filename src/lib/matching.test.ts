import { describe, expect, it } from "vitest";

import { guessCategory } from "./categorize";
import { commonStaples } from "./starter-pantry";
import {
  ALLERGEN_CATALOG,
  DIET_CATALOG,
  detectAllergens,
  fitsPreferences,
  normalizeLabel,
  normalizePreferences,
  searchCatalog,
  type Preferences,
} from "./diet";
import {
  hasIngredient,
  ingredientKeys,
  meals,
  missingFor,
  recipeFacts,
  type Meal,
} from "./kitchen-data";

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

  it("files every setup-screen staple under the heading it's shown in", () => {
    const misfiled = commonStaples.flatMap(({ category, items }) =>
      items.filter((name) => guessCategory(name) !== category).map((name) => `${name} → ${guessCategory(name)}`),
    );
    expect(misfiled).toEqual([]);
  });
});


describe("allergens", () => {
  it.each([
    ["Peanut butter", ["peanuts"]],
    ["Satay sauce", ["peanuts"]],
    ["Butternut squash", []],
    ["Coconut milk", ["coconut"]],
    ["Egg noodles", ["eggs", "gluten"]],
    ["Eggplant", ["nightshades"]],
    ["Soy sauce", ["gluten", "soy"]],
    ["Hummus", ["sesame"]],
    ["Rice noodles", []],
    ["Sweet potatoes", []],
    ["Oyster mushrooms", ["mushrooms"]],
    ["Dijon mustard", ["mustard"]],
  ])("%s contains %j", (name, allergens) => {
    expect(detectAllergens([name])).toEqual(allergens);
  });
});

describe("fitsPreferences", () => {
  const fits = (names: string[], prefs: Partial<Preferences>, extra: { terms?: string[]; allergens?: string[]; diets?: string[] } = {}) =>
    fitsPreferences({ names, ...extra }, { diets: [], allergies: [], ...prefs });

  it("vegetarian rules out chicken stock but not goat cheese", () => {
    expect(fits(["Chicken stock", "Rice"], { diets: ["vegetarian"] })).toBe(false);
    expect(fits(["Goat cheese", "Eggplant"], { diets: ["vegetarian"] })).toBe(true);
  });
  it("pescatarian allows shrimp, not beef", () => {
    expect(fits(["Shrimp"], { diets: ["pescatarian"] })).toBe(true);
    expect(fits(["Ground beef"], { diets: ["pescatarian"] })).toBe(false);
  });
  it("vegan rules out eggs and honey, allows almond milk", () => {
    expect(fits(["Eggs"], { diets: ["vegan"] })).toBe(false);
    expect(fits(["Honey", "Oats"], { diets: ["vegan"] })).toBe(false);
    expect(fits(["Almond milk", "Oats"], { diets: ["vegan"] })).toBe(true);
  });
  it("halal rules out pork and alcohol, not wine vinegar or chicken sausage", () => {
    expect(fits(["Bacon", "Eggs"], { diets: ["halal"] })).toBe(false);
    expect(fits(["Chicken thighs", "White wine"], { diets: ["halal"] })).toBe(false);
    expect(fits(["Chicken thighs", "Red wine vinegar"], { diets: ["halal"] })).toBe(true);
    expect(fits(["Chicken sausage", "Peppers"], { diets: ["halal"] })).toBe(true);
    expect(fits(["Sausage", "Peppers"], { diets: ["halal"] })).toBe(false);
  });
  it("kosher rules out pork, shellfish, and meat with dairy", () => {
    expect(fits(["Ham"], { diets: ["kosher"] })).toBe(false);
    expect(fits(["Shrimp"], { diets: ["kosher"] })).toBe(false);
    expect(fits(["Ground beef", "Cheddar"], { diets: ["kosher"] })).toBe(false);
    expect(fits(["Ground beef", "Onion"], { diets: ["kosher"] })).toBe(true);
    expect(fits(["Salmon", "Cream cheese"], { diets: ["kosher"] })).toBe(true);
  });
  it("gluten-free, dairy-free and egg-free follow their allergens", () => {
    expect(fits(["Pasta"], { diets: ["gluten-free"] })).toBe(false);
    expect(fits(["Rice noodles"], { diets: ["gluten-free"] })).toBe(true);
    expect(fits(["Feta"], { diets: ["dairy-free"] })).toBe(false);
    expect(fits(["Mayonnaise"], { diets: ["egg-free"] })).toBe(false);
  });
  it("needs every diet at once", () => {
    expect(fits(["Chicken thighs", "Rice"], { diets: ["halal", "gluten-free"] })).toBe(true);
    expect(fits(["Chicken thighs", "Pasta"], { diets: ["halal", "gluten-free"] })).toBe(false);
  });
  it("only shows recipes confirmed for a custom diet", () => {
    expect(fits(["Rice", "Spinach"], { diets: ["low fodmap"] })).toBe(false);
    expect(fits(["Rice", "Spinach"], { diets: ["low fodmap"] }, { diets: ["low fodmap"] })).toBe(true);
  });
  it("respects declared allergens even when names don't reveal them", () => {
    expect(fits(["Mystery sauce"], { allergies: ["nuts"] }, { allergens: ["nuts"] })).toBe(false);
    expect(fits(["Mystery sauce"], {}, { allergens: ["nuts"] })).toBe(true);
  });
  it("matches custom allergies by word, singular or plural, including stand-in terms", () => {
    expect(fits(["Button mushrooms"], { allergies: ["mushroom"] })).toBe(false);
    expect(fits(["Kiwis"], { allergies: ["kiwis"] })).toBe(false);
    expect(fits(["Pine nuts"], { allergies: ["pine nuts"] })).toBe(false);
    expect(fits(["Cremini"], { allergies: ["portobello"] }, { terms: ["Cremini", "portobello"] })).toBe(false);
    expect(fits(["Mustard greens"], { allergies: ["kale"] })).toBe(true);
  });
  it("works on starter recipes through recipeFacts", () => {
    const shrimpRice = meals.find((m) => m.id === "shrimp-rice")!;
    expect(fitsPreferences(recipeFacts(shrimpRice), { diets: [], allergies: ["shellfish"] })).toBe(false);
    expect(fitsPreferences(recipeFacts(shrimpRice), { diets: ["low fodmap"], allergies: [] })).toBe(false);
    expect(fitsPreferences(recipeFacts(shrimpRice), { diets: ["halal"], allergies: [] })).toBe(true);
  });
});

describe("labels and search", () => {
  it("maps what people type onto built-in entries", () => {
    expect(normalizeLabel("Coeliac", DIET_CATALOG)).toBe("gluten-free");
    expect(normalizeLabel("  gluten FREE ", DIET_CATALOG)).toBe("gluten-free");
    expect(normalizeLabel("Tree nut", ALLERGEN_CATALOG)).toBe("nuts");
    expect(normalizeLabel("sulfites", ALLERGEN_CATALOG)).toBe("sulphites");
  });
  it("keeps custom entries in a safe stored form", () => {
    expect(normalizeLabel("Low-FODMAP", DIET_CATALOG)).toBe("low fodmap");
    expect(normalizeLabel("Crème Fraîche!!", ALLERGEN_CATALOG)).toBe("creme fraiche");
    expect(normalizeLabel("   ", ALLERGEN_CATALOG)).toBeNull();
    expect(normalizeLabel("x".repeat(80), ALLERGEN_CATALOG)).toHaveLength(40);
  });
  it("searches by name start, then anywhere", () => {
    expect(searchCatalog("ha", DIET_CATALOG).map((e) => e.key)[0]).toBe("halal");
    expect(searchCatalog("free", DIET_CATALOG).map((e) => e.key)).toEqual(
      expect.arrayContaining(["gluten-free", "dairy-free", "egg-free"]),
    );
    expect(searchCatalog("", ALLERGEN_CATALOG)).toHaveLength(ALLERGEN_CATALOG.length);
  });
  it("cleans saved preferences and reads the old single-diet field", () => {
    expect(normalizePreferences({ diet: "vegan", allergies: ["Peanut", "MUSHROOMS", "peanuts"] })).toEqual({
      diets: ["vegan"],
      allergies: ["peanuts", "mushrooms"],
    });
    expect(normalizePreferences({ diets: ["Halal", "keto", "halal"], allergies: [] }).diets).toEqual(["halal", "keto"]);
  });
});
