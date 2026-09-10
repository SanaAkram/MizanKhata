"use client";

import { useActionState, useMemo, useState } from "react";
import {
  changeEmailAction,
  changePasswordAction,
  type SecState,
} from "@/app/login/actions";
import { checkPassword } from "@/lib/validate";

const inputCls =
  "rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest";
const labelCls = "flex flex-col gap-1 text-xs font-semibold text-muted";

export default function AccountSecurity({ email }: { email: string }) {
  const [open, setOpen] = useState<"none" | "pw" | "email">("none");

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Sign-in &amp; security
      </h2>

      <div className="mt-3 flex flex-col gap-2">
        <Row
          label="Password"
          value="••••••••"
          onClick={() => setOpen(open === "pw" ? "none" : "pw")}
          open={open === "pw"}
        />
        {open === "pw" ? <ChangePassword /> : null}

        <Row
          label="Email"
          value={email}
          onClick={() => setOpen(open === "email" ? "none" : "email")}
          open={open === "email"}
        />
        {open === "email" ? <ChangeEmail current={email} /> : null}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  onClick,
  open,
}: {
  label: string;
  value: string;
  onClick: () => void;
  open: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left text-sm"
    >
      <span>
        <span className="block text-xs font-semibold text-muted">{label}</span>
        <span className="block truncate text-ink">{value}</span>
      </span>
      <span className="text-xs font-semibold text-forest">
        {open ? "Close" : "Change"}
      </span>
    </button>
  );
}

function ChangePassword() {
  const [state, action, pending] = useActionState<SecState, FormData>(
    changePasswordAction,
    {},
  );
  const [pw, setPw] = useState("");
  const chk = useMemo(() => checkPassword(pw), [pw]);

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-xl border border-line bg-paper p-3"
    >
      <label className={labelCls}>
        Current password
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </label>
      <label className={labelCls}>
        New password
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className={inputCls}
        />
        {pw ? (
          <span
            className={`text-[11px] ${chk.ok ? "text-ok" : "text-muted"}`}
          >
            {chk.ok ? `${chk.label}` : `Needs ${chk.problems.join(", ")}`}
          </span>
        ) : null}
      </label>
      <label className={labelCls}>
        Confirm new password
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={inputCls}
        />
      </label>

      {state.error ? (
        <p className="text-xs text-danger">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-xs text-ok">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

function ChangeEmail({ current }: { current: string }) {
  const [state, action, pending] = useActionState<SecState, FormData>(
    changeEmailAction,
    {},
  );
  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-xl border border-line bg-paper p-3"
    >
      <label className={labelCls}>
        New email
        <input
          name="email"
          type="email"
          required
          inputMode="email"
          className={inputCls}
          placeholder="new@example.com"
        />
      </label>
      <label className={labelCls}>
        Current password
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </label>
      <p className="text-[11px] text-muted">
        Currently {current}. You&apos;ll get a confirmation link at both the old
        and the new address.
      </p>

      {state.error ? (
        <p className="text-xs text-danger">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-xs text-ok">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send confirmation"}
      </button>
    </form>
  );
}
