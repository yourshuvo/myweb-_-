import { describe, expect, it } from "vitest";
import { createTmdbRequest, movieReleaseYear, normalizeTmdbDetails, normalizeTmdbSummary, tmdbImageUrl } from "@/lib/tmdb-model";

describe("TMDB movie model", () => {
  it("keeps a v3 API key in the server request URL", () => {
    const request = createTmdbRequest("search/movie", { query: "Perfect Days" }, "abc123");
    expect(request.url.origin + request.url.pathname).toBe("https://api.themoviedb.org/3/search/movie");
    expect(request.url.searchParams.get("query")).toBe("Perfect Days");
    expect(request.url.searchParams.get("api_key")).toBe("abc123");
    expect(request.headers.has("authorization")).toBe(false);
  });

  it("uses a bearer header for an API Read Access Token", () => {
    const token = "eyJ.header.payload";
    const request = createTmdbRequest("movie/123", { language: "en-US" }, token);
    expect(request.headers.get("authorization")).toBe(`Bearer ${token}`);
    expect(request.url.searchParams.has("api_key")).toBe(false);
  });

  it("normalizes safe search and detail fields", () => {
    expect(normalizeTmdbSummary({ id: 12, title: "Film", original_title: "Film", overview: "Story", poster_path: "/poster.jpg", release_date: "2024-01-02" })).toEqual({
      id: 12,
      title: "Film",
      originalTitle: "Film",
      overview: "Story",
      posterPath: "/poster.jpg",
      releaseDate: "2024-01-02",
    });
    expect(normalizeTmdbDetails({ id: 12, title: "Film", genres: [{ name: "Drama" }, { name: "Drama" }], runtime: 124, backdrop_path: "/backdrop.jpg" })).toMatchObject({
      id: 12,
      genres: ["Drama"],
      runtimeMinutes: 124,
      backdropPath: "/backdrop.jpg",
    });
  });

  it("rejects unsafe image paths and formats release years", () => {
    expect(tmdbImageUrl("/poster.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/poster.jpg");
    expect(tmdbImageUrl("https://example.com/poster.jpg")).toBeNull();
    expect(tmdbImageUrl("/nested/poster.jpg")).toBeNull();
    expect(movieReleaseYear("1998-06-19")).toBe("1998");
    expect(movieReleaseYear(null)).toBe("Date unknown");
  });
});
