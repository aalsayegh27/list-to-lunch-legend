import type { PantryCategory } from "./categorize";

export type StarterItem = { name: string; category: PantryCategory; inStock: boolean };

/**
 * The recurring grocery list uploaded by the app's first user.
 * Used as the optional "start from a sample list" template and as the
 * dummy dataset for the test account (also exported as grocery_list.csv).
 */
export const starterPantry: StarterItem[] = [
  { name: "Kefir", category: "Dairy & Eggs", inStock: true },
  { name: "Greek yogurt", category: "Dairy & Eggs", inStock: true },
  { name: "Eggs", category: "Dairy & Eggs", inStock: true },
  { name: "Goat cheese", category: "Dairy & Eggs", inStock: false },
  { name: "Sliced cheese", category: "Dairy & Eggs", inStock: false },
  { name: "Cottage cheese", category: "Dairy & Eggs", inStock: true },
  { name: "Milk", category: "Dairy & Eggs", inStock: true },
  { name: "Heavy cream", category: "Dairy & Eggs", inStock: true },

  { name: "Turkey slices", category: "Protein", inStock: true },
  { name: "Ground beef", category: "Protein", inStock: true },
  { name: "Chicken thighs", category: "Protein", inStock: true },
  { name: "Shrimp", category: "Protein", inStock: true },
  { name: "Beef chunks", category: "Protein", inStock: true },

  { name: "Garlic", category: "Produce", inStock: true },
  { name: "Yellow onions", category: "Produce", inStock: true },
  { name: "Red onions", category: "Produce", inStock: true },
  { name: "Jalapeño", category: "Produce", inStock: true },
  { name: "Ginger", category: "Produce", inStock: true },
  { name: "Sweet potatoes", category: "Produce", inStock: true },
  { name: "Carrots", category: "Produce", inStock: true },
  { name: "Celery", category: "Produce", inStock: true },
  { name: "Spring onion", category: "Produce", inStock: true },
  { name: "Baby bell peppers", category: "Produce", inStock: true },
  { name: "Zucchini", category: "Produce", inStock: true },
  { name: "Cucumber", category: "Produce", inStock: true },
  { name: "Avocado", category: "Produce", inStock: true },
  { name: "Lemons", category: "Produce", inStock: true },
  { name: "Limes", category: "Produce", inStock: false },
  { name: "Butternut squash", category: "Produce", inStock: true },
  { name: "Lettuce", category: "Produce", inStock: true },
  { name: "Eggplant", category: "Produce", inStock: true },
  { name: "Cauliflower", category: "Produce", inStock: true },
  { name: "Potatoes", category: "Produce", inStock: true },
  { name: "Cherry tomatoes", category: "Produce", inStock: true },
  { name: "Corn", category: "Produce", inStock: true },
  { name: "Leek", category: "Produce", inStock: true },

  { name: "Coriander", category: "Herbs", inStock: true },
  { name: "Dill", category: "Herbs", inStock: true },
  { name: "Mint", category: "Herbs", inStock: true },

  { name: "Frozen peas", category: "Frozen", inStock: true },

  { name: "Oatmeal", category: "Grains", inStock: true },
  { name: "Bread", category: "Grains", inStock: true },
  { name: "Crackers", category: "Grains", inStock: true },
  { name: "Arborio rice", category: "Grains", inStock: true },

  { name: "Tuna", category: "Pantry", inStock: true },
  { name: "Olives", category: "Pantry", inStock: true },
  { name: "Hummus", category: "Pantry", inStock: true },
  { name: "Almond butter", category: "Pantry", inStock: true },
  { name: "Chicken stock", category: "Pantry", inStock: true },
  { name: "Canned chickpeas", category: "Pantry", inStock: true },
  { name: "Kimchi", category: "Pantry", inStock: true },
];

/** Handy taps offered on the pantry setup screen. */
export const commonStaples: string[] = [
  "Eggs",
  "Milk",
  "Butter",
  "Bread",
  "Rice",
  "Pasta",
  "Onions",
  "Garlic",
  "Potatoes",
  "Carrots",
  "Cherry tomatoes",
  "Lemons",
  "Chicken breast",
  "Ground beef",
  "Greek yogurt",
  "Cheddar",
  "Canned chickpeas",
  "Chicken stock",
  "Frozen peas",
  "Parsley",
];
