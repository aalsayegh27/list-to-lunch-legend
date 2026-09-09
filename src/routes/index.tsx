import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import heroImg from "@/assets/pantry-hero.jpg";
import shrimpImg from "@/assets/meal-shrimp-rice.jpg";
import chickpeaImg from "@/assets/meal-chickpea-hummus.jpg";
import chickenImg from "@/assets/meal-chicken-tray.jpg";
import {
  allItems,
  categories,
  itemName,
  meals,
  pantryBasics,
  type Meal,
} from "@/lib/kitchen-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mise — meals from your grocery list" },
      {
        name: "description",
        content:
          "Tick off what you bought this week and get simple lunches and dinners you can actually cook tonight.",
      },
      { property: "og:title", content: "Mise — meals from your grocery list" },
      {
        property: "og:description",
        content:
          "Tick off what you bought this week and get simple lunches and dinners you can actually cook tonight.",
      },
    ],
  }),
  component: Index,
});

const featured: { meal: Meal; img: string }[] = [
  { meal: meals.find((m) => m.id === "shrimp-rice")!, img: shrimpImg },
  { meal: meals.find((m) => m.id === "chickpea-hummus")!, img: chickpeaImg },
  { meal: meals.find((m) => m.id === "chicken-tray")!, img: chickenImg },
];

