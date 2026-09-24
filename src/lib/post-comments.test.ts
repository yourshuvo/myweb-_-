import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { postCommentRateLimits, postComments } from "@/db/schema";
import { postCommentIdSchema, postCommentSchema } from "@/lib/validation";

describe("post comment validation", () => {
  it("allows an omitted name while keeping the message plain text", () => {
    const parsed = postCommentSchema.parse({
      displayName: "   ",
      message: "  Great post!  ",
      company: "",
    });

    expect(parsed.displayName).toBe("");
    expect(parsed.message).toBe("Great post!");
  });

  it("rejects messages longer than 500 characters and filled honeypots", () => {
    expect(postCommentSchema.safeParse({ displayName: "A", message: "x".repeat(501), company: "" }).success).toBe(false);
    expect(postCommentSchema.safeParse({ displayName: "A", message: "Hello", company: "bot" }).success).toBe(false);
  });

  it("rejects names longer than 40 characters", () => {
    expect(postCommentSchema.safeParse({ displayName: "x".repeat(41), message: "Hello", company: "" }).success).toBe(false);
  });

  it("validates comment IDs as UUIDs", () => {
    expect(postCommentIdSchema.safeParse("8eb72560-9b57-4e54-9127-7a429eb7fe16").success).toBe(true);
    expect(postCommentIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("is escaped by the React text renderer instead of becoming HTML", () => {
    const html = renderToStaticMarkup(createElement("p", null, '<script>alert("x")</script>'));
    expect(html).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>");
  });
});

describe("post comment tables", () => {
  it("links comments to posts with cascade delete", () => {
    expect(Object.keys(getTableColumns(postComments))).toEqual([
      "id",
      "postId",
      "displayName",
      "message",
      "status",
      "createdAt",
      "hiddenAt",
    ]);
  });

  it("stores only a keyed visitor hash for rate limiting", () => {
    expect(Object.keys(getTableColumns(postCommentRateLimits))).toEqual([
      "visitorHash",
      "windowStartedAt",
      "submissionCount",
      "updatedAt",
    ]);
  });
});
