"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkPassword, isEmail, normalizePhonePk } from "@/lib/validate";

export type AuthState = {
  error?: string;
  message?: string;
  step?: "verify" | "reset-code" | "reset-newpw";
  email?: string;
};

function safeNext(next: FormDataEntryValue | null): string {
  const v = String(next ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/work";
}

/** Sign in with an existing email + password. */
export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("not confirmed")) {
      return {
        step: "verify",
        email,
        error: "Verify your email first — enter the code we sent.",
      };
    }
    return { error: error.message };
  }
  redirect(next);
}

/** Create an account; sends a 6-digit code by email. */
export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const accountType =
    String(formData.get("account_type") ?? "business") === "personal"
      ? "personal"
      : "business";
  const next = safeNext(formData.get("next"));

  if (name.length < 2) return { error: "Enter your name." };
  if (!isEmail(email)) return { error: "Enter a valid email address." };

  const phone = normalizePhonePk(phoneRaw);
  if (!phone)
    return { error: "Enter a valid Pakistani mobile number, e.g. 03001234567." };

  const pw = checkPassword(password);
  if (!pw.ok)
    return { error: `Password needs ${pw.problems.join(", ")}.` };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, phone, account_type: accountType },
    },
  });
  if (error) return { error: error.message };

  // Confirmations OFF → we already have a session; otherwise ask for the code.
  if (data.session) redirect(next);
  return {
    step: "verify",
    email,
    message: `We emailed a code to ${email}. It expires in 15 minutes.`,
  };
}

/** Verify the email code and finish signing in. */
export async function verifyOtpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  const next = safeNext(formData.get("next"));

  if (token.length < 6 || token.length > 10)
    return { step: "verify", email, error: "Enter the code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });
  if (error) {
    const msg = error.message.toLowerCase();
    return {
      step: "verify",
      email,
      error:
        msg.includes("expired") || msg.includes("invalid")
          ? "That code is wrong or expired. Ask for a new one."
          : error.message,
    };
  }
  redirect(next);
}

/** Send a fresh code. */
export async function resendOtpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!isEmail(email)) return { step: "verify", email, error: "Missing email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { step: "verify", email, error: error.message };
  return { step: "verify", email, message: "New code sent." };
}

// ---- forgot password (unauthenticated) --------------------------------

/** Step 1: email a 6-digit recovery code. */
export async function requestResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!isEmail(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  // Never reveals whether the address exists — Supabase returns no error here.
  await supabase.auth.resetPasswordForEmail(email);
  return {
    step: "reset-code",
    email,
    message: `If ${email} has an account, a code is on its way. It expires in 15 minutes.`,
  };
}

/** Step 2: verify the recovery code → opens a short recovery session. */
export async function verifyResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  if (token.length < 6 || token.length > 10)
    return { step: "reset-code", email, error: "Enter the code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });
  if (error)
    return {
      step: "reset-code",
      email,
      error: "That code is wrong or expired. Ask for a new one.",
    };
  return { step: "reset-newpw", email };
}

/** Step 3: set the new password (needs the recovery session from step 2). */
export async function setNewPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(formData.get("next"));

  if (password !== confirm)
    return { step: "reset-newpw", email, error: "The two passwords don't match." };
  const pw = checkPassword(password);
  if (!pw.ok)
    return {
      step: "reset-newpw",
      email,
      error: `Password needs ${pw.problems.join(", ")}.`,
    };

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    return {
      step: "reset-code",
      email,
      error: "Your reset window expired. Start again.",
    };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { step: "reset-newpw", email, error: error.message };
  redirect(next);
}

// ---- change password / email (signed in) ------------------------------

export type SecState = { error?: string; message?: string };

export async function changePasswordAction(
  _prev: SecState,
  formData: FormData,
): Promise<SecState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You're not signed in." };

  if (next !== confirm) return { error: "The two new passwords don't match." };
  const pw = checkPassword(next);
  if (!pw.ok) return { error: `Password needs ${pw.problems.join(", ")}.` };

  // re-authenticate with the current password
  const reauth = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (reauth.error) return { error: "Current password is wrong." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };
  return { message: "Password changed." };
}

export async function changeEmailAction(
  _prev: SecState,
  formData: FormData,
): Promise<SecState> {
  const current = String(formData.get("current") ?? "");
  const newEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You're not signed in." };
  if (!isEmail(newEmail)) return { error: "Enter a valid email address." };
  if (newEmail === user.email.toLowerCase())
    return { error: "That's already your email." };

  const reauth = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (reauth.error) return { error: "Password is wrong." };

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { error: error.message };
  return {
    message: `Confirm the change from both your old and new email. Check ${newEmail} for the link.`,
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
