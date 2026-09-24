import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireDb } from "@/db";
import { mediaAssets, postMedia, posts } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentUpdatePostSchema, uuidParam } from "@/lib/agent/agent-schemas";
import { extractHackClubMediaUrls } from "@/lib/markdown";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

async function relinkPostMedia(postId: string, body: string) {
  const db = requireDb();
  await db.delete(postMedia).where(eq(postMedia.postId, postId));
  const urls = [...new Set(extractHackClubMediaUrls(body))];
  if (!urls.length) return;
  const assets = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(inArray(mediaAssets.url, urls));
  if (assets.length) {
    await db
      .insert(postMedia)
      .values(assets.map((asset) => ({ postId, mediaId: asset.id })))
      .onConflictDoNothing();
  }
}

type RouteContext = { params: Promise<{ id: string }> };

async function findPost(id: string) {
  const [row] = await requireDb().select().from(posts).where(eq(posts.id, id)).limit(1);
  return row;
}

/** GET /api/agent/v1/posts/[id] */
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
    const post = await findPost(id);
    if (!post) return agentJson({ error: "Post not found." }, { status: 404 });
    const media = await requireDb()
      .select({ mediaId: postMedia.mediaId })
      .from(postMedia)
      .where(eq(postMedia.postId, id));
    return agentJson({ post: { ...post, mediaIds: media.map((row) => row.mediaId) } });
  } catch (error) {
    console.error("[agent/v1/posts] fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The post could not be loaded." }, { status: 500 });
  }
}

/**
 * PATCH /api/agent/v1/posts/[id]
 * Partial update. Pass `version` for optimistic concurrency; a stale version
 * returns 409 with the server's current version.
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
  const parsed = agentUpdatePostSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  const { version, ...fields } = parsed.data;
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if ((key === "coverMediaId" || key === "thumbnailMediaId") && value === "") {
      set[key] = null;
    } else {
      set[key] = value;
    }
  }
  if (fields.status === "published") {
    set.publishedAt = fields.publishedAt ? new Date(fields.publishedAt) : new Date();
  } else if (fields.status === "draft") {
    set.publishedAt = null;
  }
  try {
    const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!existing) return agentJson({ error: "Post not found." }, { status: 404 });
    if (version !== undefined && existing.version !== version) {
      return agentJson(
        {
          error: "This post changed on the server. Fetch it again and retry with the current version.",
          serverVersion: existing.version,
          serverUpdatedAt: existing.updatedAt.toISOString(),
          serverStatus: existing.status,
        },
        { status: 409 },
      );
    }
    set.version = sql`${posts.version} + 1`;
    const [updated] = await db
      .update(posts)
      .set(set)
      .where(version !== undefined ? and(eq(posts.id, id), eq(posts.version, version)) : eq(posts.id, id))
      .returning();
    if (!updated) {
      return agentJson({ error: "This post changed on the server. Fetch it again and retry." }, { status: 409 });
    }
    if (fields.body !== undefined) await relinkPostMedia(id, fields.body);
    if (existing.status === "published" || updated.status === "published") revalidateTag("posts", { expire: 0 });
    return agentJson({ post: updated });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("posts_slug_unique")
      ? "That slug is already in use."
      : "The post could not be updated.";
    return agentJson({ error: message }, { status: message.startsWith("That slug") ? 409 : 500 });
  }
}

/** DELETE /api/agent/v1/posts/[id] */
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
    const [deleted] = await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id, status: posts.status });
    if (!deleted) return agentJson({ error: "Post not found." }, { status: 404 });
    if (deleted.status === "published") revalidateTag("posts", { expire: 0 });
    return agentJson({ deleted: true, id: deleted.id });
  } catch (error) {
    console.error("[agent/v1/posts] delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The post could not be deleted." }, { status: 500 });
  }
}
