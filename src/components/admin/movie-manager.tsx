"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMovieRecommendationAction, saveMovieRecommendationAction, type MovieMutationState } from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { movieReleaseYear, tmdbImageUrl, type TmdbMovieSummary } from "@/lib/tmdb-model";

export type AdminMovieItem = {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  personalNote: string;
  watchedAt: string | null;
  status: "draft" | "published";
  updatedAt: string;
};

const idleState: MovieMutationState = { status: "idle", message: "" };

function MovieDeleteButton({ movie }: { movie: AdminMovieItem }) {
  const router = useRouter();
  const [state, setState] = useState<MovieMutationState>(idleState);
  const [pending, startTransition] = useTransition();

  function deleteMovie() {
    const formData = new FormData();
    formData.set("id", movie.id);
    startTransition(async () => {
      const result = await deleteMovieRecommendationAction(idleState, formData);
      setState(result);
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><button className="is-danger" type="button">Delete</button></AlertDialogTrigger>
      <AlertDialogContent className="retro-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{movie.title}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>This permanently removes your recommendation. It does not change anything on TMDB.</AlertDialogDescription>
        </AlertDialogHeader>
        {state.status === "error" && <p className="form-message is-error" role="alert">{state.message}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel className="retro-button" disabled={pending}>Cancel</AlertDialogCancel>
          <button className="danger-button" type="button" disabled={pending} onClick={deleteMovie}>{pending ? "Deleting..." : "Delete permanently"}</button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MovieManager({ configured, initialMovies }: { configured: boolean; initialMovies: AdminMovieItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovieSummary[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbMovieSummary | null>(null);
  const [recommendationId, setRecommendationId] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [watchedAt, setWatchedAt] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saveState, setSaveState] = useState<MovieMutationState>(idleState);
  const [saving, startSaving] = useTransition();

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setSearchMessage("");
    try {
      const response = await fetch(`/api/admin/movies/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = await response.json() as { results?: TmdbMovieSummary[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "The search could not be completed.");
      const nextResults = payload.results || [];
      setResults(nextResults);
      setSearchMessage(nextResults.length ? `${nextResults.length} matches from TMDB.` : "No matching movies were found.");
    } catch (error) {
      setResults([]);
      setSearchMessage(error instanceof Error ? error.message : "The search could not be completed.");
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(movie: TmdbMovieSummary) {
    setSelected(movie);
    setRecommendationId("");
    setPersonalNote("");
    setWatchedAt("");
    setStatus("draft");
    setSaveState(idleState);
  }

  function editMovie(movie: AdminMovieItem) {
    setSelected({
      id: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      overview: movie.overview,
      posterPath: movie.posterPath,
      releaseDate: movie.releaseDate,
    });
    setRecommendationId(movie.id);
    setPersonalNote(movie.personalNote);
    setWatchedAt(movie.watchedAt || "");
    setStatus(movie.status);
    setSaveState(idleState);
    document.getElementById("movie-recommendation-editor")?.scrollIntoView({ block: "start" });
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSaving(async () => {
      const result = await saveMovieRecommendationAction(idleState, formData);
      setSaveState(result);
      if (result.status === "success") {
        if (result.recommendationId) setRecommendationId(result.recommendationId);
        router.refresh();
      }
    });
  }

  return (
    <div className="movie-admin-layout">
      <section className="admin-panel movie-search-panel">
        <div className="admin-panel__title">Find a movie on TMDB</div>
        {!configured && <div className="service-warning" role="alert"><strong>TMDB needs setup.</strong><p>Add the server-only <code>TMDB_API_KEY</code> environment variable before searching.</p></div>}
        <form className="movie-search-form" onSubmit={search}>
          <label htmlFor="movie-search">Movie title</label>
          <div><input id="movie-search" type="search" minLength={2} maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Example: Perfect Days" disabled={!configured} required /><button className="retro-button" type="submit" disabled={!configured || searching}>{searching ? "Searching..." : "Search TMDB"}</button></div>
        </form>
        {searchMessage && <p className="admin-result-count" role="status">{searchMessage}</p>}
        {results.length > 0 && <div className="tmdb-result-list" aria-label="TMDB search results">{results.map((movie) => {
          const poster = tmdbImageUrl(movie.posterPath, "w92");
          return <button type="button" key={movie.id} onClick={() => chooseResult(movie)} aria-pressed={selected?.id === movie.id && !recommendationId}><span className="tmdb-result-poster">{poster ? <Image src={poster} alt="" width={46} height={69} /> : <span>No poster</span>}</span><span><strong>{movie.title}</strong><small>{movieReleaseYear(movie.releaseDate)} · TMDB #{movie.id}</small><em>{movie.overview || "No synopsis available."}</em></span></button>;
        })}</div>}
      </section>

      <section className="admin-panel movie-editor-panel" id="movie-recommendation-editor">
        <div className="admin-panel__title">{recommendationId ? "Edit recommendation" : "New recommendation"}</div>
        {selected ? <form className="movie-editor-form" onSubmit={save}>
          <input type="hidden" name="id" value={recommendationId} />
          <input type="hidden" name="tmdbId" value={selected.id} />
          <div className="movie-editor-summary">
            <span className="movie-editor-poster">{tmdbImageUrl(selected.posterPath, "w185") ? <Image src={tmdbImageUrl(selected.posterPath, "w185")!} alt={`${selected.title} poster`} width={92} height={138} /> : <span>No poster</span>}</span>
            <div><strong>{selected.title}</strong><span>{movieReleaseYear(selected.releaseDate)} · TMDB #{selected.id}</span><p>{selected.overview || "No synopsis is available from TMDB."}</p></div>
          </div>
          <label><span>Why I recommend it</span><textarea name="personalNote" maxLength={1500} rows={7} value={personalNote} onChange={(event) => setPersonalNote(event.target.value)} required={status === "published"} placeholder="Write in your own voice: what stayed with you, who may enjoy it, or why it is worth watching." /><small>{personalNote.length} / 1,500 characters</small></label>
          <div className="movie-editor-fields">
            <label><span>Watched on (optional)</span><input name="watchedAt" type="date" value={watchedAt} onChange={(event) => setWatchedAt(event.target.value)} /></label>
            <label><span>Visibility</span><select name="status" value={status} onChange={(event) => setStatus(event.target.value as "draft" | "published")}><option value="draft">Draft</option><option value="published">Published</option></select></label>
          </div>
          {saveState.message && <p className={`form-message ${saveState.status === "error" ? "is-error" : "is-success"}`} role={saveState.status === "error" ? "alert" : "status"}>{saveState.message}</p>}
          <div className="movie-editor-actions"><button className="retro-button" type="submit" disabled={saving}>{saving ? "Saving..." : status === "published" ? "Publish recommendation" : "Save draft"}</button><button type="button" onClick={() => { setSelected(null); setRecommendationId(""); setSaveState(idleState); }}>Clear editor</button></div>
        </form> : <div className="dashboard-empty"><strong>No movie selected</strong><p>Search TMDB above or choose Edit from your recommendation library.</p></div>}
      </section>

      <section className="admin-panel movie-library-panel">
        <div className="admin-panel__title">Recommendation library · {initialMovies.length}</div>
        {initialMovies.length ? <div className="admin-table movie-admin-table">
          <div className="admin-table__head"><span>Movie</span><span>Status</span><span>Watched</span><span>Actions</span></div>
          {initialMovies.map((movie) => <div className="admin-table__row" key={movie.id}><div><strong>{movie.title}</strong><small>{movieReleaseYear(movie.releaseDate)} · TMDB #{movie.tmdbId}</small></div><span className={`status-badge is-${movie.status}`}>{movie.status}</span><span>{movie.watchedAt || "Not set"}</span><div className="post-actions"><button type="button" onClick={() => editMovie(movie)}>Edit</button><MovieDeleteButton movie={movie} /></div></div>)}
        </div> : <div className="dashboard-empty"><strong>No movie recommendations yet</strong><p>Search TMDB, add your personal note, then save a draft or publish it.</p></div>}
      </section>
    </div>
  );
}
