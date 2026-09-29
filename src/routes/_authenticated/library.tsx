import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { MealCard } from "@/components/MealCard";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { kitchenQueryOptions } from "@/lib/kitchen-client";
import { missingFor } from "@/lib/kitchen-data";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Saved recipes — Mise" },
      {
        name: "description",
        content: "Your hearted recipes, kept safe even when your grocery list changes.",
      },
      { property: "og:title", content: "Saved recipes — Mise" },
      {
        property: "og:description",
        content: "Your hearted recipes, kept safe even when your grocery list changes.",
      },
    ],
  }),
  component: Library,
});

function Library() {
  const { data: kitchen, isLoading } = useQuery(kitchenQueryOptions);
  const favoriteToggle = useFavoriteToggle();
  const [filter, setFilter] = useState<"All" | "Lunch" | "Dinner">("All");

  if (isLoading || !kitchen) {
    return (
      <div className="min-h-screen bg-cream text-ink font-body grid place-items-center">
        <p className="text-sm text-ink/50">Opening your library…</p>
      </div>
    );
  }

  const stocked = kitchen.items.filter((i) => i.in_stock).map((i) => i.name);
  const saved = kitchen.favorites
    .map((f) => f.snapshot)
    .filter((m) => (filter === "All" ? true : m.meal === filter));

  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <AppHeader email={kitchen.email} savedCount={kitchen.favorites.length} />

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-terracotta font-semibold">
              Your library
            </p>
            <h1 className="font-display text-4xl md:text-5xl leading-tight mt-3">
              {kitchen.favorites.length} saved{" "}
              {kitchen.favorites.length === 1 ? "recipe" : "recipes"}.
            </h1>
            <p className="mt-3 text-ink/70 max-w-xl">
              These stay exactly as they are, even when your grocery list changes.
            </p>
          </div>
          {kitchen.favorites.length > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-ink/10 p-1">
              {(["All", "Lunch", "Dinner"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={
                    filter === f
                      ? "rounded-full bg-ink text-cream px-4 py-1.5 text-sm font-semibold"
                      : "rounded-full px-4 py-1.5 text-sm font-semibold text-ink/55"
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {kitchen.favorites.length === 0 ? (
          <div className="mt-10 bg-paper border border-ink/10 rounded-2xl p-8 text-center">
            <h2 className="font-display text-2xl">Nothing saved yet</h2>
            <p className="mt-2 text-sm text-ink/65">
              Tap the heart on any meal and it'll live here for good.
            </p>
            <Link
              to="/planner"
              className="mt-6 inline-block rounded-full bg-ink text-cream px-6 py-3 text-sm font-semibold"
            >
              Find something to cook
            </Link>
          </div>
        ) : saved.length === 0 ? (
          <div className="mt-8 bg-paper border border-ink/10 rounded-2xl p-6">
            <p className="text-sm text-ink/65">
              You haven't saved any {filter.toLowerCase()} recipes yet.{" "}
              <button onClick={() => setFilter("All")} className="font-semibold underline">
                Show all saved recipes
              </button>
            </p>
          </div>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {saved.map((meal) => {
              const missing = missingFor(meal, stocked);
              return (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  missing={missing}
                  favorite
                  onToggleFavorite={() => favoriteToggle.mutate({ meal, favorite: false })}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
