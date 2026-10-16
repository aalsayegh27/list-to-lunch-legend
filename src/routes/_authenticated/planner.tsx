import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { MealCard } from "@/components/MealCard";
import { PantryPanel } from "@/components/PantryPanel";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { useKitchenCache } from "@/hooks/useKitchenCache";
import { usePantryActions } from "@/hooks/usePantryActions";
import { ALLERGEN_CATALOG, DIET_CATALOG, labelFor, type Preferences } from "@/lib/diet";
import { kitchenQueryOptions, rankMeals, type RankedMeal } from "@/lib/kitchen-client";
import { reportRecipe, setVote, type Kitchen } from "@/lib/kitchen.functions";
import { pantryBasics, type Meal } from "@/lib/kitchen-data";
import {
  isNew,
  MAIN_INGREDIENTS,
  mainIngredient,
  POPULAR_SCORE,
  TIME_LIMITS,
  type MainIngredient,
} from "@/lib/meal-tags";
import type { ReportReason } from "@/lib/recipe-library";
import { generateRecipes } from "@/lib/recipes.functions";

/** Below this many matching meals, the planner asks for new ones once per visit. */
const AUTO_SUGGEST_BELOW = 6;
const AUTO_SUGGEST_KEY = "mise:auto-suggested";

/** "a, b and c" */
function listOf(items: string[], last = "and"): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`;
}

function describePreferences(prefs: Preferences): string | null {
  const diets = prefs.diets.map((d) => labelFor(d, DIET_CATALOG));
  const avoid = prefs.allergies.map((a) => labelFor(a, ALLERGEN_CATALOG).toLowerCase());
  if (diets.length === 0 && avoid.length === 0) return null;
  const kind = diets.length > 0 ? `${listOf(diets)} ` : "";
  const without = avoid.length > 0 ? ` without ${listOf(avoid, "or")}` : "";
  return `Showing ${kind}meals${without}.`;
}

function FilterChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={
        on
          ? "rounded-full bg-ink text-cream border border-ink px-3 py-1 text-xs font-semibold"
          : "rounded-full bg-paper border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 hover:border-sage"
      }
    >
      {children}
    </button>
  );
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
  const { data: kitchen, isLoading } = useQuery(kitchenQueryOptions);
  const cache = useKitchenCache();
  const favoriteToggle = useFavoriteToggle();

  const generate = useServerFn(generateRecipes);
  const vote = useServerFn(setVote);
  const report = useServerFn(reportRecipe);

  const [filter, setFilter] = useState<"All" | "Lunch" | "Dinner">("All");
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [main, setMain] = useState<MainIngredient | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ text: string; error: boolean } | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pantry = usePantryActions(setNotice);

  useEffect(() => {
    if (kitchen && !kitchen.onboarded && kitchen.items.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [kitchen, navigate]);

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
  const mainById = useMemo(
    () => new Map([...ranked, ...hiddenMeals].map((r) => [r.meal.id, mainIngredient(r.meal)])),
    [ranked, hiddenMeals],
  );
  const mainOf = (meal: Meal) => mainById.get(meal.id) ?? mainIngredient(meal);

  // Show a vote straight away (a thumbs down hides the card), then save it.
  function patchVotes(change: (votes: Kitchen["votes"]) => Kitchen["votes"]) {
    cache.patch((k) => ({ ...k, votes: change(k.votes) }));
  }

  async function castVote(mealId: string, value: 1 | -1 | 0) {
    patchVotes((v) => {
      const mine = { ...v.mine };
      const before = mine[mealId] ?? 0;
      if (value === 0) delete mine[mealId];
      else mine[mealId] = value;
      const scores = { ...v.scores, [mealId]: (v.scores[mealId] ?? 0) + value - before };
      return { ...v, mine, scores };
    });
    setNotice(value === -1 ? "Hidden for you. You can bring it back below." : null);
    try {
      await vote({ data: { recipeId: mealId, vote: value } });
    } catch {
      setNotice("Couldn't save that vote. Try again in a bit.");
      await cache.resync();
    }
  }

  async function reportMeal(mealId: string, reason: ReportReason) {
    patchVotes((v) => ({ ...v, reported: [...v.reported, mealId] }));
    setNotice("Thanks for reporting it. That meal is now hidden for you.");
    try {
      await report({ data: { recipeId: mealId, reason } });
    } catch {
      setNotice("Couldn't send that report. Try again in a bit.");
      await cache.resync();
    }
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
        hasDiets={(kitchen?.prefs.diets.length ?? 0) > 0}
        popular={(kitchen?.votes.scores[meal.id] ?? 0) >= POPULAR_SCORE}
        isNew={isNew(meal)}
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
      await cache.resync();
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
  const ofType = (r: RankedMeal) => filter === "All" || r.meal.meal === filter;
  const byFilter = (r: RankedMeal) =>
    ofType(r) &&
    (maxMinutes === null || r.meal.minutes <= maxMinutes) &&
    (main === null || mainOf(r.meal) === main);
  const matches = ranked.filter(byFilter);
  const sections = [
    {
      key: "ready",
      title: "Ready now",
      note: "Everything's already in your kitchen.",
      meals: matches.filter((r) => r.missing.length === 0),
      shown: 12,
    },
    {
      key: "away",
      title: "One item away",
      note: "Pick up one thing on the way home.",
      meals: matches.filter((r) => r.missing.length === 1),
      shown: 6,
    },
  ];
  const mainChoices = MAIN_INGREDIENTS.filter((m) => ranked.some((r) => ofType(r) && mainOf(r.meal) === m));
  const filtered = maxMinutes !== null || main !== null;
  const canSuggest = !!kitchen?.ai.ready && kitchen.ai.remainingToday > 0;
  const hiddenVisible = hiddenMeals.filter(byFilter);
  const readyNow = ranked.filter((r) => r.missing.length === 0).length;
  const savedIds = new Set((kitchen?.favorites ?? []).map((f) => f.meal_id));

  function clearFilters() {
    setFilter("All");
    setMaxMinutes(null);
    setMain(null);
  }

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
          onAdd={(name) => void pantry.add([name])}
          onUpdate={(id, patch) => void pantry.update(id, patch)}
          onRemove={(id) => void pantry.remove(id)}
        />

        <div>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-3xl">What you can cook</h2>
              <p className="text-ink/60 mt-1 text-sm">
                Best-liked first. Heart one to keep it.
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

          {ranked.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-1.5">
              {TIME_LIMITS.map((limit) => (
                <FilterChip
                  key={limit}
                  on={maxMinutes === limit}
                  onClick={() => setMaxMinutes(maxMinutes === limit ? null : limit)}
                >
                  ≤ {limit} min
                </FilterChip>
              ))}
              <span className="mx-1 hidden h-4 w-px bg-ink/15 sm:block" aria-hidden="true" />
              {mainChoices.map((m) => (
                <FilterChip key={m} on={main === m} onClick={() => setMain(main === m ? null : m)}>
                  {m}
                </FilterChip>
              ))}
            </div>
          )}

          {sections
            // "Ready now" stays visible when empty, so a new cook sees why and what to do.
            .filter((s) => s.meals.length > 0 || (s.key === "ready" && matches.length > 0))
            .map((s) => {
              const open = expanded.includes(s.key);
              const extra = s.meals.length - s.shown;
              return (
                <div key={s.key} className="mb-8">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 mb-3">
                    <h3 className="font-display text-xl whitespace-nowrap">
                      {s.title} <span className="text-ink/40">{s.meals.length}</span>
                    </h3>
                    <p className="text-xs text-ink/50">{s.note}</p>
                  </div>
                  {s.meals.length === 0 && (filtered || filter !== "All") && (
                    <div className="bg-paper border border-ink/10 rounded-2xl p-6">
                      <p className="text-sm text-ink/65">
                        None of the meals you can make right now match these filters.{" "}
                        <button onClick={clearFilters} className="font-semibold underline">
                          Show all meals
                        </button>
                      </p>
                    </div>
                  )}
                  {s.meals.length === 0 && !filtered && filter === "All" && (
                    <div className="bg-paper border border-ink/10 rounded-2xl p-6">
                      <p className="text-sm text-ink/65">
                        Nothing uses only what's in your kitchen yet.{" "}
                        {canSuggest
                          ? "Ask for new meals and Mise will write some around exactly what you have, or add a few more groceries."
                          : "Add a few more groceries to your kitchen and meals will show up here."}
                      </p>
                      {canSuggest && (
                        <button
                          onClick={() => void suggestMeals()}
                          disabled={suggesting}
                          className="mt-4 rounded-full bg-ink text-cream px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                        >
                          {suggesting ? "Cooking up ideas…" : "Suggest meals from my kitchen"}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(open ? s.meals : s.meals.slice(0, s.shown)).map(card)}
                  </div>
                  {extra > 0 && (
                    <button
                      onClick={() =>
                        setExpanded(open ? expanded.filter((k) => k !== s.key) : [...expanded, s.key])
                      }
                      className="mt-4 rounded-full border border-ink/15 px-4 py-1.5 text-sm font-semibold text-ink/70 hover:border-sage"
                    >
                      {open ? "Show fewer" : `Show ${extra} more`}
                    </button>
                  )}
                </div>
              );
            })}

          {matches.length === 0 && ranked.length > 0 && (
            <div className="bg-paper border border-ink/10 rounded-2xl p-6">
              <p className="text-sm text-ink/65">
                {filtered ? "No meals match these filters" : `No ${filter.toLowerCase()} ideas`}{" "}
                with what's in your kitchen right now.{" "}
                <button onClick={clearFilters} className="font-semibold underline">
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
