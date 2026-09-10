"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, { status: "idle" as const, message: "" });

  return (
    <form action={action} className="admin-form login-form">
      <Label htmlFor="reset-email">Owner email address</Label>
      <Input id="reset-email" name="email" type="email" autoComplete="email" required />
      {state.message && (
        <p className={`form-message ${state.status === "error" ? "is-error" : "is-success"}`} role="status">
          {state.message}
        </p>
      )}
      <button className="retro-button" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a password link"}
      </button>
    </form>
  );
}
