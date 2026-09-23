import { findPhrase, sameWord, toWords } from "./text-match";

export type Ingredient = {
  id: string;
  /** Label shown to the cook. */
  name: string;
  /** Words or phrases that count as "I have this" when they appear in an item's name. */
  match: string[];
};

export const ingredients: Ingredient[] = [
  { id: "shrimp", name: "Shrimp", match: ["shrimp", "prawn"] },
  { id: "rice", name: "Rice", match: ["rice"] },
  { id: "garlic", name: "Garlic", match: ["garlic"] },
  { id: "lemons", name: "Lemon", match: ["lemon"] },
  { id: "scallion", name: "Spring onion", match: ["spring onion", "scallion", "green onion"] },
  { id: "coriander", name: "Coriander", match: ["coriander", "cilantro"] },
  { id: "chickpeas", name: "Chickpeas", match: ["chickpea", "garbanzo"] },
  { id: "hummus", name: "Hummus", match: ["hummus"] },
  { id: "cucumber", name: "Cucumber", match: ["cucumber"] },
  { id: "cherry-tomatoes", name: "Cherry tomatoes", match: ["cherry tomato", "tomato"] },
  { id: "olives", name: "Olives", match: ["olive"] },
  { id: "dill", name: "Dill", match: ["dill"] },
  { id: "chicken-thighs", name: "Chicken thighs", match: ["chicken thigh", "chicken"] },
  { id: "sweet-potato", name: "Sweet potatoes", match: ["sweet potato"] },
  { id: "carrots", name: "Carrots", match: ["carrot"] },
  { id: "leek", name: "Leek", match: ["leek"] },
  { id: "ground-beef", name: "Ground beef", match: ["ground beef", "beef mince", "minced beef"] },
  { id: "zucchini", name: "Zucchini", match: ["zucchini", "courgette"] },
  { id: "yellow-onion", name: "Onion", match: ["yellow onion", "onion"] },
  { id: "red-onion", name: "Red onion", match: ["red onion", "onion"] },
  { id: "kimchi", name: "Kimchi", match: ["kimchi"] },
  { id: "eggs", name: "Eggs", match: ["egg"] },
  { id: "ginger", name: "Ginger", match: ["ginger"] },
  { id: "beef-chunks", name: "Stewing beef", match: ["beef chunk", "stewing beef", "beef"] },
  { id: "stock", name: "Stock", match: ["stock", "broth", "bouillon"] },
  { id: "celery", name: "Celery", match: ["celery"] },
  { id: "potatoes", name: "Potatoes", match: ["potato"] },
  { id: "tuna", name: "Tuna", match: ["tuna", "sardine"] },
  { id: "corn", name: "Corn", match: ["corn", "sweetcorn"] },
  { id: "lettuce", name: "Lettuce", match: ["lettuce", "salad leaves"] },
  { id: "avocado", name: "Avocado", match: ["avocado"] },
  { id: "eggplant", name: "Eggplant", match: ["eggplant", "aubergine"] },
  { id: "mint", name: "Mint", match: ["mint"] },
  { id: "goat-cheese", name: "Goat cheese", match: ["goat cheese", "feta"] },
  { id: "cauliflower", name: "Cauliflower", match: ["cauliflower"] },
  { id: "cream", name: "Cream", match: ["cream", "creme fraiche"] },
  { id: "bread", name: "Bread", match: ["bread", "sourdough", "baguette", "toast"] },
  { id: "turkey", name: "Turkey slices", match: ["turkey"] },
  { id: "squash", name: "Butternut squash", match: ["squash", "pumpkin"] },
  { id: "peppers", name: "Bell peppers", match: ["bell pepper", "pepper"] },
  { id: "jalapeno", name: "Jalapeño", match: ["jalapeno", "jalapeño", "chilli", "chili"] },
];

const ingredientById = new Map(ingredients.map((i) => [i.id, i]));

export const itemName = (id: string) => ingredientById.get(id)?.name ?? id;

/**
 * Words that turn an ingredient into a different product when they follow it:
 * "chicken stock" isn't chicken, "olive oil" isn't olives, "egg noodles" aren't eggs.
 */
const PRODUCT_WORDS = [
  "stock", "broth", "bouillon", "powder", "paste", "sauce", "flake", "chip",
  "noodle", "starch", "flour", "soup", "seasoning", "extract", "oil", "vinegar",
  "milk", "cake", "cracker", "tortilla", "paper", "salt", "puree", "ketchup",
  "tea", "biscuit", "cookie", "bar", "candy", "jam",
];