function Index() {
  const [stocked, setStocked] = useState<Set<string>>(
    () => new Set(allItems.filter((i) => i.stocked).map((i) => i.id)),
  );
  const [filter, setFilter] = useState<"All" | "Lunch" | "Dinner">("All");
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (id: string) =>
    setStocked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ranked = useMemo(() => {
    return meals
      .map((meal) => ({
        meal,
        missing: meal.uses.filter((u) => !stocked.has(u)),
      }))
      .filter((r) => (filter === "All" ? true : r.meal.meal === filter))
      .filter((r) => r.missing.length <= 1)
      .sort(
        (a, b) =>
          a.missing.length - b.missing.length || a.meal.minutes - b.meal.minutes,
      );
  }, [stocked, filter]);

  const readyNow = ranked.filter((r) => r.missing.length === 0).length;

  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <header className="border-b border-ink/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-sage grid place-items-center text-cream font-display text-lg">
              M
            </div>
            <div>
              <p className="font-display text-lg leading-none">Mise</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink/50">
                pantry meal planner
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-ink/60">Tonight's plan</span>
            <a
              href="#kitchen"
              className="bg-terracotta text-cream text-sm font-semibold px-4 py-2 rounded-full"
            >
              Start planning
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-12 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-terracotta font-semibold">
            Your pantry, made into meals
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.02] mt-4">
            Turn the stuff you already have into a week of simple dinners.
          </h1>
          <p className="mt-5 text-ink/70 text-lg max-w-md">
            Mise reads your recurring grocery list and pairs it with the oil, spice and
            pantry basics you already keep. Pick a lunch, pick a dinner, cook it.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#kitchen"
              className="bg-ink text-cream font-semibold px-6 py-3 rounded-full"
            >
              Plan my week
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/60">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-sage" /> 15-minute lunches
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-terracotta" /> 30-minute dinners
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-butter" /> pantry-first
            </span>
          </div>
        </div>

        <img
          src={heroImg}
          alt="Eggs, cherry tomatoes, garlic, lemons and olive oil laid out on linen"
          width={1088}
          height={1280}
          className="w-full aspect-[4/5] object-cover rounded-3xl bg-butter/60"
        />
      </section>

      {/* Featured meals */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-3xl">Tonight, ready to go</h2>
            <p className="text-ink/60 mt-1">
              Matched to your list — no new shopping needed.
            </p>
          </div>
          <span className="text-sm text-ink/50 hidden sm:block">
            {meals.length} meals · this week
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {featured.map(({ meal, img }) => (
            <article
              key={meal.id}
              className="bg-paper rounded-2xl border border-ink/10 overflow-hidden flex flex-col"
            >
              <img
                src={img}
                alt={meal.title}
                loading="lazy"
                width={944}
                height={704}
                className="w-full aspect-[4/3] object-cover bg-butter/50"
              />
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta">
                    {meal.meal}
                  </span>
                  <span className="text-xs text-ink/50">{meal.minutes} min</span>
                </div>
                <h3 className="font-display text-xl leading-tight">{meal.title}</h3>
                <p className="text-sm text-ink/60">{meal.blurb}</p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="text-xs bg-sage/15 text-sagedark font-semibold px-2.5 py-1 rounded-full">
                    {meal.uses.filter((u) => stocked.has(u)).length} on your list
                  </span>
                  <a href="#kitchen" className="text-sm font-semibold text-ink">
                    Cook →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Pantry matching */}
      <section id="kitchen" className="bg-paper border-y border-ink/10 scroll-mt-4">
        <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-terracotta font-semibold">
              Pantry-first cooking
            </p>
            <h2 className="font-display text-4xl leading-tight mt-4">
              It knows what's already in your cupboard.
            </h2>
            <p className="mt-4 text-ink/70 max-w-md">
              Oils and spices are assumed — {pantryBasics.join(", ").toLowerCase()}. Tap
              anything on your list you've run out of and the meals below re-sort.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <span className="size-6 rounded-full bg-sage/15 text-sagedark grid place-items-center font-semibold">
                  ✓
                </span>{" "}
                Assumes oils &amp; spices always stocked
              </li>
              <li className="flex items-center gap-3 text-sm">
                <span className="size-6 rounded-full bg-sage/15 text-sagedark grid place-items-center font-semibold">
                  ✓
                </span>{" "}
                Flags only what you're actually missing
              </li>
              <li className="flex items-center gap-3 text-sm">
                <span className="size-6 rounded-full bg-sage/15 text-sagedark grid place-items-center font-semibold">
                  ✓
                </span>{" "}
                Pairs lunch + dinner from the same list
              </li>
            </ul>
          </div>

          {/* Pantry panel */}
          <div className="bg-cream rounded-2xl border border-ink/10 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Your pantry, this week</h3>
              <span className="text-xs text-ink/50">{stocked.size} in stock</span>
            </div>
            <div className="mt-5 space-y-4">
              {categories.map((cat) => (
                <div key={cat.name}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45">
                    {cat.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cat.items.map((item) => {
                      const have = stocked.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          aria-pressed={have}
                          className={
                            have
                              ? "rounded-full bg-sage/15 text-sagedark border border-sage/30 px-2.5 py-1 text-[13px] font-semibold transition-colors"
                              : "rounded-full bg-paper text-ink/45 border border-ink/10 px-2.5 py-1 text-[13px] font-medium line-through transition-colors"
                          }
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 bg-sage/10 rounded-xl p-4">
              <span className="text-sagedark font-display text-2xl">{readyNow}</span>
              <span className="text-sm text-sagedark">
                meals you can cook right now with nothing extra from the store.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Matched meals */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-3xl">What you can cook</h2>
            <p className="text-ink/60 mt-1">
              Tap a meal for the method. Sorted by what needs the least shopping.
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

        <div className="grid md:grid-cols-2 gap-4">
          {ranked.map(({ meal, missing }) => {
            const isOpen = open === meal.id;
            return (
              <article
                key={meal.id}
                className="bg-paper rounded-2xl border border-ink/10 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta">
                    {meal.meal}
                  </span>
                  <span className="text-xs text-ink/50">{meal.minutes} min</span>
                </div>
                <h3 className="font-display text-xl leading-tight mt-2">{meal.title}</h3>
                <p className="text-sm text-ink/60 mt-1">{meal.blurb}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {missing.length === 0 ? (
                    <span className="text-xs bg-sage/15 text-sagedark font-semibold px-2.5 py-1 rounded-full">
                      All on hand
                    </span>
                  ) : (
                    <span className="text-xs bg-butter/60 text-terracotta font-semibold px-2.5 py-1 rounded-full">
                      Grab {missing.map(itemName).join(", ").toLowerCase()}
                    </span>
                  )}
                  <button
                    onClick={() => setOpen(isOpen ? null : meal.id)}
                    className="ml-auto text-sm font-semibold text-ink"
                  >
                    {isOpen ? "Hide method" : "How to cook →"}
                  </button>
                </div>

                {isOpen && (
                  <ol className="mt-4 space-y-2 border-t border-ink/10 pt-4">
                    {meal.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-ink/75">
                        <span className="shrink-0 size-5 rounded-full bg-sage/15 text-sagedark grid place-items-center text-[11px] font-semibold">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            );
          })}
        </div>

        {ranked.length === 0 && (
          <p className="text-sm text-ink/55">
            Nothing matches yet — tap a few items back on in your pantry above.
          </p>
        )}
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-ink/10">
        <div className="flex items-center gap-2 text-ink/60 text-sm">
          <span className="font-display">Mise</span>
          <span className="text-ink/30">·</span>
          <span>cook with what you have</span>
        </div>
      </footer>
    </div>
  );
}
