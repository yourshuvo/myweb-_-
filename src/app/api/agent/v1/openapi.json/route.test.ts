import { beforeEach, describe, expect, it, vi } from "vitest";

const { GET } = await import("@/app/api/agent/v1/openapi.json/route");

function openApiRequest(key?: string) {
  const headers: Record<string, string> = {};
  if (key !== undefined) headers.authorization = `Bearer ${key}`;
  return new Request("http://localhost/api/agent/v1/openapi.json", { headers });
}

describe("GET /api/agent/v1/openapi.json", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "agent-test-key");
  });

  it("returns 401 without a key", async () => {
    const response = await GET(openApiRequest());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the OpenAPI document for a valid key", async () => {
    const response = await GET(openApiRequest("agent-test-key"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json();
    expect(body.openapi).toBe("3.1.0");
    expect(body.info.version).toBe("v1");
    expect(body.components.securitySchemes.bearerAuth).toBeDefined();
    expect(body.components.securitySchemes.agentKeyHeader).toBeDefined();
  });

  it("documents every agent route", async () => {
    const response = await GET(openApiRequest("agent-test-key"));
    const body = await response.json();
    const paths = Object.keys(body.paths);
    for (const path of [
      "/api/agent/v1/status",
      "/api/agent/v1/activity",
      "/api/agent/v1/openapi.json",
      "/api/agent/v1/posts",
      "/api/agent/v1/posts/{id}",
      "/api/agent/v1/posts/{id}/duplicate",
      "/api/agent/v1/albums",
      "/api/agent/v1/albums/{id}",
      "/api/agent/v1/media",
      "/api/agent/v1/media/{id}",
      "/api/agent/v1/guestbook",
      "/api/agent/v1/guestbook/{id}",
      "/api/agent/v1/messages",
      "/api/agent/v1/messages/{id}",
      "/api/agent/v1/messages/{id}/story",
      "/api/agent/v1/movies",
      "/api/agent/v1/movies/search",
      "/api/agent/v1/movies/{id}",
      "/api/agent/v1/profile",
    ]) {
      expect(paths, path).toContain(path);
    }
  });
});
