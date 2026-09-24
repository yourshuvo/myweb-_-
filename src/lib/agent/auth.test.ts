import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentJson, denyUnlessAgent, isAgentAuthorized } from "@/lib/agent/auth";

function requestWith(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/agent/v1/status", { headers });
}

describe("agent API key auth", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "secret-key-123");
  });

  it("rejects requests with no credential", () => {
    expect(isAgentAuthorized(requestWith())).toBe(false);
  });

  it("rejects a wrong bearer token in constant time", () => {
    expect(isAgentAuthorized(requestWith({ authorization: "Bearer wrong-key-1234" }))).toBe(false);
  });

  it("rejects a wrong X-Agent-Key header", () => {
    expect(isAgentAuthorized(requestWith({ "x-agent-key": "nope" }))).toBe(false);
  });

  it("accepts a correct bearer token", () => {
    expect(isAgentAuthorized(requestWith({ authorization: "Bearer secret-key-123" }))).toBe(true);
  });

  it("accepts the X-Agent-Key header", () => {
    expect(isAgentAuthorized(requestWith({ "x-agent-key": "secret-key-123" }))).toBe(true);
  });

  it("accepts a case-insensitive Bearer scheme", () => {
    expect(isAgentAuthorized(requestWith({ authorization: "bearer secret-key-123" }))).toBe(true);
  });

  it("rejects a non-bearer authorization scheme", () => {
    expect(isAgentAuthorized(requestWith({ authorization: "Basic secret-key-123" }))).toBe(false);
  });

  it("is disabled when AGENT_API_KEY is not configured", () => {
    vi.stubEnv("AGENT_API_KEY", "");
    expect(isAgentAuthorized(requestWith({ authorization: "Bearer secret-key-123" }))).toBe(false);
  });

  it("denyUnlessAgent returns a 401 JSON response when unauthorized", async () => {
    const denied = denyUnlessAgent(requestWith());
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
    expect(await denied!.json()).toEqual({ error: "Unauthorized" });
  });

  it("denyUnlessAgent returns null when authorized", () => {
    expect(denyUnlessAgent(requestWith({ authorization: "Bearer secret-key-123" }))).toBeNull();
  });

  it("agentJson sets private no-store cache headers", () => {
    const response = agentJson({ ok: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
