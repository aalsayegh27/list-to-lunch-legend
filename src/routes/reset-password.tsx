import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Mise" },
      { name: "description", content: "Choose a new password for your Mise account." },
      { property: "og:title", content: "Choose a new password — Mise" },
      { property: "og:description", content: "Choose a new password for your Mise account." },
    ],
  }),
  component: ResetPassword,
});

/** How long to wait for the emailed link's session before calling it expired. */
const LINK_WAIT_MS = 2000;

function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The emailed link signs the cook in for this one purpose; wait for that session.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setStatus("ready");
    });
    supabase.auth.getSession().then(({ data: current }) => {
      if (current.session) setStatus("ready");
    });
    const timer = setTimeout(
      () => setStatus((s) => (s === "checking" ? "expired" : s)),
      LINK_WAIT_MS,
    );
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    navigate({ to: "/planner", replace: true });
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-body grid place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 justify-center">
          <div className="size-9 rounded-full bg-sage grid place-items-center text-cream font-display text-lg">
            M
          </div>
          <span className="font-display text-xl">Mise</span>
        </Link>

        <div className="mt-8 bg-paper border border-ink/10 rounded-3xl p-7">
          {status === "expired" ? (
            <div className="text-center">
              <h1 className="font-display text-2xl">This link has expired</h1>
              <p className="mt-3 text-sm text-ink/70">
                Reset links only work once and for a short while. Ask for a new one from
                the sign-in page.
              </p>
              <Link to="/auth" className="mt-6 inline-block text-sm font-semibold text-ink underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl">Choose a new password</h1>
              <p className="mt-2 text-sm text-ink/60">
                Then you'll go straight back to your kitchen.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
                    New password
                  </span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-sage"
                  />
                </label>

                {error && <p className="text-sm text-terracotta">{error}</p>}

                <button
                  type="submit"
                  disabled={busy || status !== "ready"}
                  className="w-full rounded-full bg-ink text-cream px-4 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {busy || status === "checking" ? "One moment…" : "Save new password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
