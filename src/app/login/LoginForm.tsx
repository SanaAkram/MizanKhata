"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  authenticate,
  requestResetAction,
  resendOtpAction,
  setNewPasswordAction,
  signUpAction,
  verifyOtpAction,
  verifyResetAction,
  type AuthState,
} from "./actions";
import { checkPassword } from "@/lib/validate";

const inputCls =
  "rounded-xl border border-line bg-card px-4 py-3 text-base text-ink outline-none focus:border-forest";
const labelCls = "flex flex-col gap-1.5 text-sm font-medium text-muted";

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");

  const [signinState, signinAction, signinPending] = useActionState<
    AuthState,
    FormData
  >(authenticate, {});
  const [signupState, signupAction, signupPending] = useActionState<
    AuthState,
    FormData
  >(signUpAction, {});

  const verifyEmail =
    signupState.step === "verify"
      ? signupState.email
      : signinState.step === "verify"
        ? signinState.email
        : null;

  if (verifyEmail) {
    return (
      <VerifyView
        email={verifyEmail}
        next={next}
        initialMessage={signupState.message ?? signinState.error}
      />
    );
  }

  if (mode === "reset") {
    return <ResetView next={next} onBack={() => setMode("signin")} />;
  }

  const state = mode === "signup" ? signupState : signinState;
  const pending = mode === "signup" ? signupPending : signinPending;

  return (
    <form
      action={mode === "signup" ? signupAction : signinAction}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="next" value={next} />

      {mode === "signup" ? <SignupFields /> : null}

      <label className={labelCls}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          className={inputCls}
          placeholder="you@example.com"
        />
      </label>

      {mode === "signup" ? (
        <PasswordField />
      ) : (
        <label className={labelCls}>
          <span className="flex items-center justify-between">
            Password
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="text-xs font-normal text-forest underline underline-offset-2"
            >
              Forgot password?
            </button>
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputCls}
            placeholder="••••••••"
          />
        </label>
      )}

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

function SignupFields() {
  const [type, setType] = useState<"business" | "personal">("business");
  return (
    <>
      <label className={labelCls}>
        Your name
        <input
          name="name"
          type="text"
          autoComplete="name"
          required
          className={inputCls}
          placeholder="Muhammad Mubeen"
        />
      </label>

      <label className={labelCls}>
        Mobile number
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          className={inputCls}
          placeholder="03001234567"
        />
      </label>

      <div className={labelCls}>
        How will you use it?
        <input type="hidden" name="account_type" value={type} />
        <div className="flex gap-1 rounded-xl border border-line p-1">
          {(["business", "personal"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${
                type === t ? "bg-forest text-paper" : "text-muted"
              }`}
            >
              {t === "business" ? "For my shop" : "Personal only"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">
          {type === "personal"
            ? "Just the work timer and daily routine — no ledger or shop."
            : "Everything: ledger, shop, cash book, plus routine."}
        </span>
      </div>
    </>
  );
}

function PasswordField({ label = "Password" }: { label?: string }) {
  const [pw, setPw] = useState("");
  const chk = useMemo(() => checkPassword(pw), [pw]);
  const bar = ["bg-danger", "bg-danger", "bg-gold", "bg-ok", "bg-ok"][chk.score];

  return (
    <label className={labelCls}>
      {label}
      <input
        name="password"
        type="password"
        autoComplete="new-password"
        required
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className={inputCls}
        placeholder="Strong & unique"
      />
      {pw ? (
        <>
          <span className="mt-1 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i < chk.score ? bar : "bg-line"
                }`}
              />
            ))}
          </span>
          <span className="text-xs text-muted">
            {chk.ok
              ? `${chk.label} — good to go`
              : `Needs ${chk.problems.join(", ")}`}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted">
          8+ characters with a capital, a number and a symbol.
        </span>
      )}
    </label>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const id = setInterval(
      () => setLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <p className={`text-xs ${left <= 0 ? "text-danger" : "text-muted"}`}>
      {left > 0 ? `Code expires in ${mm}:${ss}` : "Code expired — resend it."}
    </p>
  );
}

