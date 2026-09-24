import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  getDb: () => null,
  requireDb: () => {
    throw new Error("DATABASE_URL is not configured.");
  },
}));

const { GET, POST } = await import("@/app/api/agent/v1/posts/[id]/comments/route");

const postId = "8eb72560-9b57-4e54-9127-7a429eb7fe16";
const url = `http://localhost/api/agent/v1/posts/${postId}/comments`;
const context = { params: Promise.resolve({ id: postId }) } as never;

describe("agent post comments auth gate", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "agent-test-key");
  });

  it("returns 401 for GET without a key and never touches the database", async () => {
    const response = await GET(new Request(url), context);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for POST without a key", async () => {
    const response = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Nice post" }),
      }),
      context,
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 for POST with a wrong key", async () => {
    const response = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer wrong-key" },
        body: JSON.stringify({ message: "Nice post" }),
      }),
      context,
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid post ID", async () => {
    const response = await GET(
      new Request("http://localhost/api/agent/v1/posts/not-a-uuid/comments", {
        headers: { authorization: "Bearer agent-test-key" },
      }),
      { params: Promise.resolve({ id: "not-a-uuid" }) } as never,
    );
    expect(response.status).toBe(400);
  });

  it("returns 503 with a valid key when the database is not configured", async () => {
    const response = await GET(new Request(`${url}?limit=20&offset=0`, { headers: { authorization: "Bearer agent-test-key" } }), context);
    expect(response.status).toBe(503);
  });

  it("returns 400 for POST with an empty message", async () => {
    const response = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer agent-test-key" },
        body: JSON.stringify({ message: "   " }),
      }),
      context,
    );
    expect(response.status).toBe(400);
  });
});
