import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { MealCard } from "@/components/MealCard";
import { PantryPanel } from "@/components/PantryPanel";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { ALLERGEN_LABELS, DIET_LABELS, type Preferences } from "@/lib/diet";
import { kitchenQueryOptions, MAX_SHOWN, rankMeals, type RankedMeal } from "@/lib/kitchen-client";
import {
  addPantryItems,
  removePantryItem,
  reportRecipe,
  setVote,
  updatePantryItem,
  type Kitchen,
} from "@/lib/kitchen.functions";
import { pantryBasics } from "@/lib/kitchen-data";
import type { ReportReason } from "@/lib/recipe-library";
import { generateRecipes } from "@/lib/recipes.functions";

/** Below this many matching meals, the planner asks for new ones once per visit. */
const AUTO_SUGGEST_BELOW = 6;
const AUTO_SUGGEST_KEY = "mise:auto-suggested";

function describePreferences(prefs: Preferences): string | null {
  const diet = prefs.diet ? DIET_LABELS[prefs.diet].toLowerCase() : null;
  const avoid = prefs.allergies.map((a) => ALLERGEN_LABELS[a].toLowerCase());
  if (!diet && avoid.length === 0) return null;
  const without = avoid.length > 0 ? ` without ${avoid.join(" or ")}` : "";
  return `Showing ${diet ? `${diet} ` : ""}meals${without}.`;
}

