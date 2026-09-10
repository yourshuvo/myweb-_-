import type { Metadata } from "next";
import { MovieManager, type AdminMovieItem } from "@/components/admin/movie-manager";
import { getAdminMovieRecommendations } from "@/lib/data";
import { hasTmdbConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Manage movie suggestions", robots: { index: false, follow: false } };

export default async function AdminMoviesPage() {
  const movies = await getAdminMovieRecommendations();
  const initialMovies: AdminMovieItem[] = movies.map((movie) => ({
    id: movie.id,
    tmdbId: movie.tmdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    overview: movie.overview,
    posterPath: movie.posterPath,
    releaseDate: movie.releaseDate,
    runtimeMinutes: movie.runtimeMinutes,
    genres: movie.genres,
    personalNote: movie.personalNote,
    watchedAt: movie.watchedAt,
    status: movie.status,
    updatedAt: movie.updatedAt.toISOString(),
  }));

  return (
    <div className="admin-page admin-page--wide">
      <header className="admin-heading"><p className="eyebrow">MOVIE CATALOG</p><h1>Movie suggestions</h1><p>Find a movie on TMDB, explain why you liked it, and publish the recommendation when it is ready.</p></header>
      <MovieManager configured={hasTmdbConfig()} initialMovies={initialMovies} />
    </div>
  );
}
