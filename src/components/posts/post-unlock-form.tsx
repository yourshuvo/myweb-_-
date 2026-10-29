"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PostUnlockForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${postId}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "That password is incorrect.");
        return;
      }
      router.refresh();
    } catch {
      setError("The password could not be checked. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="post-unlock-form" onSubmit={handleSubmit}>
      <p>This update is password protected. Enter its password to read it.</p>
      <label>
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="form-message is-error">
          {error}
        </p>
      )}
      <button className="retro-button" type="submit" disabled={pending}>
        {pending ? "Checking..." : "Unlock update"}
      </button>
    </form>
  );
}
