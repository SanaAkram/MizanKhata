"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function safeNext(next: FormDataEntryValue | null): string {
  const v = String(next ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/work";
}

export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mode = String(formData.get("mode") ?? "signin");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    if (password.length < 6) {
      return { error: "Password must be at least 6 characters." };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.session) {
      return {
        message:
          "Account created. Check your email for a confirmation link, then sign in.",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
