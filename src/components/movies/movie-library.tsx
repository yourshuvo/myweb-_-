"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { W98Icon } from "@/components/desktop/w98-icon";
import { movieReleaseYear, tmdbImageUrl } from "@/lib/tmdb-model";

export type MovieLibraryItem = {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  personalNote: string;
  watchedAt: string | null;
  publishedAt: string | null;
};

function formatCalendarDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function MovieLibrary({ movies }: { movies: MovieLibraryItem[] }) {
  const genres = useMemo(() => [...new Set(movies.flatMap((movie) => movie.genres))].sort((a, b) => a.localeCompare(b)), [movies]);
  const [genre, setGenre] = useState("all");
  const [selectedId, setSelectedId] = useState(movies[0]?.id || "");
  const visibleMovies = genre === "all" ? movies : movies.filter((movie) => movie.genres.includes(genre));
  const selected = visibleMovies.find((movie) => movie.id === selectedId) || visibleMovies[0] || null;

  function pickMovie() {
    if (!visibleMovies.length) return;
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const choices = visibleMovies.length > 1 ? visibleMovies.filter((movie) => movie.id !== selected?.id) : visibleMovies;
    setSelectedId(choices[values[0] % choices.length].id);
  }

  if (!movies.length) {
    return <section className="movie-library" aria-label="Movie suggestions"><div className="large-empty"><W98Icon icon="media-player" size={32} /><h2>No movie suggestions yet</h2><p>The owner is still preparing the first recommendation. Check back after movie night.</p></div><p className="tmdb-attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section>;
  }

  return (
    <section className="movie-library" aria-label="Movie suggestions">
      <div className="movie-library-toolbar">
        <label><span>Genre:</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">All genres ({movies.length})</option>{genres.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <button className="retro-button" type="button" onClick={pickMovie} disabled={!visibleMovies.length}><W98Icon icon="media-player" size={16} /> Pick one for me</button>
      </div>
      {selected ? <div className="movie-library-workspace">
        <div className="movie-file-list" aria-label="Recommended movies">
          <div className="movie-file-list__head"><span>Name</span><span>Year</span><span>Length</span></div>
          {visibleMovies.map((movie) => <button type="button" key={movie.id} aria-pressed={selected.id === movie.id} onClick={() => setSelectedId(movie.id)}><span><W98Icon icon="media-player" size={16} /><strong>{movie.title}</strong></span><span>{movieReleaseYear(movie.releaseDate)}</span><span>{movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : "—"}</span></button>)}
        </div>
        <article className="movie-preview" aria-live="polite">
          <div className="movie-preview__poster">{tmdbImageUrl(selected.posterPath, "w500") ? <Image src={tmdbImageUrl(selected.posterPath, "w500")!} alt={`${selected.title} poster`} width={500} height={750} priority /> : <div><W98Icon icon="media-player" size={32} /><span>No poster available</span></div>}</div>
          <div className="movie-preview__copy">
            <p className="eyebrow">MY MOVIE SUGGESTION</p>
            <h2>{selected.title}</h2>
            <div className="movie-preview__facts"><span>{movieReleaseYear(selected.releaseDate)}</span>{selected.runtimeMinutes && <span>{selected.runtimeMinutes} minutes</span>}{selected.genres.map((item) => <span key={item}>{item}</span>)}</div>
            <section className="movie-personal-note"><h3>Why I recommend it</h3><p>{selected.personalNote}</p>{formatCalendarDate(selected.watchedAt) && <small>Watched {formatCalendarDate(selected.watchedAt)}</small>}</section>
            <section className="movie-synopsis"><h3>About the movie</h3><p>{selected.overview || "No synopsis is available from TMDB."}</p></section>
            <a className="retro-button movie-tmdb-link" href={`https://www.themoviedb.org/movie/${selected.tmdbId}`} target="_blank" rel="noreferrer">View on TMDB</a>
          </div>
        </article>
      </div> : <div className="large-empty"><h2>No movies in this genre</h2><p>Choose another genre to see a recommendation.</p></div>}
      <p className="tmdb-attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </section>
  );
}
