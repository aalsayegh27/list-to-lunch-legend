import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function AppHeader({
  email,
  savedCount,
}: {
  email?: string | null | undefined;
  savedCount?: number | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-ink/10 bg-cream">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
        <Link to="/planner" className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-sage grid place-items-center text-cream font-display text-lg">
            M
          </div>
          <div>
            <p className="font-display text-lg leading-none">Mise</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink/50">
              pantry meal planner
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/planner"
            className="text-sm font-semibold text-ink/70 hover:text-ink"
            activeProps={{ className: "text-sm font-semibold text-ink" }}
          >
            Planner
          </Link>
          <Link
            to="/library"
            className="text-sm font-semibold text-ink/70 hover:text-ink flex items-center gap-1.5"
            activeProps={{ className: "text-sm font-semibold text-ink flex items-center gap-1.5" }}
          >
            Saved
            {savedCount ? (
              <span className="text-[11px] bg-terracotta text-cream rounded-full px-1.5 py-0.5 font-bold">
                {savedCount}
              </span>
            ) : null}
          </Link>
          {email ? (
            <span className="hidden md:inline text-sm text-ink/50 max-w-[180px] truncate">
              {email}
            </span>
          ) : null}
          <button
            onClick={signOut}
            className="text-sm font-semibold rounded-full border border-ink/15 px-3 py-1.5 text-ink/70 hover:bg-paper"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
