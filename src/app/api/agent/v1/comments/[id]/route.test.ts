import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  getDb: () => null,
  requireDb: () => {
    throw new Error("DATABASE_URL is not configured.");
  },
}));

const { PATCH, DELETE } = await import("@/app/api/agent/v1/comments/[id]/route");

const commentId = "8eb72560-9b57-4e54-9127-7a429eb7fe16";
const url = `http://localhost/api/agent/v1/comments/${commentId}`;
const context = { params: Promise.resolve({ id: commentId }) } as never;
const authHeaders = { "content-type": "application/json", authorization: "Bearer agent-test-key" };

describe("agent comment moderation auth gate", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "agent-test-key");
  });

  it("returns 401 for PATCH without a key", async () => {
    const response = await PATCH(
      new Request(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "hidden" }) }),
      context,
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for DELETE without a key", async () => {
    const response = await DELETE(new Request(url, { method: "DELETE" }), context);
    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid comment ID", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/agent/v1/comments/nope", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: "hidden" }),
      }),
      { params: Promise.resolve({ id: "nope" }) } as never,
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for an invalid status", async () => {
    const response = await PATCH(
      new Request(url, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ status: "deleted" }) }),
      context,
    );
    expect(response.status).toBe(400);
  });

  it("returns 503 with a valid key when the database is not configured", async () => {
    const response = await PATCH(
      new Request(url, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ status: "hidden" }) }),
      context,
    );
    expect(response.status).toBe(503);
  });
});
