"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkPassword, isEmail, normalizePhonePk } from "@/lib/validate";

export type AuthState = {
  error?: string;
  message?: string;
  step?: "verify";
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
    message: `We emailed a 6-digit code to ${email}. It expires in 15 minutes.`,
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

  if (token.length !== 6)
    return { step: "verify", email, error: "Enter the 6-digit code." };

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

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
