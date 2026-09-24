"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = { status: "idle" | "error" | "success"; message: string };

export function PostCommentForm({ postId, enabled }: { postId: string; enabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, setState] = useState<FormState>({ status: "idle", message: "" });
  const [pending, setPending] = useState(false);

  if (!enabled) {
    return (
      <Alert className="retro-alert">
        <AlertDescription>The comment form will open after the database and visitor cookie are connected.</AlertDescription>
      </Alert>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setState({ status: "idle", message: "" });
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: String(formData.get("displayName") || ""),
          message: String(formData.get("message") || ""),
          company: String(formData.get("company") || ""),
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok) {
        setState({ status: "error", message: data?.error || "The comment could not be saved." });
      } else {
        formRef.current?.reset();
        setState({ status: "success", message: data?.message || "Your comment is now on this post." });
        router.refresh();
      }
    } catch {
      setState({ status: "error", message: "The comment could not be saved. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="post-comment-form">
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
