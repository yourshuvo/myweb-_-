"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitGuestbookAction, type GuestbookFormState } from "@/app/(public)/guestbook/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: GuestbookFormState = { status: "idle", message: "" };

export function GuestbookForm({ enabled }: { enabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(submitGuestbookAction, initialState);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status, state.attemptId]);

  if (!enabled) {
    return (
      <Alert className="retro-alert">
        <AlertDescription>The guestbook form will open after the database and visitor cookie are connected.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form ref={formRef} action={action} className="guestbook-form">
      <div className="guestbook-honeypot" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="guestbook-field">
        <Label htmlFor="displayName">Your name (optional)</Label>
        <Input id="displayName" name="displayName" maxLength={40} autoComplete="nickname" />
        <p>Leave this blank to sign as Anonymous.</p>
      </div>
      <div className="guestbook-field">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" minLength={1} maxLength={500} rows={7} required />
        <p>Plain text only, up to 500 characters.</p>
      </div>
      {state.message && (
        <Alert className="retro-alert" variant={state.status === "error" ? "destructive" : "default"} role="status" aria-live="polite">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <button className="retro-button guestbook-submit" type="submit" disabled={pending}>
        {pending ? "Signing..." : "Sign guestbook"}
      </button>
    </form>
  );
}
