"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  submitAnonymousMessageAction,
  type AnonymousMessageFormState,
} from "@/app/(public)/ask/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: AnonymousMessageFormState = { status: "idle", message: "" };

export function AnonymousMessageForm({ enabled }: { enabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(submitAnonymousMessageAction, initialState);
  const [messageInput, setMessageInput] = useState({ attemptId: "initial", length: 0 });
  const currentAttempt = state.attemptId || "initial";
  const length = messageInput.attemptId === currentAttempt ? messageInput.length : 0;

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.attemptId, state.status]);

  if (!enabled) {
    return (
      <Alert className="retro-alert">
        <AlertDescription>Private messages will open after the database and visitor cookie are connected.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form ref={formRef} action={action} className="guestbook-form anonymous-message-form">
      <div className="guestbook-honeypot" aria-hidden="true">
        <label htmlFor="ask-company">Company</label>
        <input id="ask-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="guestbook-field">
        <Label htmlFor="anonymous-message">Your anonymous message</Label>
        <p className="ask-field-intro" id="anonymous-message-help">Write what you want to say. Avoid including personal details if you want to remain anonymous.</p>
        <Textarea
          aria-describedby="anonymous-message-help anonymous-message-count"
          id="anonymous-message"
          name="message"
          minLength={1}
          maxLength={500}
          rows={9}
          required
          placeholder="Type your private message here..."
          onChange={(event) => setMessageInput({ attemptId: currentAttempt, length: event.currentTarget.value.length })}
        />
        <div className="ask-character-status">
          <span>Plain text only</span>
          <span aria-live="polite" id="anonymous-message-count">{length} of 500 characters</span>
        </div>
      </div>
      {state.message && (
        <Alert
          className="retro-alert"
          variant={state.status === "error" ? "destructive" : "default"}
          role="status"
          aria-live="polite"
        >
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <div className="ask-submit-row">
        <button className="retro-button guestbook-submit" type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send anonymous message"}
        </button>
        <span>Delivered only to the owner inbox.</span>
      </div>
    </form>
  );
}
