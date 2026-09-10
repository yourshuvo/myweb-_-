import type { Metadata } from "next";
import { MovieLibrary, type MovieLibraryItem } from "@/components/movies/movie-library";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile, getPublishedMovieRecommendations } from "@/lib/data";

export const metadata: Metadata = {
  title: "Movie suggestions",
  description: "Movies I watched, liked, and personally recommend.",
  alternates: { canonical: "/movies" },
  openGraph: { title: "Movie suggestions", description: "Movies I watched, liked, and personally recommend.", url: "/movies" },
};

export default async function MoviesPage() {
  const [profile, recommendations] = await Promise.all([getPublicProfile(), getPublishedMovieRecommendations()]);
  const movies: MovieLibraryItem[] = recommendations.map((movie) => ({
    id: movie.id,
    tmdbId: movie.tmdbId,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.posterPath,
    releaseDate: movie.releaseDate,
    runtimeMinutes: movie.runtimeMinutes,
    genres: movie.genres,
    personalNote: movie.personalNote,
    watchedAt: movie.watchedAt,
    publishedAt: movie.publishedAt?.toISOString() || null,
  }));

  return (
    <PageShell profile={profile} title="Movie Suggestions - Windows Explorer">
      <header className="page-heading"><p className="eyebrow">VIDEO LIBRARY</p><h1>Movies I liked</h1><p>Personal picks from things I have watched, with a note about why I think each one is worth your time.</p></header>
      <MovieLibrary movies={movies} />
    </PageShell>
  );
}
