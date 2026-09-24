import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  getDb: () => null,
  requireDb: () => {
    throw new Error("DATABASE_URL is not configured.");
  },
}));

const { GET } = await import("@/app/api/agent/v1/status/route");

function statusRequest(key?: string, header: "authorization" | "x-agent-key" = "authorization") {
  const headers: Record<string, string> = {};
  if (key !== undefined) headers[header] = header === "authorization" ? `Bearer ${key}` : key;
  return new Request("http://localhost/api/agent/v1/status", { headers });
}

describe("GET /api/agent/v1/status", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "agent-test-key");
    vi.stubEnv("DATABASE_URL", "");
  });

  it("returns 401 without a key", async () => {
    const response = await GET(statusRequest());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 with a wrong key", async () => {
    const response = await GET(statusRequest("wrong-key"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns 200 with the status snapshot for a valid bearer key", async () => {
    const response = await GET(statusRequest("agent-test-key"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, version: "v1", dbConfigured: false, counts: null, visitorTotal: null });
    expect(typeof body.time).toBe("string");
  });

  it("accepts the X-Agent-Key header", async () => {
    const response = await GET(statusRequest("agent-test-key", "x-agent-key"));
    expect(response.status).toBe(200);
  });

  it("returns 401 for every request when AGENT_API_KEY is unset", async () => {
    vi.stubEnv("AGENT_API_KEY", "");
    const response = await GET(statusRequest("agent-test-key"));
    expect(response.status).toBe(401);
  });
});
