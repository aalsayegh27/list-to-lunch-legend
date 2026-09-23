import { findPhrase, toWords } from "./text-match";

export const PANTRY_CATEGORIES = [
  "Produce",
  "Protein",
  "Dairy & Eggs",
  "Grains",
  "Pantry",
  "Frozen",
  "Herbs",
  "Other",
] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

const KEYWORDS: Record<Exclude<PantryCategory, "Other">, string[]> = {
  Produce: [
    "apple", "avocado", "banana", "beet", "berry", "broccoli", "cabbage", "carrot",
    "cauliflower", "celery", "cherry tomato", "chilli", "chili", "corn", "courgette",
    "cucumber", "eggplant", "aubergine", "garlic", "ginger", "grape", "green bean",
    "jalapeno", "jalapeño", "kale", "leek", "lemon", "lettuce", "lime", "mango",
    "melon", "mushroom", "olive", "onion", "orange", "pear", "pepper", "potato",
    "pumpkin", "radish", "salad", "scallion", "shallot", "spinach", "spring onion",
    "sprout", "squash", "sweet potato", "tomato", "turnip", "zucchini", "fruit",
    "vegetable", "veg", "chard", "artichoke", "asparagus", "fennel", "peach", "plum",
    "pea", "cherry", "beetroot",
  ],
  Protein: [
    "anchovy", "bacon", "beef", "chicken", "chorizo", "clam", "cod", "duck", "fish",
    "ham", "lamb", "meat", "mince", "mussel", "pork", "prawn", "salami", "salmon",
    "sardine", "sausage", "scallop", "shrimp", "steak", "tofu", "tempeh", "tuna",
    "turkey", "veal", "liver", "mackerel", "seitan", "pepperoni", "goat", "meatball",
    "burger", "hot dog", "prosciutto",
  ],
  "Dairy & Eggs": [
    "butter", "buttermilk", "cheddar", "cheese", "cottage", "cream", "creme",
    "custard", "egg", "feta", "ghee", "halloumi", "kefir", "labneh", "mascarpone",
    "milk", "mozzarella", "parmesan", "ricotta", "sour cream", "yoghurt", "yogurt",
    "goat cheese", "brie",
  ],
  Grains: [
    "bagel", "baguette", "barley", "bread", "bulgur", "cereal", "couscous",
    "cracker", "flour", "granola", "lavash", "macaroni", "noodle", "oat", "orzo",
    "pasta", "pita", "polenta", "quinoa", "rice", "roll", "sourdough", "spaghetti",
    "tortilla", "wrap", "bun", "cornflake", "breadcrumb", "oatmeal", "porridge",
  ],
  Pantry: [
    "almond butter", "bean", "broth", "canned", "chickpea", "chocolate", "coconut milk",
    "coffee", "honey", "hummus", "jam", "jar", "ketchup", "kimchi", "lentil",
    "mayonnaise", "mustard", "nut", "nutella", "oil", "passata", "peanut butter",
    "pesto", "pickle", "puree", "seed", "sesame", "soy sauce", "stock", "sugar",
    "sriracha", "tahini", "tinned", "tomato paste", "vinegar", "wine", "yeast",
    "syrup", "raisin", "date", "tea", "champagne", "peanut", "spice", "paprika",
    "cumin", "cinnamon", "nutmeg", "flake", "almond", "cashew",
  ],
  Frozen: [
    "frozen", "ice cream", "ice-cream", "fish finger", "frozen pea", "sorbet",
  ],
  Herbs: [
    "basil", "bay leaf", "bay leaves", "chive", "cilantro", "coriander", "dill", "herb",
    "mint", "oregano", "parsley", "rosemary", "sage", "tarragon", "thyme",
  ],
};

const PHRASES = (Object.entries(KEYWORDS) as [PantryCategory, string[]][]).flatMap(
  ([category, keywords]) =>
    keywords.map((k) => ({ category, words: toWords(k), length: k.length })),
);

/** Best-guess category for a freely typed grocery item. */
export function guessCategory(rawName: string): PantryCategory {
  const words = toWords(rawName);
  if (words.length === 0) return "Other";

  // How it's stored beats what it is: frozen berries live in the freezer.
  if (words.some((w) => w === "frozen")) return "Frozen";
  if (words.some((w) => w === "canned" || w === "tinned")) return "Pantry";

  let best: { category: PantryCategory; end: number; length: number } | null = null;

  for (const { category, words: phrase, length } of PHRASES) {
    const end = findPhrase(words, phrase, { compound: true });
    if (end === -1) continue;
    // The last word usually names the item ("chicken stock" is stock), so the
    // match that ends latest wins. Among those the longest keyword wins, so
    // "sweet potato" beats "potato" and "almond butter" beats "butter".
    if (!best || end > best.end || (end === best.end && length > best.length)) {
      best = { category, end, length };
    }
  }

  return best?.category ?? "Other";
}

export function normalizeCategory(value: string | null | undefined): PantryCategory {
  const match = PANTRY_CATEGORIES.find(
    (c) => c.toLowerCase() === (value ?? "").trim().toLowerCase(),
  );
  return match ?? "Other";
}
