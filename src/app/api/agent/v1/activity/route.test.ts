import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  getDb: () => ({}),
  requireDb: vi.fn(() => ({})),
}));

vi.mock("@/lib/data", () => ({
  getAdminPosts: async () => [
    { id: "p1", title: "Older post", status: "published", updatedAt: "2026-09-20T10:00:00.000Z" },
  ],
  getAdminMedia: async () => [
    { id: "m1", filename: "photo.png", createdAt: "2026-09-21T10:00:00.000Z" },
  ],
  getAdminAlbums: async () => [],
  getAdminMovieRecommendations: async () => [],
}));

vi.mock("@/lib/guestbook-data", () => ({
  getAdminGuestbookEntries: async () => [],
}));

vi.mock("@/lib/anonymous-messages", () => ({
  getAdminAnonymousMessages: async () => [],
}));

const { GET } = await import("@/app/api/agent/v1/activity/route");

function activityRequest(query = "", key?: string) {
  const headers: Record<string, string> = {};
  if (key !== undefined) headers.authorization = `Bearer ${key}`;
  return new Request(`http://localhost/api/agent/v1/activity${query}`, { headers });
}

describe("GET /api/agent/v1/activity", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "agent-test-key");
    vi.stubEnv("DATABASE_URL", "postgres://example/db");
  });

  it("returns 401 without a key", async () => {
    const response = await GET(activityRequest());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns items newest-first for a valid key", async () => {
    const response = await GET(activityRequest("?limit=10", "agent-test-key"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activity).toHaveLength(2);
    expect(body.activity[0]).toMatchObject({ type: "media", id: "m1", label: "photo.png" });
    expect(body.activity[1]).toMatchObject({ type: "post", id: "p1", label: "Older post", detail: "published post" });
  });

  it("respects the limit parameter", async () => {
    const response = await GET(activityRequest("?limit=1", "agent-test-key"));
    expect(response.status).toBe(200);
    expect((await response.json()).activity).toHaveLength(1);
  });

  it("returns 400 for an invalid limit", async () => {
    const response = await GET(activityRequest("?limit=0", "agent-test-key"));
    expect(response.status).toBe(400);
  });

  it("returns 503 when the database is not configured", async () => {
    const { requireDb } = await import("@/db");
    vi.mocked(requireDb).mockImplementationOnce(() => {
      throw new Error("DATABASE_URL is not configured.");
    });
    const response = await GET(activityRequest("", "agent-test-key"));
    expect(response.status).toBe(503);
  });
});
