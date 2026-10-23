import { describe, expect, it } from "vitest";
import { agentCreatePostSchema, agentUpdatePostSchema } from "@/lib/agent/agent-schemas";

const basePost = {
  title: "Test",
  slug: "test",
  excerpt: "",
  body: "",
  status: "draft" as const,
  coverMediaId: "",
  thumbnailMediaId: "",
  publishedAt: "",
};

describe("agent post password field", () => {
  it("accepts an optional password when creating a post", () => {
    expect(agentCreatePostSchema.safeParse(basePost).success).toBe(true);
    expect(agentCreatePostSchema.safeParse({ ...basePost, password: "abcd" }).success).toBe(true);
    expect(agentCreatePostSchema.safeParse({ ...basePost, password: null }).success).toBe(true);
    expect(agentCreatePostSchema.safeParse({ ...basePost, password: "abc" }).success).toBe(false);
  });

  it("accepts a password or null (clear) when updating a post", () => {
    expect(agentUpdatePostSchema.safeParse({}).success).toBe(true);
    expect(agentUpdatePostSchema.safeParse({ password: "new-password" }).success).toBe(true);
    expect(agentUpdatePostSchema.safeParse({ password: null }).success).toBe(true);
    expect(agentUpdatePostSchema.safeParse({ password: "abc" }).success).toBe(false);
  });
});
