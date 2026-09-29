import { findPhrase, toWords } from "./text-match";

export const DIETS = ["vegetarian", "vegan", "pescatarian"] as const;
export type Diet = (typeof DIETS)[number];

export const ALLERGENS = [
  "nuts",
  "peanuts",
  "shellfish",
  "fish",
  "dairy",
  "eggs",
  "gluten",
  "soy",
  "sesame",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export type Preferences = { diet: Diet | null; allergies: Allergen[] };

export const NO_PREFERENCES: Preferences = { diet: null, allergies: [] };

export const DIET_LABELS: Record<Diet, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  nuts: "Tree nuts",
  peanuts: "Peanuts",
  shellfish: "Shellfish",
  fish: "Fish",
  dairy: "Dairy",
  eggs: "Eggs",
  gluten: "Gluten",
  soy: "Soy",
  sesame: "Sesame",
};

/** Ingredient words that signal each allergen, plus phrases that look like it but aren't. */
const ALLERGEN_WORDS: Record<Allergen, { words: string[]; except?: string[] }> = {
  nuts: {
    words: ["nut", "almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia", "pine nut"],
  },
  peanuts: { words: ["peanut"] },
  shellfish: {
    words: ["shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop", "crayfish", "langoustine"],
  },
  fish: {
    words: ["fish", "tuna", "salmon", "cod", "sardine", "anchovy", "mackerel", "trout", "haddock", "tilapia", "halibut", "sea bass"],
  },
  dairy: {
    words: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "kefir", "ghee", "feta", "parmesan", "mozzarella", "ricotta", "halloumi", "mascarpone", "creme fraiche", "labneh", "paneer", "cheddar"],
    except: ["peanut butter", "almond butter", "nut butter", "coconut milk", "coconut cream", "oat milk", "almond milk", "soy milk", "rice milk", "cream of tartar"],
  },
  eggs: { words: ["egg", "mayonnaise"] },
  gluten: {
    words: ["bread", "pasta", "flour", "wheat", "couscous", "bulgur", "barley", "noodle", "cracker", "spaghetti", "baguette", "sourdough", "pita", "bun", "bagel", "orzo", "tortilla", "soy sauce", "breadcrumb", "farro", "semolina"],
    except: ["rice noodle", "corn tortilla", "rice flour", "gluten free"],
  },
  soy: { words: ["soy", "tofu", "tempeh", "edamame", "miso"] },
  sesame: { words: ["sesame", "tahini", "hummus"] },
};

const MEAT_WORDS = [
  "beef", "chicken", "pork", "lamb", "turkey", "bacon", "ham", "sausage", "chorizo", "salami",
  "pepperoni", "prosciutto", "veal", "duck", "mince", "steak", "meatball", "burger", "hot dog",
  "liver", "venison", "pancetta", "gelatin",
];
const MEAT_EXCEPT = ["goat cheese", "vegetable stock"];
const VEGAN_EXTRA = ["honey"];

function mentions(text: string, words: string[], except: string[] = []): boolean {
  const all = toWords(text);
  // Blank out look-alike phrases ("peanut butter") before checking.
  const cleaned = [...all];
  for (const phrase of except.map(toWords)) {
    for (let at = findPhrase(cleaned, phrase); at !== -1; at = findPhrase(cleaned, phrase)) {
      for (let i = at - phrase.length + 1; i <= at; i++) cleaned[i] = "";
    }
  }
  return words.some((w) => findPhrase(cleaned, toWords(w)) !== -1);
}

/** Allergens present in a list of ingredient names. */
export function detectAllergens(ingredientNames: string[]): Allergen[] {
  const text = ingredientNames.join(" | ");
  return ALLERGENS.filter((a) => mentions(text, ALLERGEN_WORDS[a].words, ALLERGEN_WORDS[a].except));
}

/** True when the ingredients suit the cook's diet and avoid their allergies. */
export function fitsPreferences(
  ingredientNames: string[],
  prefs: Preferences,
  declaredAllergens: readonly string[] = [],
): boolean {
  const allergens = new Set<string>([...declaredAllergens, ...detectAllergens(ingredientNames)]);
  if (prefs.allergies.some((a) => allergens.has(a))) return false;

  if (!prefs.diet) return true;
  const text = ingredientNames.join(" | ");
  const hasMeat = mentions(text, MEAT_WORDS, MEAT_EXCEPT);
  const hasSeafood = allergens.has("fish") || allergens.has("shellfish");
  if (prefs.diet === "pescatarian") return !hasMeat;
  if (hasMeat || hasSeafood) return false;
  if (prefs.diet === "vegan") {
    return !allergens.has("dairy") && !allergens.has("eggs") && !mentions(text, VEGAN_EXTRA);
  }
  return true;
}

export function normalizePreferences(raw: {
  diet?: string | null;
  allergies?: readonly string[] | null;
}): Preferences {
  const diet = DIETS.find((d) => d === raw.diet) ?? null;
  const allergies = ALLERGENS.filter((a) => raw.allergies?.includes(a));
  return { diet, allergies };
}