/** Items that contain an ingredient's name but aren't a stand-in for it. */
const NOT_A_MATCH: Record<string, string[]> = {
  cream: ["ice cream", "cream cheese"],
  potatoes: ["sweet potato"],
  peppers: ["black pepper", "white pepper", "cayenne pepper"],
  "yellow-onion": ["spring onion", "green onion"],
  "red-onion": ["spring onion", "green onion"],
};

/** True when any of the cook's in-stock item names satisfies this ingredient. */
export function hasIngredient(id: string, stockedNames: string[]): boolean {
  const ingredient = ingredientById.get(id);
  if (!ingredient) return false;
  const exclusions = (NOT_A_MATCH[id] ?? []).map(toWords);

  return stockedNames.some((raw) => {
    const words = toWords(raw);
    if (exclusions.some((x) => findPhrase(words, x) !== -1)) return false;
    return ingredient.match.some((m) => {
      const end = findPhrase(words, toWords(m));
      if (end === -1) return false;
      const next = words[end + 1];
      return !next || !PRODUCT_WORDS.some((p) => sameWord(next, p));
    });
  });
}

export type Meal = {
  id: string;
  title: string;
  meal: "Lunch" | "Dinner";
  minutes: number;
  blurb: string;
  uses: string[];
  steps: string[];
};

