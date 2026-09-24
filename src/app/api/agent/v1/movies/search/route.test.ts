import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tmdb", () => ({
  searchTmdbMovies: vi.fn(),
  TmdbRequestError: class TmdbRequestError extends Error {
    readonly status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = "TmdbRequestError";
      this.status = status;
    }
  },
}));

const { GET } = await import("@/app/api/agent/v1/movies/search/route");

describe("agent tmdb search auth gate", () => {
  beforeEach(() => {
    vi.stubEnv("AGENT_API_KEY", "agent-test-key");
    vi.stubEnv("TMDB_API_KEY", "");
  });

  it("returns 401 without a key and never touches TMDB", async () => {
    const response = await GET(new Request("http://localhost/api/agent/v1/movies/search?q=dune"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 with a wrong key", async () => {
    const response = await GET(
      new Request("http://localhost/api/agent/v1/movies/search?q=dune", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 503 with a valid key when TMDB is not configured", async () => {
    const response = await GET(
      new Request("http://localhost/api/agent/v1/movies/search?q=dune", {
        headers: { authorization: "Bearer agent-test-key" },
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "TMDB is not configured." });
  });

  it("returns 400 with a valid key when the query is too short", async () => {
    vi.stubEnv("TMDB_API_KEY", "tmdb-test-key");
    const response = await GET(
      new Request("http://localhost/api/agent/v1/movies/search?q=x", {
        headers: { authorization: "Bearer agent-test-key" },
      }),
    );
    expect(response.status).toBe(400);
  });
});
