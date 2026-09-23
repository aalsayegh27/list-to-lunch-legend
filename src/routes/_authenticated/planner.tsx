import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { MealCard } from "@/components/MealCard";
import { PantryPanel } from "@/components/PantryPanel";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { kitchenQueryOptions, rankMeals } from "@/lib/kitchen-client";
import { addPantryItems, removePantryItem, updatePantryItem } from "@/lib/kitchen.functions";
import { pantryBasics } from "@/lib/kitchen-data";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Tonight's plan — Mise" },
      {
        name: "description",
        content: "Simple lunches and dinners matched to the groceries in your kitchen.",
      },
      { property: "og:title", content: "Tonight's plan — Mise" },
      {
        property: "og:description",
        content: "Simple lunches and dinners matched to the groceries in your kitchen.",
      },
    ],
  }),
  component: Planner,
});

function Planner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: kitchen, isLoading } = useQuery(kitchenQueryOptions);
  const favoriteToggle = useFavoriteToggle();

  const addItems = useServerFn(addPantryItems);
  const update = useServerFn(updatePantryItem);
  const remove = useServerFn(removePantryItem);

  const [filter, setFilter] = useState<"All" | "Lunch" | "Dinner">("All");

  useEffect(() => {
    if (kitchen && !kitchen.onboarded && kitchen.items.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [kitchen, navigate]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["kitchen"] });

  const ranked = useMemo(() => rankMeals(kitchen?.items ?? []), [kitchen?.items]);
  const visible = ranked.filter((r) => (filter === "All" ? true : r.meal.meal === filter));
  const readyNow = ranked.filter((r) => r.missing.length === 0).length;
  const savedIds = new Set((kitchen?.favorites ?? []).map((f) => f.meal_id));

  if (isLoading || !kitchen) {
    return (
      <div className="min-h-screen bg-cream text-ink font-body grid place-items-center">
        <p className="text-sm text-ink/50">Setting the table…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <AppHeader email={kitchen.email} savedCount={kitchen.favorites.length} />

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-terracotta font-semibold">
          Your pantry, made into meals
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight mt-3 max-w-2xl">
          {readyNow > 0
            ? `${readyNow} ${readyNow === 1 ? "meal" : "meals"} you can cook right now.`
            : "Add a few more groceries and meals will appear."}
        </h1>
        <p className="mt-4 text-ink/70 max-w-xl">
          Oils and spices are assumed — {pantryBasics.join(", ").toLowerCase()}. Tap
          anything you've run out of and the meals re-sort.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid lg:grid-cols-[1fr_1.35fr] gap-8 items-start">
        <PantryPanel
          items={kitchen.items}
          onAdd={async (name) => {
            await addItems({ data: { names: [name] } });
            await refresh();
          }}
          onUpdate={async (id, patch) => {
            await update({ data: { id, ...patch } });
            await refresh();
          }}
          onRemove={async (id) => {
            await remove({ data: { id } });
            await refresh();
          }}
        />

        <div>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-3xl">What you can cook</h2>
              <p className="text-ink/60 mt-1 text-sm">
                Sorted by what needs the least shopping. Heart one to keep it.
              </p>
            </div>
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
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {visible.map(({ meal, missing }) => (
              <MealCard
                key={meal.id}
                meal={meal}
                missing={missing}
                favorite={savedIds.has(meal.id)}
                onToggleFavorite={() =>
                  favoriteToggle.mutate({ meal, favorite: !savedIds.has(meal.id) })
                }
              />
            ))}
          </div>

          {visible.length === 0 && ranked.length > 0 && (
            <div className="bg-paper border border-ink/10 rounded-2xl p-6">
              <p className="text-sm text-ink/65">
                No {filter.toLowerCase()} ideas with what's in your kitchen right now.{" "}
                <button onClick={() => setFilter("All")} className="font-semibold underline">
                  Show all meals
                </button>
              </p>
            </div>
          )}

          {ranked.length === 0 && (
            <div className="bg-paper border border-ink/10 rounded-2xl p-6">
              <p className="text-sm text-ink/65">
                Nothing matches your kitchen yet. Add a few more groceries on the left —
                or{" "}
                <Link to="/onboarding" className="font-semibold underline">
                  run through setup again
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