function alreadyAutoSuggested(): boolean {
  try {
    if (sessionStorage.getItem(AUTO_SUGGEST_KEY)) return true;
    sessionStorage.setItem(AUTO_SUGGEST_KEY, "1");
    return false;
  } catch {
    return true;
  }
}

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
  const generate = useServerFn(generateRecipes);
  const vote = useServerFn(setVote);
  const report = useServerFn(reportRecipe);

  const [filter, setFilter] = useState<"All" | "Lunch" | "Dinner">("All");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ text: string; error: boolean } | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (kitchen && !kitchen.onboarded && kitchen.items.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [kitchen, navigate]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["kitchen"] });

  const ranked = useMemo(
    () => rankMeals(kitchen?.items ?? [], kitchen?.library, kitchen?.prefs, kitchen?.votes),
    [kitchen?.items, kitchen?.library, kitchen?.prefs, kitchen?.votes],
  );
  const hiddenMeals = useMemo(
    () =>
      rankMeals(kitchen?.items ?? [], kitchen?.library, kitchen?.prefs, kitchen?.votes, {
        hidden: true,
      }),
    [kitchen?.items, kitchen?.library, kitchen?.prefs, kitchen?.votes],
  );

  // Show a vote straight away (a thumbs down hides the card), then save it.
  function patchVotes(change: (votes: Kitchen["votes"]) => Kitchen["votes"]) {
    queryClient.setQueryData<Kitchen>(kitchenQueryOptions.queryKey, (k) =>
      k ? { ...k, votes: change(k.votes) } : k,
    );
  }

  async function castVote(mealId: string, value: 1 | -1 | 0) {
    patchVotes((v) => {
      const mine = { ...v.mine };
      if (value === 0) delete mine[mealId];
      else mine[mealId] = value;
      return { ...v, mine };
    });
    setNotice(value === -1 ? "Hidden for you. You can bring it back below." : null);
    try {
      await vote({ data: { recipeId: mealId, vote: value } });
    } catch {
      setNotice("Couldn't save that vote. Try again in a bit.");
    }
    await refresh();
  }

  async function reportMeal(mealId: string, reason: ReportReason) {
    patchVotes((v) => ({ ...v, reported: [...v.reported, mealId] }));
    setNotice("Thanks for reporting it. That meal is now hidden for you.");
    try {
      await report({ data: { recipeId: mealId, reason } });
    } catch {
      setNotice("Couldn't send that report. Try again in a bit.");
    }
    await refresh();
  }

  function card({ meal, missing }: RankedMeal) {
    const votingOn = !!kitchen?.votes.supported;
    return (
      <MealCard
        key={meal.id}
        meal={meal}
        missing={missing}
        favorite={savedIds.has(meal.id)}
        onToggleFavorite={() => favoriteToggle.mutate({ meal, favorite: !savedIds.has(meal.id) })}
        vote={kitchen?.votes.mine[meal.id] ?? 0}
        {...(votingOn && {
          onVote: (v: 1 | -1 | 0) => void castVote(meal.id, v),
          onReport: (reason: ReportReason) => void reportMeal(meal.id, reason),
        })}
      />
    );
  }

  async function suggestMeals() {
    setSuggesting(true);
    setSuggestion(null);
    try {
      const result = await generate({ data: { meal: filter === "All" ? null : filter } });
      setSuggestion(
        result.ok
          ? { text: `Added ${result.added} new ${result.added === 1 ? "meal" : "meals"}.`, error: false }
          : { text: result.message, error: true },
      );
      await refresh();
    } catch {
      setSuggestion({ text: "Something went wrong. Try again in a bit.", error: true });
    } finally {
      setSuggesting(false);
    }
  }

  // When the kitchen matches only a few meals, ask for new ones once per visit.
  const stockedCount = kitchen?.items.filter((i) => i.in_stock).length ?? 0;
  const shouldAutoSuggest =
    !!kitchen?.ai.ready &&
    kitchen.ai.remainingToday > 0 &&
    stockedCount >= 3 &&
    ranked.length < AUTO_SUGGEST_BELOW;
  useEffect(() => {
    if (shouldAutoSuggest && !alreadyAutoSuggested()) void suggestMeals();
    // suggestMeals only needs to run once, when the condition first holds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoSuggest]);
  const byFilter = (r: RankedMeal) => (filter === "All" ? true : r.meal.meal === filter);
  const visible = ranked.filter(byFilter).slice(0, MAX_SHOWN);
  const hiddenVisible = hiddenMeals.filter(byFilter);
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
          {readyNow > MAX_SHOWN
            ? `${MAX_SHOWN}+ meals you can cook right now.`
            : readyNow > 0
              ? `${readyNow} ${readyNow === 1 ? "meal" : "meals"} you can cook right now.`
              : "Add a few more groceries and meals will appear."}
        </h1>
        <p className="mt-4 text-ink/70 max-w-xl">
          Oils and spices are assumed — {pantryBasics.join(", ").toLowerCase()}. Tap
          anything you've run out of and the meals re-sort.
          {kitchen.prefsSupported && (
            <>
              {" "}
              {describePreferences(kitchen.prefs)}{" "}
              <Link to="/onboarding" className="font-semibold underline">
                {describePreferences(kitchen.prefs) ? "Change" : "Set dietary needs"}
              </Link>
            </>
          )}
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

          <div className="grid sm:grid-cols-2 gap-4">{visible.map(card)}</div>

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

          {(notice || hiddenVisible.length > 0) && (
            <p className="mt-6 text-sm text-ink/60">
              {notice}
              {notice && hiddenVisible.length > 0 && " "}
              {hiddenVisible.length > 0 && (
                <>
                  You've hidden {hiddenVisible.length}{" "}
                  {hiddenVisible.length === 1 ? "meal" : "meals"} with a thumbs down.{" "}
                  <button onClick={() => setShowHidden(!showHidden)} className="font-semibold underline">
                    {showHidden ? "Hide them" : "Show them"}
                  </button>
                </>
              )}
            </p>
          )}
          {showHidden && hiddenVisible.length > 0 && (
            <div className="mt-4 grid sm:grid-cols-2 gap-4">{hiddenVisible.map(card)}</div>
          )}

          {kitchen.ai.ready && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={() => void suggestMeals()}
                disabled={suggesting || kitchen.ai.remainingToday === 0}
                className="rounded-full bg-ink text-cream px-6 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {suggesting ? "Cooking up ideas…" : "Suggest new meals"}
              </button>
              <p className={suggestion?.error ? "text-sm text-terracotta" : "text-sm text-ink/60"}>
                {suggestion?.text ??
                  (kitchen.ai.remainingToday === 0
                    ? "No more suggestions today — more tomorrow."
                    : `${kitchen.ai.remainingToday} left today.`)}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
