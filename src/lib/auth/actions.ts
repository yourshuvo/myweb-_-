"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { getServerEnv, siteUrl } from "@/lib/env";
import { loginSchema, passwordResetRequestSchema, passwordResetSchema } from "@/lib/validation";

export type LoginState = { message: string };
export type PasswordActionState = { status: "idle" | "success" | "error"; message: string };

const passwordEmailMessage = "If this is the owner email, a password link is on its way. Check your inbox and spam folder.";

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { message: "Check the email and password." };

  const allowedEmail = getServerEnv("ADMIN_EMAIL")?.toLowerCase();
  if (!allowedEmail || parsed.data.email.toLowerCase() !== allowedEmail) {
    return { message: "This account is not allowed to manage the site." };
  }

  const auth = getAuth();
  if (!auth) return { message: "Neon Auth has not been configured yet." };
  const { error } = await auth.signIn.email(parsed.data);
  if (error) return { message: error.message || "Sign in failed." };
  redirect("/admin");
}

export async function logoutAction() {
  const auth = getAuth();
  if (auth) await auth.signOut();
  redirect("/admin/login");
}

export async function requestPasswordResetAction(
  _state: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message || "Enter a valid email address." };
  }

  const allowedEmail = getServerEnv("ADMIN_EMAIL")?.toLowerCase();
  if (!allowedEmail || parsed.data.email.toLowerCase() !== allowedEmail) {
    return { status: "success", message: passwordEmailMessage };
  }

  const auth = getAuth();
  if (!auth) return { status: "error", message: "Password setup is unavailable until Neon Auth is configured." };

  await auth.requestPasswordReset({
    email: parsed.data.email,
    redirectTo: `${siteUrl()}/admin/password`,
  });

  return { status: "success", message: passwordEmailMessage };
}

export async function resetPasswordAction(
  _state: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsed = passwordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message || "Check the new password." };
  }

  const auth = getAuth();
  if (!auth) return { status: "error", message: "Password setup is unavailable until Neon Auth is configured." };

  const { error } = await auth.resetPassword({
    newPassword: parsed.data.password,
    token: parsed.data.token,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "INVALID_TOKEN" ? "This password link is invalid or expired. Request a new one." : error.message || "Password setup failed.",
    };
  }

  redirect("/admin/login?reset=1");
}
