"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitPostCommentAction, type PostCommentFormState } from "@/app/(public)/updates/[slug]/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: PostCommentFormState = { status: "idle", message: "" };

export function PostCommentForm({ postId, enabled }: { postId: string; enabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(submitPostCommentAction, initialState);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status, state.attemptId]);

  if (!enabled) {
    return (
      <Alert className="retro-alert">
        <AlertDescription>The comment form will open after the database and visitor cookie are connected.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form ref={formRef} action={action} className="post-comment-form">
      <input type="hidden" name="postId" value={postId} />
      <div className="guestbook-honeypot" aria-hidden="true">
        <label htmlFor="comment-company">Company</label>
        <input id="comment-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="guestbook-field">
        <Label htmlFor="comment-displayName">Your name (optional)</Label>
        <Input id="comment-displayName" name="displayName" maxLength={40} autoComplete="nickname" />
        <p>Leave this blank to comment as Anonymous.</p>
      </div>
      <div className="guestbook-field">
        <Label htmlFor="comment-message">Comment</Label>
        <Textarea id="comment-message" name="message" minLength={1} maxLength={500} rows={5} required />
        <p>Plain text only, up to 500 characters.</p>
      </div>
      {state.message && (
        <Alert className="retro-alert" variant={state.status === "error" ? "destructive" : "default"} role="status" aria-live="polite">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <button className="retro-button post-comment-submit" type="submit" disabled={pending}>
        {pending ? "Posting..." : "Post comment"}
      </button>
    </form>
  );
}
