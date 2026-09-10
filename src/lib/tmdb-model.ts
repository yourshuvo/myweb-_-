export type TmdbMovieSummary = {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
};

export type TmdbMovieDetails = TmdbMovieSummary & {
  backdropPath: string | null;
  runtimeMinutes: number | null;
  genres: string[];
};

export type TmdbImageSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";

const imagePathPattern = /^\/[A-Za-z0-9._-]+$/;

export function tmdbImageUrl(path: string | null, size: TmdbImageSize = "w500") {
  if (!path || !imagePathPattern.test(path)) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function movieReleaseYear(releaseDate: string | null) {
  return releaseDate?.match(/^(\d{4})-/)?.[1] || "Date unknown";
}

export function createTmdbRequest(path: string, params: Record<string, string>, credential: string) {
  const url = new URL(`https://api.themoviedb.org/3/${path.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const headers = new Headers({ accept: "application/json" });
  const looksLikeReadToken = credential.startsWith("eyJ") || credential.split(".").length === 3;
  if (looksLikeReadToken) headers.set("authorization", `Bearer ${credential}`);
  else url.searchParams.set("api_key", credential);
  return { url, headers };
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanImagePath(value: unknown) {
  return typeof value === "string" && imagePathPattern.test(value) ? value : null;
}

function cleanDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function normalizeTmdbSummary(value: unknown): TmdbMovieSummary | null {
  if (!value || typeof value !== "object") return null;
  const movie = value as Record<string, unknown>;
  if (!Number.isInteger(movie.id) || Number(movie.id) < 1 || !cleanText(movie.title)) return null;
  return {
    id: Number(movie.id),
    title: cleanText(movie.title),
    originalTitle: cleanText(movie.original_title),
    overview: cleanText(movie.overview),
    posterPath: cleanImagePath(movie.poster_path),
    releaseDate: cleanDate(movie.release_date),
  };
}

export function normalizeTmdbDetails(value: unknown): TmdbMovieDetails | null {
  const summary = normalizeTmdbSummary(value);
  if (!summary || !value || typeof value !== "object") return null;
  const movie = value as Record<string, unknown>;
  const genres = Array.isArray(movie.genres)
    ? movie.genres
        .map((genre) => genre && typeof genre === "object" ? cleanText((genre as Record<string, unknown>).name) : "")
        .filter(Boolean)
    : [];
  const runtime = Number(movie.runtime);
  return {
    ...summary,
    backdropPath: cleanImagePath(movie.backdrop_path),
    runtimeMinutes: Number.isInteger(runtime) && runtime > 0 ? runtime : null,
    genres: [...new Set(genres)].slice(0, 12),
  };
}
