import { describe, expect, it } from "vitest";
import {
  POST_UNLOCK_COOKIE_MAX_AGE_SECONDS,
  createPostUnlockToken,
  hashPostPassword,
  postUnlockCookieName,
  verifyPostPassword,
  verifyPostUnlockToken,
} from "@/lib/post-password";

const postId = "8eb72560-9b57-4e54-9127-7a429eb7fe16";

describe("post password hashing", () => {
  it("roundtrips a correct password and rejects a wrong one", () => {
    const hash = hashPostPassword("correct horse");
    expect(hash).toMatch(/^scrypt\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    expect(hash).not.toContain("correct horse");
    expect(verifyPostPassword("correct horse", hash)).toBe(true);
    expect(verifyPostPassword("wrong password", hash)).toBe(false);
  });

  it("uses a random salt so the same password hashes differently", () => {
    expect(hashPostPassword("same password")).not.toBe(hashPostPassword("same password"));
  });

  it("rejects missing or malformed hashes", () => {
    expect(verifyPostPassword("anything", null)).toBe(false);
    expect(verifyPostPassword("anything", undefined)).toBe(false);
    expect(verifyPostPassword("anything", "not-a-hash")).toBe(false);
    expect(verifyPostPassword("anything", "scrypt$bad$bad")).toBe(false);
  });
});

describe("post unlock tokens", () => {
  it("names cookies per post with a 30-day max age", () => {
    expect(postUnlockCookieName(postId)).toBe(`post_unlock_${postId}`);
    expect(POST_UNLOCK_COOKIE_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it("verifies a token issued for the current hash", () => {
    const hash = hashPostPassword("secret-one");
    const token = createPostUnlockToken(postId, hash);
    expect(verifyPostUnlockToken(token, postId, hash)).toBe(true);
  });

  it("rejects tokens for another post, a missing token, or a missing hash", () => {
    const hash = hashPostPassword("secret-one");
    const token = createPostUnlockToken(postId, hash);
    expect(verifyPostUnlockToken(token, "9eb72560-9b57-4e54-9127-7a429eb7fe16", hash)).toBe(false);
    expect(verifyPostUnlockToken(undefined, postId, hash)).toBe(false);
    expect(verifyPostUnlockToken(token, postId, null)).toBe(false);
    expect(verifyPostUnlockToken("bogus-token-value-that-is-long-enough", postId, hash)).toBe(false);
  });

  it("invalidates old tokens after the password changes", () => {
    const oldHash = hashPostPassword("old password");
    const newHash = hashPostPassword("new password");
    const oldToken = createPostUnlockToken(postId, oldHash);
    expect(verifyPostUnlockToken(oldToken, postId, newHash)).toBe(false);
    expect(verifyPostUnlockToken(createPostUnlockToken(postId, newHash), postId, newHash)).toBe(true);
  });
});
