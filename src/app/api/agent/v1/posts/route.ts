import { desc, eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";
import { requireDb } from "@/db";
import { mediaAssets, postMedia, posts } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentCreatePostSchema, draftPublishedParam, paginationSchema, parseStatusParam } from "@/lib/agent/agent-schemas";
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

/**
 * GET /api/agent/v1/posts?status=draft|published&limit=20&offset=0
 * List posts, newest first.
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
      .from(posts)
      .where(status ? eq(posts.status, status) : undefined)
      .orderBy(desc(posts.updatedAt))
      .limit(pagination.data.limit)
      .offset(pagination.data.offset);
    return agentJson({ posts: rows });
  } catch (error) {
    console.error("[agent/v1/posts] list failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The posts could not be listed." }, { status: 500 });
  }
}

/**
 * POST /api/agent/v1/posts
 * Create a post. publishedAt defaults to now when status is "published".
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
  const parsed = agentCreatePostSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  const data = parsed.data;
  const now = new Date();
  const publishedAt = data.status === "published" ? (data.publishedAt ? new Date(data.publishedAt) : now) : null;
  try {
    const [created] = await db
      .insert(posts)
      .values({
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        body: data.body,
        status: data.status,
        coverMediaId: data.coverMediaId || null,
        thumbnailMediaId: data.thumbnailMediaId || null,
        authorId: "agent-api",
        publishedAt,
        updatedAt: now,
      })
      .returning();
    if (!created) return agentJson({ error: "The post could not be created." }, { status: 500 });
    await relinkPostMedia(created.id, data.body);
    if (created.status === "published") updateTag("posts");
    return agentJson({ post: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("posts_slug_unique")
      ? "That slug is already in use."
      : "The post could not be created.";
    return agentJson({ error: message }, { status: message.startsWith("That slug") ? 409 : 500 });
  }
}
