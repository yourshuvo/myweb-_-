import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { requireDb } from "@/db";
import { movieRecommendations } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentUpdateMovieSchema, uuidParam } from "@/lib/agent/agent-schemas";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/agent/v1/movies/[id] */
export async function GET(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  try {
    requireDb();
  } catch {
    return dbUnavailable();
  }
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid ID." }, { status: 400 });
  try {
    const [movie] = await requireDb().select().from(movieRecommendations).where(eq(movieRecommendations.id, id)).limit(1);
    if (!movie) return agentJson({ error: "Recommendation not found." }, { status: 404 });
    return agentJson({ movie });
  } catch (error) {
    console.error("[agent/v1/movies] fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The recommendation could not be loaded." }, { status: 500 });
  }
}

/**
 * PATCH /api/agent/v1/movies/[id]
 * Update agent-managed fields: personalNote, watchedAt ("" clears), status, title, overview.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid ID." }, { status: 400 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return agentJson({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = agentUpdateMovieSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  try {
    const [existing] = await db
      .select({ status: movieRecommendations.status, publishedAt: movieRecommendations.publishedAt })
      .from(movieRecommendations)
      .where(eq(movieRecommendations.id, id))
      .limit(1);
    if (!existing) return agentJson({ error: "Recommendation not found." }, { status: 404 });

    const now = new Date();
    const set: Record<string, unknown> = { updatedAt: now };
    const data = parsed.data;
    if (data.personalNote !== undefined) set.personalNote = data.personalNote;
    if (data.watchedAt !== undefined) set.watchedAt = data.watchedAt || null;
    if (data.title !== undefined) set.title = data.title;
    if (data.overview !== undefined) set.overview = data.overview;
    if (data.status !== undefined) {
      set.status = data.status;
      set.publishedAt = data.status === "published" ? existing.publishedAt || now : null;
    }
    const [updated] = await db.update(movieRecommendations).set(set).where(eq(movieRecommendations.id, id)).returning();
    if (!updated) return agentJson({ error: "The recommendation could not be updated." }, { status: 500 });
    if (existing.status === "published" || updated.status === "published") updateTag("movies");
    return agentJson({ movie: updated });
  } catch (error) {
    console.error("[agent/v1/movies] update failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The recommendation could not be updated." }, { status: 500 });
  }
}

/** DELETE /api/agent/v1/movies/[id] */
export async function DELETE(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid ID." }, { status: 400 });
  try {
    const [deleted] = await db
      .delete(movieRecommendations)
      .where(eq(movieRecommendations.id, id))
      .returning({ id: movieRecommendations.id, status: movieRecommendations.status });
    if (!deleted) return agentJson({ error: "Recommendation not found." }, { status: 404 });
    if (deleted.status === "published") updateTag("movies");
    return agentJson({ deleted: true, id: deleted.id });
  } catch (error) {
    console.error("[agent/v1/movies] delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The recommendation could not be deleted." }, { status: 500 });
  }
}
