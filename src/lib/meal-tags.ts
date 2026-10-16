import { ingredientNames, stockSatisfies, type Meal } from "./kitchen-data";

/** What a dish is mostly about, for the planner's filters. */
export const MAIN_INGREDIENTS = [
  "Chicken & turkey",
  "Beef & lamb",
  "Pork",
  "Seafood",
  "Eggs",
  "Veggie",
] as const;
export type MainIngredient = (typeof MAIN_INGREDIENTS)[number];

const PROTEINS: [MainIngredient, string[]][] = [
  ["Chicken & turkey", ["chicken", "turkey", "duck"]],
  ["Beef & lamb", ["beef", "steak", "lamb", "veal"]],
  ["Pork", ["pork", "bacon", "sausage", "ham", "chorizo", "prosciutto", "salami", "pepperoni"]],
  [
    "Seafood",
    [
      "fish",
      "shrimp",
      "prawn",
      "tuna",
      "salmon",
      "cod",
      "sardine",
      "anchovy",
      "mackerel",
      "scallop",
      "mussel",
      "clam",
      "crab",
      "squid",
    ],
  ],
];

/**
 * The first meat or seafood in the ingredient list (recipes lead with the star),
 * else eggs if it has any, else veggie. "Chicken stock" doesn't count as chicken.
 */
export function mainIngredient(meal: Meal): MainIngredient {
  const names = ingredientNames(meal);
  for (const name of names) {
    const hit = PROTEINS.find(([, words]) => stockSatisfies(words, [name]));
    if (hit) return hit[0];
  }
  return names.some((n) => stockSatisfies(["egg"], [n])) ? "Eggs" : "Veggie";
}

/** Net thumbs up (ups minus downs) for a recipe to count as popular. */
export const POPULAR_SCORE = 2;
/** How long an AI recipe counts as new. */
const NEW_FOR_DAYS = 7;

export function isNew(meal: Meal, now = Date.now()): boolean {
  if (!meal.createdAt) return false;
  return now - Date.parse(meal.createdAt) < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
}

/** Most minutes allowed by each cooking-time filter. */
export const TIME_LIMITS = [20, 30, 45] as const;
