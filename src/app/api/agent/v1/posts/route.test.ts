import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  getDb: () => null,
  requireDb: () => {
    throw new Error("DATABASE_URL is not configured.");
  },
}));

const { GET, POST } = await import("@/app/api/agent/v1/posts/route");

describe("agent posts auth gate", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "agent-test-key");
  });

  it("returns 401 for GET without a key and never touches the database", async () => {
    const response = await GET(new Request("http://localhost/api/agent/v1/posts"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for POST without a key", async () => {
    const response = await POST(
      new Request("http://localhost/api/agent/v1/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "x", slug: "x", status: "draft" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 for POST with a wrong key", async () => {
    const response = await POST(
      new Request("http://localhost/api/agent/v1/posts", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer wrong" },
        body: JSON.stringify({ title: "x", slug: "x", status: "draft" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 503 with a valid key when the database is not configured", async () => {
    const response = await POST(
      new Request("http://localhost/api/agent/v1/posts", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer agent-test-key" },
        body: JSON.stringify({ title: "Hello", slug: "hello", status: "draft" }),
      }),
    );
    expect(response.status).toBe(503);
  });
});
