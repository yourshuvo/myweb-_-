import "server-only";

import { getServerEnv, siteUrl } from "@/lib/env";
import {
  acceptsTurnstileResult,
  ANONYMOUS_MESSAGE_ACTION,
  GUESTBOOK_ACTION,
  type TurnstileResult,
} from "@/lib/guestbook-security";

const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string, expectedAction: string) {
  const secret = getServerEnv("TURNSTILE_SECRET_KEY");
  if (!secret) return false;

  try {
    const response = await fetch(siteverifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, idempotency_key: crypto.randomUUID() }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as TurnstileResult;
    return acceptsTurnstileResult(result, new URL(siteUrl()).hostname, expectedAction);
  } catch {
    return false;
  }
}

export function verifyGuestbookTurnstile(token: string) {
  return verifyTurnstile(token, GUESTBOOK_ACTION);
}

export function verifyAnonymousMessageTurnstile(token: string) {
  return verifyTurnstile(token, ANONYMOUS_MESSAGE_ACTION);
}

export { ANONYMOUS_MESSAGE_ACTION, GUESTBOOK_ACTION };
