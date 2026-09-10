"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, { status: "idle" as const, message: "" });

  return (
    <form action={action} className="admin-form login-form">
      <input name="token" type="hidden" value={token} />
      <Label htmlFor="new-password">New password</Label>
      <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
      <Label htmlFor="confirm-password">Confirm new password</Label>
      <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
      {state.message && <p className="form-message is-error" role="alert">{state.message}</p>}
      <button className="retro-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
