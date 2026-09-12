import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const VISITOR_COOKIE_NAME = "retro_visitor";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signature(visitorId: string, secret: string) {
  return createHmac("sha256", secret).update(visitorId).digest("base64url");
}

export function createVisitorCookie(secret: string, visitorId = randomUUID()) {
  return `${visitorId}.${signature(visitorId, secret)}`;
}

export function verifyVisitorCookie(value: string | undefined, secret: string) {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const visitorId = value.slice(0, separator);
  const received = value.slice(separator + 1);
  if (!uuidPattern.test(visitorId)) return null;
  const expected = signature(visitorId, secret);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) return null;
  return visitorId;
}

export function hashVisitorId(visitorId: string, secret: string) {
  return createHmac("sha256", secret).update(`rate-limit:${visitorId}`).digest("hex");
}
