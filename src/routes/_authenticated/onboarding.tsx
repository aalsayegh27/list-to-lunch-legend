import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { useState } from "react";

import { guessCategory } from "@/lib/categorize";
import { PreferencePicker } from "@/components/PreferencePicker";
import {
  ALLERGEN_CATALOG,
  DIET_CATALOG,
  MAX_ALLERGIES,
  MAX_DIETS,
  type Preferences,
} from "@/lib/diet";
import { kitchenQueryOptions } from "@/lib/kitchen-client";
import {
  addPantryItems,
  finishOnboarding,
  removePantryItem,
  savePreferences,
  seedStarterPantry,
  type Kitchen,
} from "@/lib/kitchen.functions";
import { pantryBasics } from "@/lib/kitchen-data";
import { commonStaples, starterPantry } from "@/lib/starter-pantry";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Stock your kitchen — Mise" },
      {
        name: "description",
        content: "Add the groceries you keep at home so Mise can suggest meals you can cook.",
      },
      { property: "og:title", content: "Stock your kitchen — Mise" },
      {
        property: "og:description",
        content: "Add the groceries you keep at home so Mise can suggest meals you can cook.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: kitchen } = useQuery(kitchenQueryOptions);
  const addItems = useServerFn(addPantryItems);
  const seed = useServerFn(seedStarterPantry);
  const done = useServerFn(finishOnboarding);
  const removeItem = useServerFn(removePantryItem);
  const savePrefs = useServerFn(savePreferences);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const items = kitchen?.items ?? [];
  const names = new Set(items.map((i) => i.name.toLowerCase()));
  const prefs = kitchen?.prefs;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["kitchen"] });
  }

  // Show the change straight away, then save it.
  async function updatePrefs(next: Preferences) {
    queryClient.setQueryData<Kitchen>(kitchenQueryOptions.queryKey, (k) =>
      k ? { ...k, prefs: next } : k,
    );
    await savePrefs({ data: next });
    await refresh();
  }

  async function add(names: string[]) {
    setBusy(true);
    await addItems({ data: { names } });
    await refresh();
    setBusy(false);
  }

  async function remove(id: string) {
    setBusy(true);
    await removeItem({ data: { id } });
    await refresh();
    setBusy(false);
  }

  async function loadSample() {
    setBusy(true);
    await seed({
      data: {
        items: starterPantry.map((i) => ({
          name: i.name,
          category: i.category,
          inStock: i.inStock,
        })),
      },
    });
    await refresh();
    setBusy(false);
  }

  async function finish() {
    setBusy(true);
    await done({});
    await refresh();
    navigate({ to: "/planner" });
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <AppHeader email={kitchen?.email} savedCount={kitchen?.favorites.length} />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-[0.22em] text-terracotta font-semibold">
          Step one
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight mt-3">
          Stock your kitchen.
        </h1>
        <p className="mt-4 text-ink/70 max-w-xl">
          Add the groceries you usually keep at home, one at a time — each one gets filed
          into a category automatically. Oils and spices are already assumed:{" "}
          {pantryBasics.join(", ").toLowerCase()}.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = draft.trim();
            if (!name) return;
            setDraft("");
            void add([name]);
          }}
          className="mt-8 flex gap-2 max-w-lg"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. chicken thighs"
            aria-label="Grocery item"
            className="flex-1 rounded-full border border-ink/15 bg-paper px-5 py-3 text-sm outline-none focus:border-sage"
          />
          <button
            type="submit"
            className="rounded-full bg-ink text-cream px-6 py-3 text-sm font-semibold"
          >
            Add
          </button>
        </form>
        {draft.trim() && (
          <p className="mt-2 text-xs text-ink/50">
            Filed under <strong>{guessCategory(draft)}</strong>
          </p>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl">Common staples</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {commonStaples.map((staple) => {
              const have = names.has(staple.toLowerCase());
              return (
                <button
                  key={staple}
                  disabled={have || busy}
                  onClick={() => void add([staple])}
                  className={
                    have
                      ? "rounded-full bg-sage/15 text-sagedark border border-sage/30 px-3 py-1.5 text-sm font-semibold"
                      : "rounded-full bg-paper border border-ink/15 px-3 py-1.5 text-sm font-medium hover:border-sage"
                  }
                >
                  {have ? `✓ ${staple}` : `+ ${staple}`}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => void loadSample()}
            disabled={busy}
            className="mt-5 text-sm font-semibold underline text-ink"
          >
            Or start from a sample list →
          </button>
        </section>

        {kitchen?.prefsSupported && prefs && (
          <section className="mt-10">
            <h2 className="font-display text-xl">Dietary needs</h2>
            <p className="mt-1 text-sm text-ink/60">
              Mise only suggests meals that fit all of them.
            </p>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
              Diets
            </p>
            <div className="mt-2">
              <PreferencePicker
                catalog={DIET_CATALOG}
                selected={prefs.diets}
                onChange={(diets) => void updatePrefs({ ...prefs, diets })}
                placeholder="Search or add a diet — e.g. halal, keto"
                max={MAX_DIETS}
              />
            </div>
            <p className="mt-2 text-xs text-ink/50">
              Mise checks ingredients for vegetarian, vegan, pescatarian, halal, kosher,
              gluten-free, dairy-free and egg-free, but can't tell whether meat is
              certified halal or kosher. For any other diet, you'll only see recipes the
              AI made for it.
            </p>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
              Allergies
            </p>
            <div className="mt-2">
              <PreferencePicker
                catalog={ALLERGEN_CATALOG}
                selected={prefs.allergies}
                onChange={(allergies) => void updatePrefs({ ...prefs, allergies })}
                placeholder="Search or add an allergy — e.g. peanuts, mushrooms"
                max={MAX_ALLERGIES}
              />
            </div>
            <p className="mt-2 text-xs text-ink/50">
              Mise checks recipe ingredients by name. Always double-check labels.
            </p>
          </section>
        )}

        <section className="mt-10 bg-paper border border-ink/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">In your kitchen</h2>
            <span className="text-xs text-ink/50">{items.length} items</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full bg-sage/15 text-sagedark border border-sage/30 pl-2.5 pr-1.5 py-1 text-[13px] font-semibold"
              >
                {item.name}
                <button
                  onClick={() => void remove(item.id)}
                  disabled={busy}
                  aria-label={`Remove ${item.name}`}
                  className="opacity-60 hover:opacity-100 disabled:opacity-30"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-ink/55">Nothing yet — add a few items above.</p>
            )}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={() => void finish()}
            disabled={busy}
            className="rounded-full bg-terracotta text-cream px-6 py-3 text-sm font-semibold disabled:opacity-60"
          >
            Done — show me meals
          </button>
          <button
            onClick={() => void finish()}
            disabled={busy}
            className="text-sm font-semibold text-ink/60 underline"
          >
            Skip for now
          </button>
        </div>
      </main>
    </div>
  );
}