export const meals: Meal[] = [
  {
    id: "shrimp-rice",
    title: "Garlic Shrimp & Lemon Rice",
    meal: "Dinner",
    minutes: 25,
    blurb: "Shrimp, arborio rice, garlic, lemon, scallion, coriander.",
    uses: ["shrimp", "rice", "garlic", "lemons", "scallion", "coriander"],
    steps: [
      "Simmer the rice in stock until tender, 18 minutes.",
      "Sear shrimp in hot oil with sliced garlic, 2 minutes a side.",
      "Squeeze lemon over the pan, scrape everything onto the rice.",
      "Finish with scallion, coriander and cracked pepper.",
    ],
  },
  {
    id: "chickpea-hummus",
    title: "Crispy Chickpea & Hummus Plate",
    meal: "Lunch",
    minutes: 15,
    blurb: "Chickpeas, hummus, cucumber, cherry tomatoes, olives, dill.",
    uses: ["chickpeas", "hummus", "cucumber", "cherry-tomatoes", "olives", "dill", "lemons"],
    steps: [
      "Dry the chickpeas, fry in oil with paprika and cumin until crisp.",
      "Spread hummus across a plate, swirl a well in the middle.",
      "Toss cucumber, tomatoes and olives with lemon and oil.",
      "Pile everything on, scatter dill.",
    ],
  },
  {
    id: "chicken-tray",
    title: "Chicken Thigh & Root Veg Tray",
    meal: "Dinner",
    minutes: 45,
    blurb: "Chicken thighs, sweet potatoes, carrots, leek, lemon, garlic.",
    uses: ["chicken-thighs", "sweet-potato", "carrots", "leek", "lemons", "garlic"],
    steps: [
      "Heat oven to 220°C. Cube the sweet potato and carrots.",
      "Toss veg with oil, salt and whole garlic cloves on a tray.",
      "Nestle in the thighs skin-side up, season hard.",
      "Roast 35–40 minutes, squeeze lemon over before serving.",
    ],
  },
  {
    id: "beef-zucchini",
    title: "Ground Beef & Zucchini Skillet",
    meal: "Dinner",
    minutes: 20,
    blurb: "Ground beef, zucchini, onion, garlic, cherry tomatoes.",
    uses: ["ground-beef", "zucchini", "yellow-onion", "garlic", "cherry-tomatoes"],
    steps: [
      "Brown the beef hard in a dry pan, break it up, set aside.",
      "Soften onion and garlic, add diced zucchini for 5 minutes.",
      "Return beef with halved tomatoes and cumin, simmer 5 minutes.",
      "Serve as is, or spoon over rice.",
    ],
  },
  {
    id: "egg-kimchi-rice",
    title: "Kimchi Fried Rice, Fried Egg",
    meal: "Lunch",
    minutes: 15,
    blurb: "Kimchi, rice, eggs, scallion, ginger, garlic.",
    uses: ["kimchi", "rice", "eggs", "scallion", "ginger", "garlic"],
    steps: [
      "Fry chopped kimchi with garlic and ginger until jammy.",
      "Add cooked cold rice, press it into the pan to crisp.",
      "Fry an egg in a second pan until the edges lace.",
      "Slide the egg on top, scatter scallion.",
    ],
  },
  {
    id: "beef-stew",
    title: "Slow Beef & Celery Stew",
    meal: "Dinner",
    minutes: 90,
    blurb: "Beef chunks, stock, carrots, celery, onion, potatoes.",
    uses: ["beef-chunks", "stock", "carrots", "celery", "yellow-onion", "potatoes"],
    steps: [
      "Brown the beef in batches, then set aside.",
      "Sweat onion, carrot and celery in the same pot.",
      "Return beef with stock and bay, simmer covered 70 minutes.",
      "Add potatoes for the last 25 minutes, salt to taste.",
    ],
  },
  {
    id: "tuna-white-bean",
    title: "Tuna, Corn & Lettuce Bowl",
    meal: "Lunch",
    minutes: 10,
    blurb: "Tuna, corn, lettuce, red onion, lemon, avocado.",
    uses: ["tuna", "corn", "lettuce", "red-onion", "lemons", "avocado"],
    steps: [
      "Shred the lettuce, thin-slice the red onion.",
      "Flake tuna over the top with corn and sliced avocado.",
      "Dress with lemon, olive oil, salt and lots of pepper.",
    ],
  },
  {
    id: "eggplant-bake",
    title: "Eggplant & Tomato Bake",
    meal: "Dinner",
    minutes: 40,
    blurb: "Eggplant, cherry tomatoes, garlic, mint, goat cheese.",
    uses: ["eggplant", "cherry-tomatoes", "garlic", "mint", "goat-cheese"],
    steps: [
      "Slice eggplant thick, salt 10 minutes, pat dry, oil well.",
      "Roast at 210°C for 20 minutes with tomatoes and garlic.",
      "Crumble over goat cheese, back in for 8 minutes.",
      "Tear mint over the top.",
    ],
  },
  {
    id: "cauliflower-soup",
    title: "Cauliflower & Leek Soup",
    meal: "Lunch",
    minutes: 30,
    blurb: "Cauliflower, leek, stock, cream, garlic.",
    uses: ["cauliflower", "leek", "stock", "cream", "garlic"],
    steps: [
      "Sweat sliced leek and garlic in oil until soft, no colour.",
      "Add cauliflower florets and stock, simmer 18 minutes.",
      "Blend smooth, stir in a splash of cream.",
      "Season with nutmeg, salt and pepper.",
    ],
  },
  {
    id: "turkey-avocado",
    title: "Turkey, Avocado & Dill Toast",
    meal: "Lunch",
    minutes: 8,
    blurb: "Bread, turkey slices, avocado, cucumber, dill, lemon.",
    uses: ["bread", "turkey", "avocado", "cucumber", "dill", "lemons"],
    steps: [
      "Toast the bread, rub with a cut garlic clove.",
      "Mash avocado with lemon, salt and chilli flakes.",
      "Layer turkey and shaved cucumber on top, finish with dill.",
    ],
  },
  {
    id: "squash-risotto",
    title: "Butternut Squash Risotto",
    meal: "Dinner",
    minutes: 40,
    blurb: "Arborio rice, squash, stock, onion, garlic, cream.",
    uses: ["rice", "squash", "stock", "yellow-onion", "garlic", "cream"],
    steps: [
      "Roast cubed squash with oil and sage until caramelised.",
      "Soften onion and garlic, toast the rice 2 minutes.",
      "Add hot stock a ladle at a time, stirring, 18 minutes.",
      "Fold in squash and a spoon of cream, rest 2 minutes.",
    ],
  },
  {
    id: "shakshuka",
    title: "Pepper & Egg Shakshuka",
    meal: "Lunch",
    minutes: 20,
    blurb: "Eggs, baby bell peppers, cherry tomatoes, onion, jalapeño.",
    uses: ["eggs", "peppers", "cherry-tomatoes", "yellow-onion", "jalapeno", "coriander"],
    steps: [
      "Fry sliced peppers, onion and jalapeño until slumped.",
      "Add tomatoes with paprika and cumin, crush and simmer 8 minutes.",
      "Make wells, crack in the eggs, cover 5 minutes.",
      "Scatter coriander, eat from the pan with bread.",
    ],
  },
];

export const mealById = new Map(meals.map((m) => [m.id, m]));

export const pantryBasics = [
  "Olive oil",
  "Salt & pepper",
  "Cumin",
  "Paprika",
  "Chilli flakes",
  "Bay & sage",
  "Nutmeg",
];
