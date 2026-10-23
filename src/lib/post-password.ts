import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const POST_UNLOCK_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export function hashPostPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export function verifyPostPassword(password: string, passwordHash: string | null | undefined): boolean {
  if (!passwordHash) return false;
  const parts = passwordHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "base64url");
    const expected = Buffer.from(parts[2], "base64url");
    if (!salt.length || expected.length !== KEY_LENGTH) return false;
    const actual = scryptSync(password, salt, KEY_LENGTH);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function postUnlockCookieName(postId: string): string {
  return `post_unlock_${postId}`;
}

export function createPostUnlockToken(postId: string, passwordHash: string): string {
  return createHmac("sha256", passwordHash).update(postId).digest("base64url");
}

export function verifyPostUnlockToken(
  token: string | null | undefined,
  postId: string,
  passwordHash: string | null | undefined,
): boolean {
  if (!token || !passwordHash) return false;
  const expected = createPostUnlockToken(postId, passwordHash);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(token);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
