import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import heroImg from "@/assets/pantry-hero.jpg";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mise — meals from your own grocery list" },
      {
        name: "description",
        content:
          "Make an account, add the groceries you actually buy, and Mise suggests simple lunches and dinners you can cook tonight.",
      },
      { property: "og:title", content: "Mise — meals from your own grocery list" },
      {
        property: "og:description",
        content:
          "Add the groceries you actually buy and get simple lunches and dinners you can cook tonight.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/planner", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <header className="border-b border-ink/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
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
          <Link
            to="/auth"
            className="text-sm font-semibold rounded-full border border-ink/15 px-4 py-2"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-terracotta font-semibold">
            Your kitchen, your meals
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.02] mt-4">
            Cook simple dinners from the groceries you already buy.
          </h1>
          <p className="mt-5 text-ink/70 text-lg max-w-md">
            Make an account, add your own groceries once, and Mise pairs them with the
            oils and spices every kitchen keeps. Save the meals you love so they stick
            around even when your list changes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="bg-ink text-cream font-semibold px-6 py-3 rounded-full"
            >
              Create your kitchen
            </Link>
            <Link
              to="/auth"
              className="font-semibold px-6 py-3 rounded-full border border-ink/15"
            >
              I already have an account
            </Link>
          </div>
          <ol className="mt-10 space-y-2 text-sm text-ink/60">
            <li>1 — Make an account</li>
            <li>2 — Add the groceries you keep at home</li>
            <li>3 — Cook and heart the meals you like</li>
          </ol>
        </div>

        <img
          src={heroImg}
          alt="Eggs, cherry tomatoes, garlic, lemons and olive oil laid out on linen"
          width={1088}
          height={1280}
          className="w-full aspect-[4/5] object-cover rounded-3xl bg-butter/60"
        />
      </main>
    </div>
  );
}
