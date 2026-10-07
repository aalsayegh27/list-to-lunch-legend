import { findPhrase, toWords } from "./text-match";

/**
 * A cook's dietary needs. Each entry is a label: a built-in key ("halal",
 * "gluten-free", "peanuts") or a custom one the cook typed ("low fodmap",
 * "mushrooms"), normalised by normalizeLabel.
 */
export type Preferences = { diets: string[]; allergies: string[] };

export const NO_PREFERENCES: Preferences = { diets: [], allergies: [] };

export type CatalogEntry = { key: string; label: string; aliases?: string[] };

/** Diets Mise checks itself, from each recipe's ingredients. */
export const CHECKED_DIETS = [
  "vegetarian", "vegan", "pescatarian", "halal", "kosher", "gluten-free", "dairy-free", "egg-free",
] as const;

/**
 * Diets offered in search. Ones not in CHECKED_DIETS (and any custom diet) are
 * strict: only recipes the AI made and confirmed for that diet are shown.
 */
export const DIET_CATALOG: CatalogEntry[] = [
  { key: "vegetarian", label: "Vegetarian", aliases: ["veggie"] },
  { key: "vegan", label: "Vegan", aliases: ["plant based", "plant-based"] },
  { key: "pescatarian", label: "Pescatarian", aliases: ["pescetarian"] },
  { key: "halal", label: "Halal" },
  { key: "kosher", label: "Kosher" },
  { key: "gluten-free", label: "Gluten-free", aliases: ["gluten free", "coeliac", "celiac", "no gluten"] },
  { key: "dairy-free", label: "Dairy-free", aliases: ["dairy free", "lactose free", "lactose-free", "no dairy"] },
  { key: "egg-free", label: "Egg-free", aliases: ["egg free", "no eggs", "no egg"] },
  { key: "keto", label: "Keto", aliases: ["ketogenic"] },
  { key: "low-carb", label: "Low-carb", aliases: ["low carb"] },
  { key: "paleo", label: "Paleo" },
  { key: "low fodmap", label: "Low FODMAP", aliases: ["fodmap", "low-fodmap"] },
  { key: "mediterranean", label: "Mediterranean" },
  { key: "diabetic-friendly", label: "Diabetic-friendly", aliases: ["diabetic", "low sugar", "low-sugar"] },
  { key: "jain", label: "Jain" },
];

/** Allergies Mise checks from ingredient names (custom ones are matched word for word). */
export const KNOWN_ALLERGENS = [
  "nuts", "peanuts", "shellfish", "fish", "dairy", "eggs", "gluten", "soy", "sesame",
  "mustard", "celery", "mushrooms", "nightshades", "corn", "coconut", "kiwi", "garlic", "onion",
  "lupin", "sulphites",
] as const;

export const ALLERGEN_CATALOG: CatalogEntry[] = [
  { key: "nuts", label: "Tree nuts", aliases: ["nuts", "tree nut", "almonds", "walnuts", "cashews"] },
  { key: "peanuts", label: "Peanuts", aliases: ["peanut", "groundnuts"] },
  { key: "shellfish", label: "Shellfish", aliases: ["shrimp", "prawns", "crab", "lobster", "crustaceans"] },
  { key: "fish", label: "Fish" },
  { key: "dairy", label: "Dairy", aliases: ["milk", "lactose"] },
  { key: "eggs", label: "Eggs", aliases: ["egg"] },
  { key: "gluten", label: "Gluten", aliases: ["wheat", "coeliac", "celiac"] },
  { key: "soy", label: "Soy", aliases: ["soya", "soybeans"] },
  { key: "sesame", label: "Sesame" },
  { key: "mustard", label: "Mustard" },
  { key: "celery", label: "Celery", aliases: ["celeriac"] },
  { key: "mushrooms", label: "Mushrooms", aliases: ["mushroom"] },
  { key: "nightshades", label: "Nightshades" },
  { key: "corn", label: "Corn", aliases: ["maize"] },
  { key: "coconut", label: "Coconut" },
  { key: "kiwi", label: "Kiwi" },
  { key: "garlic", label: "Garlic" },
  { key: "onion", label: "Onion", aliases: ["onions"] },
  { key: "lupin", label: "Lupin" },
  { key: "sulphites", label: "Sulphites", aliases: ["sulfites", "sulphite", "sulfite"] },
];

