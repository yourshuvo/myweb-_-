"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { message: "" });
  return (
    <form action={action} className="admin-form login-form">
      <Label htmlFor="email">Email address</Label>
      <Input id="email" name="email" type="email" autoComplete="username" required />
      <Label htmlFor="password">Password</Label>
      <Input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
      {state.message && <p className="form-message is-error" role="alert">{state.message}</p>}
      <button className="retro-button" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
