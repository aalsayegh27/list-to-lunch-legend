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
  ],
  Protein: [
    "anchov", "bacon", "beef", "chicken", "chorizo", "clam", "cod", "duck", "fish",
    "ham", "lamb", "meat", "mince", "mussel", "pork", "prawn", "salami", "salmon",
    "sardine", "sausage", "scallop", "shrimp", "steak", "tofu", "tempeh", "tuna",
    "turkey", "veal", "liver", "mackerel", "seitan",
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
    "tortilla", "wrap", "bun",
  ],
  Pantry: [
    "almond butter", "bean", "broth", "canned", "chickpea", "chocolate", "coconut milk",
    "coffee", "honey", "hummus", "jam", "jar", "ketchup", "kimchi", "lentil",
    "mayonnaise", "mustard", "nut", "nutella", "oil", "passata", "peanut butter",
    "pesto", "pickle", "puree", "seed", "sesame", "soy sauce", "stock", "sugar",
    "sriracha", "tahini", "tinned", "tomato paste", "vinegar", "wine", "yeast",
    "syrup", "raisin", "date", "tea",
  ],
  Frozen: [
    "frozen", "ice cream", "ice-cream", "fish finger", "frozen pea", "sorbet",
  ],
  Herbs: [
    "basil", "bay leaf", "chive", "cilantro", "coriander", "dill", "herb", "mint",
    "oregano", "parsley", "rosemary", "sage", "tarragon", "thyme",
  ],
};

/** Best-guess category for a freely typed grocery item. */
export function guessCategory(rawName: string): PantryCategory {
  const name = rawName.trim().toLowerCase();
  if (!name) return "Other";

  let best: { category: PantryCategory; length: number } | null = null;

  for (const [category, words] of Object.entries(KEYWORDS) as [
    PantryCategory,
    string[],
  ][]) {
    for (const word of words) {
      if (!name.includes(word)) continue;
      // Longest keyword match wins, so "sweet potato" beats "potato"
      // and "almond butter" beats "butter".
      if (!best || word.length > best.length) {
        best = { category, length: word.length };
      }
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
