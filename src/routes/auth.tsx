import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signup" } =>
    search["mode"] === "signup" ? { mode: "signup" } : {},
  head: () => ({
    meta: [
      { title: "Sign in — Mise" },
      {
        name: "description",
        content: "Sign in to Mise to set up your pantry and save the meals you like.",
      },
      { property: "og:title", content: "Sign in — Mise" },
      {
        property: "og:description",
        content: "Sign in to Mise to set up your pantry and save the meals you like.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(
    search.mode === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/planner", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (resetError) return setError(resetError.message);
      return setCheckEmail(true);
    }

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (signUpError) return setError(signUpError.message);
      if (data.session) return navigate({ to: "/onboarding", replace: true });
      return setCheckEmail(true);
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signInError) return setError(signInError.message);
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
          {checkEmail ? (
            <div className="text-center">
              <h1 className="font-display text-2xl">Check your email</h1>
              <p className="mt-3 text-sm text-ink/70">
                {mode === "reset" ? (
                  <>
                    If <strong>{email}</strong> has a Mise account, we sent it a link to
                    choose a new password.
                  </>
                ) : (
                  <>
                    We sent a confirmation link to <strong>{email}</strong>. Click it and
                    you'll come right back here to set up your kitchen.
                  </>
                )}
              </p>
              <button
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                  setError(null);
                }}
                className="mt-6 text-sm font-semibold text-ink underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl">
                {mode === "signup"
                  ? "Create your kitchen"
                  : mode === "reset"
                    ? "Reset your password"
                    : "Welcome back"}
              </h1>
              <p className="mt-2 text-sm text-ink/60">
                {mode === "signup"
                  ? "Next you'll add the groceries you keep at home."
                  : mode === "reset"
                    ? "We'll email you a link to choose a new one."
                    : "Sign in to see what you can cook tonight."}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-sage"
                  />
                </label>
                {mode !== "reset" && (
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
                      Password
                    </span>
                    <input
                      type="password"
                      required
                      minLength={mode === "signup" ? 8 : undefined}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 text-sm outline-none focus:border-sage"
                    />
                  </label>
                )}

                {error && <p className="text-sm text-terracotta">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-ink text-cream px-4 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {busy
                    ? "One moment…"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "reset"
                        ? "Send reset link"
                        : "Sign in"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-ink/60">
                {mode === "signup" ? "Already have an account?" : mode === "reset" ? "Remembered it?" : "New here?"}{" "}
                <button
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                  }}
                  className="font-semibold text-ink underline"
                >
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
              {mode === "signin" && (
                <p className="mt-2 text-center text-sm text-ink/60">
                  <button
                    onClick={() => {
                      setMode("reset");
                      setError(null);
                    }}
                    className="font-semibold text-ink underline"
                  >
                    Forgot password?
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
