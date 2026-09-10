import "server-only";

import { getServerEnv } from "@/lib/env";
import { createTmdbRequest, normalizeTmdbDetails, normalizeTmdbSummary, type TmdbMovieDetails, type TmdbMovieSummary } from "@/lib/tmdb-model";

export class TmdbRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "TmdbRequestError";
  }
}

async function requestTmdb(path: string, params: Record<string, string>) {
  const credential = getServerEnv("TMDB_API_KEY");
  if (!credential) throw new TmdbRequestError("TMDB is not configured.");
  const { url, headers } = createTmdbRequest(path, params, credential);
  let response: Response;
  try {
    response = await fetch(url, { headers, cache: "no-store" });
  } catch {
    throw new TmdbRequestError("TMDB could not be reached. Try again in a moment.");
  }
  if (response.status === 401) throw new TmdbRequestError("The TMDB credential was rejected.", 401);
  if (!response.ok) throw new TmdbRequestError("TMDB could not complete the request.", response.status);
  return response.json().catch(() => {
    throw new TmdbRequestError("TMDB returned an unreadable response.");
  });
}

export async function searchTmdbMovies(query: string): Promise<TmdbMovieSummary[]> {
  const payload = await requestTmdb("search/movie", {
    query,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { results?: unknown }).results)) return [];
  return (payload as { results: unknown[] }).results.map(normalizeTmdbSummary).filter((movie): movie is TmdbMovieSummary => Boolean(movie)).slice(0, 12);
}

export async function getTmdbMovie(tmdbId: number): Promise<TmdbMovieDetails> {
  const payload = await requestTmdb(`movie/${tmdbId}`, { language: "en-US" });
  const movie = normalizeTmdbDetails(payload);
  if (!movie) throw new TmdbRequestError("TMDB returned incomplete movie details.");
  return movie;
}
