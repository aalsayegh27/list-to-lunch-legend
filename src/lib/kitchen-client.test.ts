import { describe, expect, it, vi } from "vitest";

// rankMeals is pure; stub the server-function module it shares a file with.
vi.mock("./kitchen.functions", () => ({ getKitchen: vi.fn() }));

import { rankMeals } from "./kitchen-client";
import type { Meal } from "./kitchen-data";
import { NO_VOTES, type Votes } from "./recipe-library";

const items = ["Rice", "Garlic", "Spinach", "Lemons", "Eggs"].map((name, i) => ({
  id: String(i), name, category: "Other", in_stock: true,
}));

function ai(id: string, title: string, minutes = 20): Meal {
  return {
    id, title, meal: "Dinner", minutes, blurb: "", steps: ["a", "b"], uses: ["Rice", "Spinach"],
    ingredients: [{ name: "Rice", match: ["rice"] }, { name: "Spinach", match: ["spinach"] }],
    source: "ai",
  };
}
const library = [ai("a", "Spinach Rice", 20), ai("b", "Green Rice", 25), ai("c", "Rice & Greens", 30)];
const titles = (votes: Votes, opts?: { hidden?: boolean }) =>
  rankMeals(items, library, undefined, votes, opts).filter((r) => r.meal.source === "ai").map((r) => r.meal.title);

describe("rankMeals with votes", () => {
  it("orders equal matches by quickest without votes", () => {
    expect(titles(NO_VOTES)).toEqual(["Spinach Rice", "Green Rice", "Rice & Greens"]);
  });

  it("ranks better-liked recipes first among equal matches", () => {
    expect(titles({ ...NO_VOTES, scores: { c: 3, b: 1 } })).toEqual(["Rice & Greens", "Green Rice", "Spinach Rice"]);
  });

  it("hides a recipe the cook thumbed down, and lists it as hidden", () => {
    const votes = { ...NO_VOTES, mine: { a: -1 as const } };
    expect(titles(votes)).toEqual(["Green Rice", "Rice & Greens"]);
    expect(titles(votes, { hidden: true })).toEqual(["Spinach Rice"]);
  });

  it("brings a recipe back when the vote is switched to thumbs up", () => {
    expect(titles({ ...NO_VOTES, mine: { a: 1 } })).toContain("Spinach Rice");
  });

  it("keeps reported recipes out of both lists", () => {
    const votes = { ...NO_VOTES, mine: { a: -1 as const }, reported: ["a", "b"] };
    expect(titles(votes)).toEqual(["Rice & Greens"]);
    expect(titles(votes, { hidden: true })).toEqual([]);
  });

  it("hides starter recipes the same way", () => {
    const shakshukaKitchen = ["Eggs", "Baby bell peppers", "Cherry tomatoes", "Yellow onions", "Jalapeño"].map(
      (name, i) => ({ id: String(i), name, category: "Other", in_stock: true }),
    );
    const ids = (votes: Votes) => rankMeals(shakshukaKitchen, [], undefined, votes).map((r) => r.meal.id);
    expect(ids(NO_VOTES)).toContain("shakshuka");
    expect(ids({ ...NO_VOTES, mine: { shakshuka: -1 } })).not.toContain("shakshuka");
  });
});
