export type Item = { id: string; name: string; stocked: boolean };
export type Category = { name: string; items: Item[] };

export const categories: Category[] = [
  {
    name: "Dairy & Eggs",
    items: [
      { id: "kefir", name: "Kefir", stocked: true },
      { id: "greek-yogurt", name: "Greek yogurt", stocked: true },
      { id: "eggs", name: "Eggs", stocked: true },
      { id: "goat-cheese", name: "Goat cheese", stocked: false },
      { id: "sliced-cheese", name: "Sliced cheese", stocked: false },
      { id: "cottage-cheese", name: "Cottage cheese", stocked: true },
      { id: "milk", name: "Milk", stocked: true },
      { id: "cream", name: "Heavy cream", stocked: true },
    ],
  },
  {
    name: "Protein",
    items: [
      { id: "turkey", name: "Turkey slices", stocked: true },
      { id: "ground-beef", name: "Ground beef", stocked: true },
      { id: "chicken-thighs", name: "Chicken thighs", stocked: true },
      { id: "shrimp", name: "Shrimp", stocked: true },
      { id: "beef-chunks", name: "Beef chunks", stocked: true },
    ],
  },
  {
    name: "Produce",
    items: [
      { id: "garlic", name: "Garlic", stocked: true },
      { id: "yellow-onion", name: "Yellow onions", stocked: true },
      { id: "red-onion", name: "Red onions", stocked: true },
      { id: "jalapeno", name: "Jalapeño", stocked: true },
      { id: "ginger", name: "Ginger", stocked: true },
      { id: "sweet-potato", name: "Sweet potatoes", stocked: true },
      { id: "carrots", name: "Carrots", stocked: true },
      { id: "celery", name: "Celery", stocked: true },
      { id: "scallion", name: "Spring onion", stocked: true },
      { id: "coriander", name: "Coriander", stocked: true },
      { id: "peppers", name: "Baby bell peppers", stocked: true },
      { id: "zucchini", name: "Zucchini", stocked: true },
      { id: "cucumber", name: "Cucumber", stocked: true },
      { id: "avocado", name: "Avocado", stocked: true },
      { id: "lemons", name: "Lemons", stocked: true },
      { id: "limes", name: "Limes", stocked: false },
      { id: "squash", name: "Butternut squash / beets", stocked: true },
      { id: "lettuce", name: "Lettuce", stocked: true },
      { id: "eggplant", name: "Eggplant", stocked: true },
      { id: "cauliflower", name: "Cauliflower", stocked: true },
      { id: "potatoes", name: "Potatoes", stocked: true },
      { id: "cherry-tomatoes", name: "Cherry tomatoes", stocked: true },
      { id: "peas", name: "Frozen peas", stocked: true },
      { id: "corn", name: "Corn", stocked: true },
      { id: "dill", name: "Dill", stocked: true },
      { id: "leek", name: "Leek", stocked: true },
      { id: "mint", name: "Mint", stocked: true },
    ],
  },
  {
    name: "Pantry",
    items: [
      { id: "oatmeal", name: "Oatmeal", stocked: true },
      { id: "tuna", name: "Tuna / sardines", stocked: true },
      { id: "olives", name: "Olives", stocked: true },
      { id: "hummus", name: "Hummus", stocked: true },
      { id: "almond-butter", name: "Almond butter", stocked: true },
      { id: "stock", name: "Chicken / veggie stock", stocked: true },
      { id: "rice", name: "Arborio rice", stocked: true },
      { id: "chickpeas", name: "Canned chickpeas", stocked: true },
      { id: "kimchi", name: "Kimchi", stocked: true },
    ],
  },
  {
    name: "Grains",
    items: [
      { id: "bread", name: "Bread", stocked: true },
      { id: "crackers", name: "Crackers", stocked: true },
    ],
  },
];

export const allItems: Item[] = categories.flatMap((c) => c.items);

export const itemName = (id: string) =>
  allItems.find((i) => i.id === id)?.name ?? id;

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

export const pantryBasics = [
  "Olive oil",
  "Salt & pepper",
  "Cumin",
  "Paprika",
  "Chilli flakes",
  "Bay & sage",
  "Nutmeg",
];
