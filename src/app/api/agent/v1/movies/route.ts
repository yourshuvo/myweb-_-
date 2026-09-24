import { desc, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { requireDb } from "@/db";
import { movieRecommendations } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentCreateMovieSchema, draftPublishedParam, paginationSchema, parseStatusParam } from "@/lib/agent/agent-schemas";
import { getTmdbMovie, TmdbRequestError } from "@/lib/tmdb";
import type { TmdbMovieDetails } from "@/lib/tmdb-model";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

let manualTmdbSentinel = -1;

/** Manual entries have no TMDB id; the column is unique+not-null, so mint a negative sentinel. */
function nextManualTmdbId() {
  manualTmdbSentinel -= 1;
  return manualTmdbSentinel - Date.now();
}

type MovieValues = typeof movieRecommendations.$inferInsert;

function valuesFromTmdb(tmdb: TmdbMovieDetails, personalNote: string, watchedAt: string, status: "draft" | "published", now: Date): MovieValues {
  return {
    tmdbId: tmdb.id,
    title: tmdb.title,
    originalTitle: tmdb.originalTitle,
    overview: tmdb.overview,
    posterPath: tmdb.posterPath,
    backdropPath: tmdb.backdropPath,
    releaseDate: tmdb.releaseDate,
    runtimeMinutes: tmdb.runtimeMinutes,
    genres: tmdb.genres,
    personalNote,
    watchedAt: watchedAt || null,
    status,
    publishedAt: status === "published" ? now : null,
    updatedAt: now,
  };
}

/**
 * GET /api/agent/v1/movies?status=draft|published&limit=20&offset=0
 * List movie recommendations, newest first.
 */
export async function GET(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  const params = new URL(request.url).searchParams;
  const pagination = paginationSchema.safeParse({ limit: params.get("limit"), offset: params.get("offset") });
  if (!pagination.success) return agentJson({ error: firstValidationError(pagination.error) }, { status: 400 });
  const statusResult = parseStatusParam(draftPublishedParam, params.get("status"), 'status must be "draft" or "published".');
  if (!statusResult.ok) return statusResult.response;
  const status = statusResult.value;
  try {
    const rows = await db
      .select()
      .from(movieRecommendations)
      .where(status ? eq(movieRecommendations.status, status) : undefined)
      .orderBy(desc(movieRecommendations.updatedAt))
      .limit(pagination.data.limit)
      .offset(pagination.data.offset);
    return agentJson({ movies: rows });
  } catch (error) {
    console.error("[agent/v1/movies] list failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The recommendations could not be listed." }, { status: 500 });
  }
}

/**
 * POST /api/agent/v1/movies
 * Create a recommendation. Either `{ tmdbId, personalNote?, watchedAt?, status? }`
 * (details fetched from TMDB — requires TMDB_API_KEY) or a full manual payload.
 */
export async function POST(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return agentJson({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = agentCreateMovieSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  const now = new Date();
  let values: MovieValues;
  if ("title" in parsed.data) {
    const data = parsed.data;
    values = {
      tmdbId: data.tmdbId ?? nextManualTmdbId(),
      title: data.title,
      originalTitle: data.originalTitle,
      overview: data.overview,
      posterPath: data.posterPath || null,
      backdropPath: data.backdropPath || null,
      releaseDate: data.releaseDate || null,
      runtimeMinutes: data.runtimeMinutes ?? null,
      genres: data.genres,
      personalNote: data.personalNote,
      watchedAt: data.watchedAt || null,
      status: data.status,
      publishedAt: data.status === "published" ? now : null,
      updatedAt: now,
    };
  } else {
    let tmdb: TmdbMovieDetails;
    try {
      tmdb = await getTmdbMovie(parsed.data.tmdbId);
    } catch (error) {
      return agentJson(
        { error: error instanceof TmdbRequestError ? error.message : "The movie details could not be loaded from TMDB." },
        { status: 502 },
      );
    }
    values = valuesFromTmdb(tmdb, parsed.data.personalNote, parsed.data.watchedAt, parsed.data.status, now);
  }
  try {
    const [created] = await db.insert(movieRecommendations).values(values).returning();
    if (!created) return agentJson({ error: "The recommendation could not be created." }, { status: 500 });
    if (created.status === "published") updateTag("movies");
    return agentJson({ movie: created }, { status: 201 });
  } catch (error) {
    const duplicate = error instanceof Error && error.message.includes("movie_recommendations_tmdb_id_unique");
    return agentJson(
      { error: duplicate ? "That movie is already in your recommendation library." : "The recommendation could not be created." },
      { status: duplicate ? 409 : 500 },
    );
  }
}
