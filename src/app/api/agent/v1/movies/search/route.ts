import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { hasTmdbConfig } from "@/lib/env";
import { searchTmdbMovies, TmdbRequestError } from "@/lib/tmdb";
import { tmdbSearchSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * GET /api/agent/v1/movies/search?q=title
 * Search TMDB for movies — the same search the admin dashboard uses when
 * adding a recommendation. Returns up to 12 matches.
 */
export async function GET(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  if (!hasTmdbConfig()) {
    return agentJson({ error: "TMDB is not configured." }, { status: 503 });
  }
  const query = new URL(request.url).searchParams.get("q") || "";
  const parsed = tmdbSearchSchema.safeParse({ query });
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  try {
    const results = await searchTmdbMovies(parsed.data.query);
    return agentJson({ results });
  } catch (error) {
    const message = error instanceof TmdbRequestError ? error.message : "The movie search could not be completed.";
    const status = error instanceof TmdbRequestError && error.status === 401 ? 503 : 502;
    return agentJson({ error: message }, { status });
  }
}
