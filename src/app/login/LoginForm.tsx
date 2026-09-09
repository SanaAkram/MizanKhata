"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    authenticate,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          className="rounded-xl border border-line bg-card px-4 py-3 text-base text-ink outline-none focus:border-forest"
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
        Password
        <input
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={6}
          className="rounded-xl border border-line bg-card px-4 py-3 text-base text-ink outline-none focus:border-forest"
          placeholder="••••••••"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-forest px-4 py-3.5 text-base font-semibold text-paper transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending
          ? "Please wait…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-sm text-muted underline underline-offset-4"
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
