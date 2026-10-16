import { guessCategory } from "./categorize";
import { ingredientNames, stockSatisfies, type Meal } from "./kitchen-data";

/** The icons a recipe banner can show, named after their lucide-react components. */
export type IconName =
  | "Drumstick"
  | "Beef"
  | "Ham"
  | "Fish"
  | "Shrimp"
  | "Egg"
  | "Milk"
  | "Citrus"
  | "Wheat"
  | "Bean"
  | "Carrot"
  | "LeafyGreen"
  | "Sprout";

/** Proteins, dairy and citrus are drawn in terracotta; plants in sage. */
export type IconTone = "terracotta" | "sage";

export type BannerIcon = { icon: IconName; tone: IconTone; label: string };

const RULES: [IconName, IconTone, string[]][] = [
  ["Drumstick", "terracotta", ["chicken", "turkey", "duck"]],
  ["Beef", "terracotta", ["beef", "steak", "lamb", "veal"]],
  ["Ham", "terracotta", ["pork", "bacon", "sausage", "ham", "chorizo", "prosciutto", "salami"]],
  ["Fish", "terracotta", ["fish", "tuna", "salmon", "cod", "sardine", "anchovy", "mackerel"]],
  ["Shrimp", "terracotta", ["shrimp", "prawn", "scallop", "mussel", "clam", "crab", "squid"]],
  ["Egg", "terracotta", ["egg"]],
  // Before dairy, so peanut butter is a legume rather than butter.
  ["Bean", "sage", ["chickpea", "bean", "lentil", "hummus", "pea", "peanut"]],
  [
    "Milk",
    "terracotta",
    ["milk", "cream", "yogurt", "yoghurt", "kefir", "cheese", "cheddar", "feta", "butter"],
  ],
  ["Citrus", "terracotta", ["lemon", "lime", "orange"]],
  [
    "Wheat",
    "sage",
    ["rice", "pasta", "bread", "bun", "cracker", "tortilla", "noodle", "oat", "couscous", "toast"],
  ],
  ["Carrot", "sage", ["carrot", "potato", "squash", "pumpkin", "beetroot", "parsnip", "turnip"]],
];

/** In nearly everything, so they'd crowd every banner without telling dishes apart. */
const AROMATICS = [
  "garlic",
  "onion",
  "shallot",
  "ginger",
  "jalapeno",
  "jalapeño",
  "chilli",
  "chili",
];

/** Most icons on one banner. */
const MAX_ICONS = 5;

function iconFor(name: string): BannerIcon | null {
  const rule = RULES.find(([, , words]) => stockSatisfies(words, [name]));
  if (rule) return { icon: rule[0], tone: rule[1], label: name };
  if (stockSatisfies(AROMATICS, [name])) return null;
  const category = guessCategory(name);
  if (category === "Produce") return { icon: "LeafyGreen", tone: "sage", label: name };
  if (category === "Herbs") return { icon: "Sprout", tone: "sage", label: name };
  return null;
}

/**
 * One icon per kind of ingredient, in recipe order (the star comes first), so a
 * chicken, carrot and lemon tray bake reads drumstick, carrot, citrus.
 */
export function bannerIcons(meal: Meal): BannerIcon[] {
  const icons: BannerIcon[] = [];
  for (const name of ingredientNames(meal)) {
    const found = iconFor(name);
    if (found && !icons.some((i) => i.icon === found.icon)) icons.push(found);
  }
  if (icons.length === 0) icons.push({ icon: "LeafyGreen", tone: "sage", label: meal.title });
  return icons.slice(0, MAX_ICONS);
}
