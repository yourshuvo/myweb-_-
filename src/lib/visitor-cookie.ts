import "server-only";

import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import {
  createVisitorCookie,
  hashVisitorId,
  verifyVisitorCookie,
  VISITOR_COOKIE_MAX_AGE,
  VISITOR_COOKIE_NAME,
} from "@/lib/guestbook-security";

export async function getOrCreateVisitorIdentity() {
  const secret = getServerEnv("GUESTBOOK_COOKIE_SECRET");
  if (!secret || secret.length < 32) throw new Error("Guestbook cookie security is not configured.");

  const cookieStore = await cookies();
  const currentValue = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  const currentId = verifyVisitorCookie(currentValue, secret);
  if (currentId) {
    return { visitorHash: hashVisitorId(currentId, secret), isNew: false };
  }

  const value = createVisitorCookie(secret);
  const visitorId = verifyVisitorCookie(value, secret);
  if (!visitorId) throw new Error("Could not create the visitor cookie.");

  cookieStore.set(VISITOR_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
    priority: "low",
  });

  return { visitorHash: hashVisitorId(visitorId, secret), isNew: true };
}
