import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  getDb: () => null,
  requireDb: () => {
    throw new Error("DATABASE_URL is not configured.");
  },
}));

const { POST } = await import("@/app/api/agent/v1/posts/[id]/duplicate/route");

const duplicateContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe("agent post duplicate auth gate", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "agent-test-key");
  });

  it("returns 401 without a key and never touches the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/agent/v1/posts/123/duplicate", { method: "POST" }),
      duplicateContext("123"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 with a wrong key", async () => {
    const response = await POST(
      new Request("http://localhost/api/agent/v1/posts/123/duplicate", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
      }),
      duplicateContext("123"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 503 with a valid key when the database is not configured", async () => {
    const response = await POST(
      new Request("http://localhost/api/agent/v1/posts/123/duplicate", {
        method: "POST",
        headers: { authorization: "Bearer agent-test-key" },
      }),
      duplicateContext("123"),
    );
    expect(response.status).toBe(503);
  });
});
