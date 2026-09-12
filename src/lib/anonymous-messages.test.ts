import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { anonymousMessageRateLimits, anonymousMessages } from "@/db/schema";
import { anonymousMessageTransition } from "@/lib/anonymous-message-model";
import { anonymousStoryFilename, STORY_IMAGE_HEIGHT, STORY_IMAGE_WIDTH, storyFontSizeForLength } from "@/lib/story-image";
import { anonymousMessageSchema } from "@/lib/validation";

describe("anonymous message validation", () => {
  it("keeps only trimmed plain text", () => {
    const parsed = anonymousMessageSchema.parse({ message: "  hello privately  ", company: "" });
    expect(parsed.message).toBe("hello privately");
    expect(renderToStaticMarkup(createElement("p", null, "<b>not html</b>"))).toBe("<p>&lt;b&gt;not html&lt;/b&gt;</p>");
  });

  it("rejects empty, oversized, and honeypot submissions", () => {
    expect(anonymousMessageSchema.safeParse({ message: "", company: "" }).success).toBe(false);
    expect(anonymousMessageSchema.safeParse({ message: "x".repeat(501), company: "" }).success).toBe(false);
    expect(anonymousMessageSchema.safeParse({ message: "hello", company: "bot" }).success).toBe(false);
  });
});

describe("anonymous persistence contract", () => {
  it("stores no sender identity or raw IP in the message table", () => {
    expect(Object.keys(getTableColumns(anonymousMessages))).toEqual(["id", "message", "status", "createdAt", "readAt", "archivedAt"]);
  });

  it("uses a separate keyed rate-limit table", () => {
    expect(Object.keys(getTableColumns(anonymousMessageRateLimits))).toEqual(["visitorHash", "windowStartedAt", "submissionCount", "updatedAt"]);
  });

  it("produces the intended protected status transitions", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    expect(anonymousMessageTransition("read", now)).toEqual({ status: "read", readAt: now, archivedAt: null });
    expect(anonymousMessageTransition("unread", now)).toEqual({ status: "unread", readAt: null, archivedAt: null });
    expect(anonymousMessageTransition("archive", now)).toEqual({ status: "archived", readAt: now, archivedAt: now });
    expect(anonymousMessageTransition("restore", now)).toEqual({ status: "read", readAt: now, archivedAt: null });
  });
});

describe("Instagram Story model", () => {
  it("uses exact 9:16 output dimensions and adaptive readable type", () => {
    expect([STORY_IMAGE_WIDTH, STORY_IMAGE_HEIGHT]).toEqual([1080, 1920]);
    expect(storyFontSizeForLength(80)).toBeGreaterThan(storyFontSizeForLength(200));
    expect(storyFontSizeForLength(200)).toBeGreaterThan(storyFontSizeForLength(500));
  });

  it("creates an opaque filename without including message text", () => {
    expect(anonymousStoryFilename("8eb72560-9b57-4e54-9127-7a429eb7fe16")).toBe("anonymous-message-8eb72560.png");
  });
});