/** Ingredient words that signal each allergen, plus phrases that look like it but aren't. */
const ALLERGEN_WORDS: Record<(typeof KNOWN_ALLERGENS)[number], { words: string[]; except?: string[] }> = {
  nuts: {
    words: ["nut", "almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia", "pine nut", "praline", "marzipan"],
  },
  peanuts: { words: ["peanut", "satay", "groundnut"] },
  shellfish: {
    words: ["shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop", "crayfish", "langoustine"],
    except: ["oyster mushroom"],
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
  mustard: { words: ["mustard"] },
  celery: { words: ["celery", "celeriac"] },
  mushrooms: { words: ["mushroom", "shiitake", "portobello", "cremini", "chanterelle", "porcini", "oyster mushroom"] },
  nightshades: {
    words: ["tomato", "potato", "pepper", "eggplant", "aubergine", "chilli", "chili", "jalapeno", "paprika", "cayenne", "tomatillo"],
    except: ["sweet potato", "black pepper", "white pepper", "peppercorn"],
  },
  corn: { words: ["corn", "sweetcorn", "polenta", "cornmeal", "cornflour", "cornstarch"] },
  coconut: { words: ["coconut"] },
  kiwi: { words: ["kiwi"] },
  garlic: { words: ["garlic"] },
  onion: { words: ["onion", "shallot", "scallion"] },
  lupin: { words: ["lupin", "lupini"] },
  sulphites: { words: ["wine", "sulphite", "sulfite", "dried apricot", "raisin"] },
};

const MEAT_WORDS = [
  "beef", "chicken", "pork", "lamb", "turkey", "bacon", "ham", "sausage", "chorizo", "salami",
  "pepperoni", "prosciutto", "veal", "duck", "mince", "steak", "meatball", "burger", "hot dog",
  "liver", "venison", "pancetta", "gelatin", "goat",
];
const MEAT_EXCEPT = ["goat cheese", "goat milk", "vegetable stock"];

/** Pork and pork-based products; meat that's often pork counts unless its meat is named. */
const PORK_WORDS = [
  "pork", "ham", "bacon", "prosciutto", "pancetta", "guanciale", "pepperoni", "salami", "chorizo",
  "lard", "gelatin", "sausage", "hot dog",
];
const PORK_EXCEPT = [
  "beef sausage", "chicken sausage", "turkey sausage", "lamb sausage", "beef pepperoni",
  "turkey pepperoni", "beef salami", "turkey bacon", "beef bacon", "beef hot dog", "chicken chorizo",
];

const ALCOHOL_WORDS = [
  "wine", "beer", "rum", "brandy", "vodka", "whisky", "whiskey", "gin", "sake", "mirin", "sherry",
  "cider", "liqueur", "bourbon", "tequila", "champagne", "prosecco", "marsala", "vermouth",
];
const ALCOHOL_EXCEPT = [
  "wine vinegar", "red wine vinegar", "white wine vinegar", "rice wine vinegar", "cider vinegar",
  "apple cider vinegar", "ginger beer", "root beer",
];

/** Lowercase, plain-text form a label is stored in; matches the database check. */
function cleanLabel(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 &'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^a-z0-9]+/, "")
    .slice(0, 40)
    .trim();
}

/** The catalog key a typed label refers to, or the cleaned custom label (null if empty). */
export function normalizeLabel(text: string, catalog: CatalogEntry[]): string | null {
  const clean = cleanLabel(text);
  if (!clean) return null;
  const hit = catalog.find((e) =>
    [e.key, e.label, ...(e.aliases ?? [])].some((a) => cleanLabel(a) === clean),
  );
  return hit?.key ?? clean;
}

/** How a label is shown: the catalog's name, or the custom text with a capital. */
export function labelFor(key: string, catalog: CatalogEntry[]): string {
  return catalog.find((e) => e.key === key)?.label ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Catalog entries matching a search, best first: name starts with it, then contains it. */
export function searchCatalog(query: string, catalog: CatalogEntry[]): CatalogEntry[] {
  const q = cleanLabel(query);
  if (!q) return catalog;
  const names = (e: CatalogEntry) => [e.label, ...(e.aliases ?? [])].map(cleanLabel);
  const starts = catalog.filter((e) => names(e).some((n) => n.startsWith(q)));
  const contains = catalog.filter((e) => !starts.includes(e) && names(e).some((n) => n.includes(q)));
  return [...starts, ...contains];
}

export function isCheckedDiet(key: string): boolean {
  return (CHECKED_DIETS as readonly string[]).includes(key);
}

function isKnownAllergen(key: string): key is (typeof KNOWN_ALLERGENS)[number] {
  return (KNOWN_ALLERGENS as readonly string[]).includes(key);
}

/** True when any one ingredient mentions one of `words` (look-alikes in `except` don't count). */
function mentions(ingredients: string[], words: string[], except: string[] = []): boolean {
  const exceptions = except.map(toWords);
  const targets = words.map(toWords);
  return ingredients.some((ingredient) => {
    const cleaned = toWords(ingredient);
    for (const phrase of exceptions) {
      for (let at = findPhrase(cleaned, phrase); at !== -1; at = findPhrase(cleaned, phrase)) {
        for (let i = at - phrase.length + 1; i <= at; i++) cleaned[i] = "";
      }
    }
    return targets.some((t) => findPhrase(cleaned, t) !== -1);
  });
}

/** A custom allergy's word forms, so "mushrooms" also matches "mushroom". */
function customForms(label: string): string[] {
  const forms = new Set([label]);
  if (label.endsWith("ies")) forms.add(`${label.slice(0, -3)}y`);
  if (label.endsWith("es")) forms.add(label.slice(0, -2));
  if (label.endsWith("s")) forms.add(label.slice(0, -1));
  return [...forms].filter(Boolean);
}

/** Known allergens present in a list of ingredient names. */
export function detectAllergens(ingredientNames: string[]): string[] {
  return KNOWN_ALLERGENS.filter((a) =>
    mentions(ingredientNames, ALLERGEN_WORDS[a].words, ALLERGEN_WORDS[a].except),
  );
}

function fitsCheckedDiet(diet: string, names: string[], allergens: Set<string>): boolean {
  const meat = () => mentions(names, MEAT_WORDS, MEAT_EXCEPT);
  const seafood = allergens.has("fish") || allergens.has("shellfish");
  const pork = () => mentions(names, PORK_WORDS, PORK_EXCEPT);
  switch (diet) {
    case "vegetarian":
      return !meat() && !seafood;
    case "vegan":
      return !meat() && !seafood && !allergens.has("dairy") && !allergens.has("eggs") && !mentions(names, ["honey"]);
    case "pescatarian":
      return !meat();
    case "halal":
      return !pork() && !mentions(names, ALCOHOL_WORDS, ALCOHOL_EXCEPT);
    case "kosher":
      return !pork() && !allergens.has("shellfish") && !(meat() && allergens.has("dairy"));
    case "gluten-free":
      return !allergens.has("gluten");
    case "dairy-free":
      return !allergens.has("dairy");
    case "egg-free":
      return !allergens.has("eggs");
    default:
      return false;
  }
}

/** What's known about a recipe, for checking it against a cook's needs. */
export type RecipeFacts = {
  /** Ingredient names, for the built-in rules. */
  names: string[];
  /** Names plus each ingredient's stand-in terms, for custom allergies. */
  terms?: string[];
  /** Allergens the recipe declares. */
  allergens?: readonly string[];
  /** Diets the recipe is tagged with (how strict diets are confirmed). */
  diets?: readonly string[];
};

/** True when a recipe suits every one of the cook's diets and avoids all their allergies. */
export function fitsPreferences(recipe: RecipeFacts, prefs: Preferences): boolean {
  const allergens = new Set<string>([...(recipe.allergens ?? []), ...detectAllergens(recipe.names)]);
  const terms = recipe.terms ?? recipe.names;

  for (const allergy of prefs.allergies) {
    if (isKnownAllergen(allergy) ? allergens.has(allergy) : mentions(terms, customForms(allergy))) {
      return false;
    }
  }
  for (const diet of prefs.diets) {
    const fits = isCheckedDiet(diet)
      ? fitsCheckedDiet(diet, recipe.names, allergens)
      : (recipe.diets ?? []).includes(diet);
    if (!fits) return false;
  }
  return true;
}

/** The built-in diets a recipe passes, from its ingredient names alone. */
export function checkedDietsFor(names: string[], declaredAllergens: readonly string[] = []): string[] {
  const allergens = new Set<string>([...declaredAllergens, ...detectAllergens(names)]);
  return CHECKED_DIETS.filter((d) => fitsCheckedDiet(d, names, allergens));
}

export const MAX_DIETS = 10;
export const MAX_ALLERGIES = 20;

function normalizeList(values: readonly string[] | null | undefined, catalog: CatalogEntry[], max: number) {
  const out: string[] = [];
  for (const v of values ?? []) {
    const key = typeof v === "string" ? normalizeLabel(v, catalog) : null;
    if (key && !out.includes(key)) out.push(key);
  }
  return out.slice(0, max);
}

export function normalizePreferences(raw: {
  diets?: readonly string[] | null;
  /** The single diet stored before cooks could pick several. */
  diet?: string | null;
  allergies?: readonly string[] | null;
}): Preferences {
  const diets = raw.diets?.length ? raw.diets : raw.diet ? [raw.diet] : [];
  return {
    diets: normalizeList(diets, DIET_CATALOG, MAX_DIETS),
    allergies: normalizeList(raw.allergies, ALLERGEN_CATALOG, MAX_ALLERGIES),
  };
}
