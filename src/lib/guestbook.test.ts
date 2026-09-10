import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { guestbookRateLimits } from "@/db/schema";
import { formatVisitorCount, guestbookDateTime } from "@/lib/guestbook-format";
import {
  acceptsTurnstileResult,
  createVisitorCookie,
  GUESTBOOK_ACTION,
  hashVisitorId,
  verifyVisitorCookie,
} from "@/lib/guestbook-security";
import { guestbookSchema } from "@/lib/validation";

const cookieSecret = "a".repeat(32);
const visitorId = "8eb72560-9b57-4e54-9127-7a429eb7fe16";

describe("guestbook validation", () => {
  it("normalizes an omitted name while keeping the message plain text", () => {
    const parsed = guestbookSchema.parse({
      displayName: "   ",
      message: "  Hello from the small web.  ",
      company: "",
      turnstileToken: "token",
    });

    expect(parsed.displayName).toBe("");
    expect(parsed.message).toBe("Hello from the small web.");
  });

  it("rejects messages longer than 500 characters and filled honeypots", () => {
    expect(guestbookSchema.safeParse({ displayName: "A", message: "x".repeat(501), company: "", turnstileToken: "token" }).success).toBe(false);
    expect(guestbookSchema.safeParse({ displayName: "A", message: "Hello", company: "bot", turnstileToken: "token" }).success).toBe(false);
  });

  it("is escaped by the React text renderer instead of becoming HTML", () => {
    const html = renderToStaticMarkup(createElement("p", null, '<script>alert("x")</script>'));
    expect(html).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>");
  });
});

describe("visitor cookies", () => {
  it("round-trips a signed visitor identifier", () => {
    const cookie = createVisitorCookie(cookieSecret, visitorId);
    expect(verifyVisitorCookie(cookie, cookieSecret)).toBe(visitorId);
    expect(hashVisitorId(visitorId, cookieSecret)).toHaveLength(64);
  });

  it("rejects tampering and signatures created with another secret", () => {
    const cookie = createVisitorCookie(cookieSecret, visitorId);
    expect(verifyVisitorCookie(`${cookie}x`, cookieSecret)).toBeNull();
    expect(verifyVisitorCookie(cookie, "b".repeat(32))).toBeNull();
  });

  it("stores only a keyed visitor hash for rate limiting", () => {
    expect(Object.keys(getTableColumns(guestbookRateLimits))).toEqual([
      "visitorHash",
      "windowStartedAt",
      "submissionCount",
      "updatedAt",
    ]);
  });
});

describe("Turnstile response contract", () => {
  it("accepts only successful responses for the exact action and hostname", () => {
    expect(acceptsTurnstileResult({ success: true, action: GUESTBOOK_ACTION, hostname: "example.com" }, "example.com")).toBe(true);
    expect(acceptsTurnstileResult({ success: false, action: GUESTBOOK_ACTION, hostname: "example.com" }, "example.com")).toBe(false);
    expect(acceptsTurnstileResult({ success: true, action: "login", hostname: "example.com" }, "example.com")).toBe(false);
    expect(acceptsTurnstileResult({ success: true, action: GUESTBOOK_ACTION, hostname: "attacker.example" }, "example.com")).toBe(false);
  });
});

describe("visitor counter formatting", () => {
  it("uses a minimum of six digits", () => {
    expect(formatVisitorCount(0)).toBe("000000");
    expect(formatVisitorCount(123)).toBe("000123");
    expect(formatVisitorCount(1_234_567)).toBe("1234567");
    expect(formatVisitorCount(null)).toBe("------");
  });

  it("keeps guestbook timestamps stable after cache serialization", () => {
    const iso = "2026-07-15T12:34:56.000Z";
    expect(guestbookDateTime(new Date(iso))).toBe(iso);
    expect(guestbookDateTime(iso)).toBe(iso);
  });
});
