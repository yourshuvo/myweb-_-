import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { postMedia, posts } from "@/db/schema";
import { agentJson, denyUnlessAgent } from "@/lib/agent/auth";
import { uuidParam } from "@/lib/agent/agent-schemas";
import { nextCopySlug } from "@/lib/admin-post";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/agent/v1/posts/[id]/duplicate
 * Duplicate a post as a new draft — mirrors the admin "duplicate" action:
 * uniquified slug, "Copy of" title, copied cover/thumbnail, and copied
 * media references, all in one transaction.
 */
export async function POST(request: Request, context: RouteContext) {
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
    const [source] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!source) return agentJson({ error: "Post not found." }, { status: 404 });
    const existingSlugs = await db.select({ slug: posts.slug }).from(posts);
    const slug = nextCopySlug(
      source.slug,
      existingSlugs.map((row) => row.slug),
    );
    const title = `Copy of ${source.title}`.slice(0, 180);
    const [copy] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(posts)
        .values({
          title,
          slug,
          excerpt: source.excerpt,
          body: source.body,
          status: "draft",
          coverMediaId: source.coverMediaId,
          thumbnailMediaId: source.thumbnailMediaId,
          authorId: "agent-api",
          publishedAt: null,
        })
        .returning();
      if (!created) throw new Error("The duplicate could not be created.");
      const references = await tx
        .select({ mediaId: postMedia.mediaId })
        .from(postMedia)
        .where(eq(postMedia.postId, source.id));
      if (references.length) {
        await tx
          .insert(postMedia)
          .values(references.map((reference) => ({ postId: created.id, mediaId: reference.mediaId })))
          .onConflictDoNothing();
      }
      return [created];
    });
    if (!copy) return agentJson({ error: "The duplicate could not be created." }, { status: 500 });
    return agentJson({ post: copy }, { status: 201 });
  } catch (error) {
    console.error("[agent/v1/posts] duplicate failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The post could not be duplicated." }, { status: 500 });
  }
}