function VerifyView({
  email,
  next,
  initialMessage,
}: {
  email: string;
  next: string;
  initialMessage?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    verifyOtpAction,
    {},
  );
  const [resendState, resendAction, resendPending] = useActionState<
    AuthState,
    FormData
  >(resendOtpAction, {});
  const [round, setRound] = useState(0);

  const msg = state.message || resendState.message || initialMessage;
  const err = state.error || resendState.error;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Check your email</h2>
        <p className="mt-1 text-sm text-muted">
          Enter the code sent to <b>{email}</b>.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <input
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          required
          placeholder="Code from email"
          className={`${inputCls} text-center text-2xl tracking-[0.4em]`}
        />

        <Countdown key={round} seconds={15 * 60} />

        {err ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {err}
          </p>
        ) : null}
        {msg && !err ? (
          <p className="rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok">{msg}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-forest px-4 py-3.5 text-base font-semibold text-paper active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? "Verifying…" : "Verify & continue"}
        </button>
      </form>

      <form action={resendAction} onSubmit={() => setRound((r) => r + 1)}>
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={resendPending}
          className="text-sm text-muted underline underline-offset-4 disabled:opacity-60"
        >
          {resendPending ? "Sending…" : "Send a new code"}
        </button>
      </form>
    </div>
  );
}

function Msg({ err, ok }: { err?: string; ok?: string }) {
  if (err)
    return (
      <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
        {err}
      </p>
    );
  if (ok)
    return (
      <p className="rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok">{ok}</p>
    );
  return null;
}

function Submit({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 rounded-xl bg-forest px-4 py-3.5 text-base font-semibold text-paper active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

function ResetView({ next, onBack }: { next: string; onBack: () => void }) {
  const [reqState, reqAction, reqPending] = useActionState<AuthState, FormData>(
    requestResetAction,
    {},
  );
  const [verState, verAction, verPending] = useActionState<AuthState, FormData>(
    verifyResetAction,
    {},
  );
  const [pwState, pwAction, pwPending] = useActionState<AuthState, FormData>(
    setNewPasswordAction,
    {},
  );
  const [round, setRound] = useState(0);

  const step: "email" | "code" | "newpw" =
    verState.step === "reset-newpw"
      ? "newpw"
      : reqState.step === "reset-code" || verState.step === "reset-code"
        ? "code"
        : "email";
  const email = verState.email || reqState.email || "";
  const err = reqState.error || verState.error || pwState.error;
  const ok = reqState.message || verState.message || pwState.message;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Reset your password</h2>
        <p className="mt-1 text-sm text-muted">
          {step === "email"
            ? "Enter your email — we'll email you a code."
            : step === "code"
              ? `Enter the code sent to ${email}.`
              : "Choose a new password."}
        </p>
      </div>

      {step === "email" ? (
        <form action={reqAction} className="flex flex-col gap-3">
          <label className={labelCls}>
            Email
            <input
              name="email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              className={inputCls}
              placeholder="you@example.com"
            />
          </label>
          <Msg err={err} />
          <Submit pending={reqPending}>Send code</Submit>
        </form>
      ) : null}

      {step === "code" ? (
        <>
          <form action={verAction} className="flex flex-col gap-3">
            <input type="hidden" name="email" value={email} />
            <input
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              required
              placeholder="Code from email"
              className={`${inputCls} text-center text-2xl tracking-[0.4em]`}
            />
            <Countdown key={round} seconds={15 * 60} />
            <Msg err={err} ok={err ? undefined : ok} />
            <Submit pending={verPending}>Verify code</Submit>
          </form>
          <form action={reqAction} onSubmit={() => setRound((r) => r + 1)}>
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              disabled={reqPending}
              className="text-sm text-muted underline underline-offset-4 disabled:opacity-60"
            >
              {reqPending ? "Sending…" : "Send a new code"}
            </button>
          </form>
        </>
      ) : null}

      {step === "newpw" ? (
        <form action={pwAction} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <PasswordField label="New password" />
          <label className={labelCls}>
            Confirm new password
            <input
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              className={inputCls}
              placeholder="••••••••"
            />
          </label>
          <Msg err={err} />
          <Submit pending={pwPending}>Save new password</Submit>
        </form>
      ) : null}

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted underline underline-offset-4"
      >
        Back to sign in
      </button>
    </div>
  );
}
